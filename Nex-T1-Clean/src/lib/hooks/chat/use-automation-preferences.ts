import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_AUTOMATION_STATE,
  normalizeAutomationState,
  type AutomationState,
  type AutonomousActionKey,
} from "@/modules/chat/automation-preferences";
import { asJsonObject, getJsonObject } from "@/lib/json";
import { logger } from "@/lib/logger";
import type { JsonObject } from "@/types/json";

const SETTINGS_ENDPOINT = "/api/approvals/settings";

type UseAutomationPreferencesArgs = {
  /**
   * Whether the current viewer is authenticated. When false, the hook resets to defaults.
   */
  isAuthenticated: boolean;
  /**
   * If authentication status is still being determined, fetching is deferred until this clears.
   */
  isAuthChecking?: boolean;
  /**
   * Optional callback that fires whenever the automation state changes (after normalization).
   */
  onChange?: (state: AutomationState) => void;
  /**
   * Called when an authenticated-only action is attempted without authentication.
   */
  onRequireAuth?: () => void;
  /**
   * Allows callers to seed the hook with a pre-fetched snapshot to avoid duplicate network round trips.
   */
  initialState?: Partial<JsonObject>;
};

type UseAutomationPreferencesReturn = {
  state: AutomationState;
  loading: boolean;
  saving: boolean;
  savingKey: AutonomousActionKey | null;
  error: string | null;
  refresh: () => Promise<void>;
  update: (key: AutonomousActionKey, value: boolean) => Promise<void>;
};

type PendingUpdate = {
  key: AutonomousActionKey;
  value: boolean;
};

export function useAutomationPreferences({
  isAuthenticated,
  isAuthChecking = false,
  onChange,
  onRequireAuth,
  initialState,
}: UseAutomationPreferencesArgs): UseAutomationPreferencesReturn {
  const [state, setState] = useState<AutomationState>(() =>
    normalizeAutomationState(initialState),
  );
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<AutonomousActionKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchedRef = useRef(false);
  const stateRef = useRef(state);
  const pendingUpdateRef = useRef<PendingUpdate | null>(null);
  const fetchFailCountRef = useRef(0);

  const MAX_FETCH_RETRIES = 2;

  const normalizePayloadState = useCallback((payload: unknown) => {
    const record = asJsonObject(payload);
    if (!record) {
      return undefined;
    }

    return (
      getJsonObject(record, "autonomousActions") ??
      getJsonObject(getJsonObject(record, "settings"), "autonomousActions") ??
      undefined
    );
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (typeof onChange === "function") {
      onChange(state);
    }
  }, [onChange, state]);

  const fetchPreferences = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    if (fetchFailCountRef.current >= MAX_FETCH_RETRIES) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(SETTINGS_ENDPOINT);

      if (response.status === 401) {
        fetchedRef.current = true;
        fetchFailCountRef.current = 0;
        onRequireAuth?.();
        setState({ ...DEFAULT_AUTOMATION_STATE });
        return;
      }

      if (response.status >= 500) {
        fetchFailCountRef.current += 1;
        logger.warn(
          `[automation-preferences] Server error ${response.status} fetching settings (attempt ${fetchFailCountRef.current}/${MAX_FETCH_RETRIES}); using defaults`,
        );
        fetchedRef.current = true;
        setState({ ...DEFAULT_AUTOMATION_STATE });
        return;
      }

      if (!response.ok) {
        fetchFailCountRef.current += 1;
        throw new Error(response.statusText || "Failed to load automation preferences");
      }

      const payload = await response.json().catch(() => ({}));
      const normalized = normalizeAutomationState(normalizePayloadState(payload));

      fetchedRef.current = true;
      fetchFailCountRef.current = 0;
      setState(normalized);
      setError(null);
    } catch (err) {
      fetchedRef.current = false;
      const message =
        err instanceof Error ? err.message : "Failed to load automation preferences";
      setError(message);
      return;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, normalizePayloadState, onRequireAuth]);

  useEffect(() => {
    if (!isAuthenticated) {
      fetchedRef.current = false;
      fetchFailCountRef.current = 0;
      setState({ ...DEFAULT_AUTOMATION_STATE });
      setError(null);
      return;
    }

    if (isAuthChecking || fetchedRef.current || loading) {
      return;
    }

    void fetchPreferences().catch((err) => {
      // Error is already handled in state by fetchPreferences, but we log it to prevent unhandled rejection
      logger.error("Failed to fetch automation preferences:", err);
    });
  }, [fetchPreferences, isAuthenticated, isAuthChecking, loading]);

  const refresh = useCallback(async () => {
    fetchedRef.current = false;
    fetchFailCountRef.current = 0;
    await fetchPreferences();
  }, [fetchPreferences]);

  const queuePendingUpdate = useCallback(
    (update: PendingUpdate) => {
      pendingUpdateRef.current = update;
      setState((prev) => {
        if (prev[update.key] === update.value) {
          return prev;
        }
        return { ...prev, [update.key]: update.value };
      });
      setError(null);
    },
    [],
  );

  const update = useCallback(
    async (key: AutonomousActionKey, value: boolean) => {
      if (!isAuthenticated) {
        onRequireAuth?.();
        return;
      }

      if (loading || savingKey !== null) {
        queuePendingUpdate({ key, value });
        return;
      }

      const previous = stateRef.current;
      const next: AutomationState = { ...previous, [key]: value };

      setState(next);
      setSavingKey(key);
      setError(null);

      try {
        const response = await fetch(SETTINGS_ENDPOINT, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ autonomousActions: next }),
        });

        if (response.status === 401) {
          onRequireAuth?.();
          setState(previous);
          fetchedRef.current = false;
          throw new Error("Unauthorized");
        }

        if (!response.ok) {
          const message = (await response.text()) || "Failed to update automation preferences";
          throw new Error(message);
        }

        const payload = await response
          .json()
          .catch(() => ({ settings: { autonomousActions: next } }));

        const normalized = normalizeAutomationState(normalizePayloadState(payload) ?? next);

        fetchedRef.current = true;
        setState(normalized);
        setError(null);
      } catch (err) {
        setState(previous);
        const message =
          err instanceof Error ? err.message : "Failed to update automation preferences";
        setError(message);
        // Swallow to prevent console error spam; caller can read error state
        return;
      } finally {
        setSavingKey(null);
        const pending = pendingUpdateRef.current;
        if (pending) {
          pendingUpdateRef.current = null;
          // Trigger the queued update; ignore the returned promise so we don't create a loop.
          update(pending.key, pending.value).catch((err) => {
            logger.error("Failed to apply pending update:", err);
          });
        }
      }
    },
    [isAuthenticated, loading, normalizePayloadState, onRequireAuth, queuePendingUpdate, savingKey],
  );

  useEffect(() => {
    if (!loading && pendingUpdateRef.current && savingKey === null && isAuthenticated) {
      const pending = pendingUpdateRef.current;
      pendingUpdateRef.current = null;
      void update(pending.key, pending.value).catch((err) => {
        logger.error("Failed to apply pending update:", err);
      });
    }
  }, [isAuthenticated, loading, savingKey, update]);

  const saving = useMemo(() => savingKey !== null, [savingKey]);

  return {
    state,
    loading,
    saving,
    savingKey,
    error,
    refresh,
    update,
  };
}
