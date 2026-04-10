"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { syncBackendSessions as runBackendSessionSync } from "@/lib/auth/session-sync";


import { logger } from '@/lib/logger';
export { syncBackendSessions } from "@/lib/auth/session-sync";

type AuthStatus = "loading" | "authenticated" | "signed_out" | "unconfigured";

type AuthContextValue = {
  supabase: ReturnType<typeof getSupabaseBrowserClient>;
  session: Session | null;
  user: User | null;
  status: AuthStatus;
  isSyncing: boolean;
  serverSessionReady: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SupabaseAuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_QUERY_KEYS = ["auth-status", "organizations", "user-profile", "profile-aggregate"] as const;

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const supabaseConfigured = Boolean(supabase);
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    supabaseConfigured ? "loading" : "unconfigured",
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [serverSessionReady, setServerSessionReady] = useState(false);
  const initialisedRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const syncSequenceRef = useRef<Promise<void> | null>(null);
  const networkWarningLoggedRef = useRef(false);

  const applySessionState = useCallback(
    async (nextSession: Session | null) => {
      setSession(nextSession);

      if (!supabaseConfigured) {
        setUser(null);
        setStatus("unconfigured");
        return;
      }

      const accessToken = nextSession?.access_token ?? null;
      // Use the embedded user when present — the server already verified the JWT
      // at /api/auth/session, so a second getUser() round-trip is redundant.
      // Only call getUser() as a last resort when the session has no embedded user.
      let verifiedUser: User | null = nextSession?.user ?? null;

      if (nextSession && !verifiedUser) {
        try {
          const getUserPromise = supabase.auth.getUser(accessToken ?? undefined);
          const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((resolve) => {
            setTimeout(() => resolve({
              data: { user: null },
              error: new Error("getUser timeout")
            }), 5000);
          });

          const { data, error } = await Promise.race([getUserPromise, timeoutPromise]);
          if (!error && data?.user) {
            verifiedUser = data.user;
          } else if (process.env.NODE_ENV !== "production" && error) {
            logger.warn("supabase_get_user_failed", error);
          }
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            logger.warn("supabase_get_user_throw", error);
          }
        }
      }

      setUser(verifiedUser);

      // Ensure previous sync (if any) completes before starting a new one to preserve ordering.
      if (syncSequenceRef.current) {
        try {
          await syncSequenceRef.current;
        } catch {
          // noop – failures are reported where they occur.
        }
      }

      const runSync = async (accessToken: string | null) => {
        setIsSyncing(true);
        try {
          await runBackendSessionSync(accessToken);
        } finally {
          setIsSyncing(false);
        }
      };

      const beginSync = (accessToken: string | null) => {
        const task = runSync(accessToken).catch((error) => {
          if (process.env.NODE_ENV !== "production") {
            logger.warn("supabase_backend_sync_failed", error);
          }
        });
        syncSequenceRef.current = task.finally(() => {
          if (syncSequenceRef.current === task) {
            syncSequenceRef.current = null;
          }
        });
        return syncSequenceRef.current;
      };

      setStatus("loading");

      if (!nextSession || !verifiedUser) {
        await beginSync(null);
        setStatus("signed_out");
        return;
      }

      await beginSync(accessToken);
      setStatus("authenticated");
      setServerSessionReady(true);
    },
    [supabaseConfigured, supabase],
  );

  const fetchServerSession = useCallback(async (): Promise<Session | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      const response = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        return null;
      }
      // The /api/auth/session endpoint uses apiResponse.success() which returns:
      // { success: true, data: { session: ..., user: ... } }
      const payload = (await response.json().catch(() => null)) as { 
        success?: boolean; 
        data?: { session?: Session | null } 
      } | null;
      return payload?.data?.session ?? null;
    } catch {
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    try {
      try {
        // Server is the authority (cookie-bridged auth + SSR/middleware). Hydrate from it first.
        const serverSession = await fetchServerSession();
        if (serverSession) {
          await applySessionState(serverSession);
          return;
        }
      } catch {
        // noop
      }

      // Fallback: try the browser client session (useful during login flows where the client
      // has the freshest view before cookies settle).
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }; error: null }>((resolve) => {
          setTimeout(() => resolve({ data: { session: null }, error: null }), 8000);
        });

        const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);

        if (error) {
          if (isSupabaseNetworkError(error)) {
            if (process.env.NODE_ENV !== "production" && !networkWarningLoggedRef.current) {
              networkWarningLoggedRef.current = true;
              logger.info("supabase_session_refresh_skipped_due_to_network");
            }
          } else if (process.env.NODE_ENV !== "production") {
            logger.warn("supabase_session_refresh_failed", error);
          }
          await applySessionState(null);
          return;
        }

        await applySessionState(data.session ?? null);
      } catch {
        await applySessionState(null);
      }
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [supabase, applySessionState, fetchServerSession]);

  useEffect(() => {
    if (!supabase || initialisedRef.current) return;
    initialisedRef.current = true;

    let cancelled = false;

    const isDev = process.env.NODE_ENV !== "production";
    // SECURITY: Auth bypass and test mode are only available in non-production builds.
    // window.__TEST_MODE cannot be exploited in production to bypass authentication.
    const devAuthBypass = isDev && process.env.DEV_AUTH_BYPASS === "true";
    const isTestMode = isDev && (
      (typeof window !== "undefined" &&
        (window as Window & { __TEST_MODE?: boolean }).__TEST_MODE === true) ||
      process.env.NEXT_PUBLIC_TEST_MODE === "true" ||
      process.env.E2E_TEST_MODE === "true"
    );

    if (isTestMode || devAuthBypass) {
      const devUserId = process.env.NEXT_PUBLIC_DEV_AUTH_USER_ID || "00000000-0000-0000-0000-000000000000";
      const mockUser = {
        id: devUserId,
        email: "dev@example.com",
        aud: "authenticated",
        role: "authenticated",
        created_at: new Date().toISOString(),
        app_metadata: { provider: "email" },
        user_metadata: { full_name: "Dev User" },
      } as User;
      
      const mockSession = {
        access_token: "dev-mock-token",
        refresh_token: "dev-mock-refresh",
        expires_in: 3600,
        token_type: "bearer",
        user: mockUser,
      } as Session;

      setSession(mockSession);
      setUser(mockUser);
      setStatus("authenticated");
      return; 
    }

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, _nextSession: Session | null) => {
        if (cancelled) return;
        // Let refresh() be the single authoritative source of state updates
        await refresh();
        if (cancelled) return;
        AUTH_QUERY_KEYS.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        });
      },
    );

    // Kick off an explicit refresh in case the auth listener takes time to emit.
    refresh().catch(() => {
      // The refresh helper already logs in development; swallow here.
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [supabase, refresh, applySessionState, queryClient]);

  // Re-validate the session when the tab becomes visible again (30s debounce).
  useEffect(() => {
    if (typeof document === "undefined") return;
    let lastRefresh = 0;
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRefresh > 30_000) {
        lastRefresh = Date.now();
        refresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refresh]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok && process.env.NODE_ENV !== "production") {
        logger.warn("supabase_server_signout_failed", await response.text().catch(() => response.statusText));
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        logger.warn("supabase_server_signout_failed", error);
      }
    }

    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        logger.warn("supabase_client_signout_failed", error);
      }
    }

    AUTH_QUERY_KEYS.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    });
  }, [supabase, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      supabase,
      session,
      user,
      status,
      isSyncing,
      serverSessionReady,
      refresh,
      signOut,
    }),
    [supabase, session, user, status, isSyncing, serverSessionReady, refresh, signOut],
  );

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

function isSupabaseNetworkError(error: UntypedJson): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  if (error.name === "AuthRetryableFetchError") {
    return true;
  }
  const normalisedMessage = error.message.toLowerCase();
  return normalisedMessage.includes("failed to fetch") || normalisedMessage.includes("network_error");
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    if (process.env.NODE_ENV === "test") {
      return {
        supabase: getSupabaseBrowserClient(),
        session: null,
        user: null,
        status: "signed_out" as const,
        isSyncing: false,
        serverSessionReady: false,
        refresh: async () => {},
        signOut: async () => {},
      };
    }
    throw new Error("useSupabaseAuth must be used within a SupabaseAuthProvider");
  }
  return context;
}

export function useSupabaseStatus() {
  const { status, isSyncing } = useSupabaseAuth();
  const isDev = process.env.NODE_ENV !== "production";
  // SECURITY: Auth bypass only available in non-production builds
  const devAuthBypass = isDev && process.env.DEV_AUTH_BYPASS === "true";
  const testMode = isDev && (
    (typeof window !== "undefined" &&
      (window as Window & { __TEST_MODE?: boolean }).__TEST_MODE === true) ||
    process.env.NEXT_PUBLIC_TEST_MODE === "true" ||
    process.env.E2E_TEST_MODE === "true"
  );

  if ((testMode || devAuthBypass) && status !== "authenticated") {
    return { status: "authenticated" as const, isSyncing: false };
  }

  return { status, isSyncing };
}

export function SupabaseAuthBoundary({ children }: { children: ReactNode }) {
  const existingContext = useContext(SupabaseAuthContext);

  // If a provider is already mounted higher in the tree, reuse it to avoid
  // duplicate Supabase clients and auth listeners.
  if (existingContext) {
    return <>{children}</>;
  }

  // Fallback: wrap the subtree so hooks like useAuthContext don’t explode in
  // environments where the parent layout forgot to add the provider (e.g. in
  // isolated renders or tests).
  return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>;
}
