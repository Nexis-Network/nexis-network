"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useAuthStatus } from "@/hooks/user/use-auth-status";
import { useAutomationPreferences } from "@/hooks/chat/use-automation-preferences";
import { trackAgentEvent } from "@/modules/analytics/events";
import type {
  AutomationState,
  AutonomousActionKey,
} from "@/modules/chat/automation-preferences";
import {
  DEFAULT_CHAT_EXECUTION_PREFERENCES,
  type ChatExecutionPreferences,
} from "@/modules/chat/execution-preferences";

import { MODELS } from "@/components/chat-composer/constants";
import { useComposerDraftState } from "@/components/chat-composer/hooks/use-composer-draft-state";
import type {
  ChatComposerProps,
  ComposerDraftState,
} from "@/components/chat-composer/types";
import type { AuthView } from "@/components/chat-composer/auth-required-dialog";

type UseComposerUiStateArgs = Pick<
  ChatComposerProps,
  | "draftState"
  | "executionPreferences"
  | "onAutomationChange"
  | "onExecutionPreferencesChange"
  | "onModelChange"
>;

export function useComposerUiState({
  draftState,
  executionPreferences: controlledExecutionPreferences,
  onAutomationChange,
  onExecutionPreferencesChange,
  onModelChange,
}: UseComposerUiStateArgs) {
  const fallbackDraftState = useComposerDraftState();
  const resolvedDraftState: ComposerDraftState = draftState ?? fallbackDraftState;
  const [uncontrolledExecutionPreferences, setUncontrolledExecutionPreferences] =
    useState<ChatExecutionPreferences>(DEFAULT_CHAT_EXECUTION_PREFERENCES);

  const {
    data: authStatus,
    isPending: authPending,
    isFetching: authFetching,
  } = useAuthStatus();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isAuthenticated = Boolean(authStatus?.user && authStatus?.session);
  const isAuthChecking = authPending || authFetching;

  const handleRequireAuth = useCallback(() => {
    resolvedDraftState.setAuthDialogOpen(true);
  }, [resolvedDraftState]);

  const {
    state: automationPreferences,
    loading: automationLoading,
    saving: automationSaving,
    update: updateAutomationPreference,
    error: automationError,
  } = useAutomationPreferences({
    isAuthenticated,
    isAuthChecking,
    onChange: onAutomationChange,
    onRequireAuth: handleRequireAuth,
  });

  const automationStateRef = useRef<AutomationState>(automationPreferences);
  useEffect(() => {
    automationStateRef.current = automationPreferences;
  }, [automationPreferences]);

  const lastAutomationErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (automationError && automationError !== lastAutomationErrorRef.current) {
      toast.error(automationError);
    }
    lastAutomationErrorRef.current = automationError ?? null;
  }, [automationError]);

  const redirectTo = useMemo(() => {
    const currentPath = pathname ?? "/";
    const params = searchParams?.toString();
    return params ? `${currentPath}?${params}` : currentPath;
  }, [pathname, searchParams]);

  const dispatchModelChange = useCallback(
    (value: string) => {
      const model = MODELS.find((item) => item.value === value);
      onModelChange?.(value, model?.strategy);
    },
    [onModelChange],
  );

  const handleModelSelect = useCallback(
    (value: string) => {
      const model = MODELS.find((item) => item.value === value);
      if (model && "warning" in model && model.warning) {
        resolvedDraftState.setPendingModelWarning({
          value,
          warning: model.warning,
        });
        return;
      }
      dispatchModelChange(value);
    },
    [dispatchModelChange, resolvedDraftState],
  );

  const handleModelWarningConfirm = useCallback(() => {
    if (!resolvedDraftState.pendingModelWarning) {
      return;
    }
    dispatchModelChange(resolvedDraftState.pendingModelWarning.value);
    resolvedDraftState.setPendingModelWarning(null);
  }, [dispatchModelChange, resolvedDraftState]);

  const handleModelWarningCancel = useCallback(() => {
    resolvedDraftState.setPendingModelWarning(null);
  }, [resolvedDraftState]);

  const resolvedExecutionPreferences =
    controlledExecutionPreferences ?? uncontrolledExecutionPreferences;

  const handleExecutionPreferencesChange = useCallback(
    (next: ChatExecutionPreferences) => {
      onExecutionPreferencesChange?.(next);
      if (controlledExecutionPreferences === undefined) {
        setUncontrolledExecutionPreferences(next);
      }
    },
    [controlledExecutionPreferences, onExecutionPreferencesChange],
  );

  const handleAutomationToggle = useCallback(
    (key: AutonomousActionKey, value: boolean) => {
      if (automationLoading || automationSaving) {
        return;
      }

      updateAutomationPreference(key, value)
        .then(() => {
          trackAgentEvent("automation_settings_changed", {
            action: key,
            enabled: value,
          });
        })
        .catch(() => undefined);
    },
    [automationLoading, automationSaving, updateAutomationPreference],
  );

  const handleAuthNavigation = useCallback(
    (view: AuthView) => {
      const target = `/auth/${view}?redirectTo=${encodeURIComponent(redirectTo)}`;
      router.push(target);
      resolvedDraftState.setAuthDialogOpen(false);
    },
    [redirectTo, resolvedDraftState, router],
  );

  return {
    automationLoading,
    automationPreferences,
    automationSaving,
    automationStateRef,
    handleAuthNavigation,
    handleAutomationToggle,
    handleExecutionPreferencesChange,
    handleModelSelect,
    handleModelWarningCancel,
    handleModelWarningConfirm,
    isAuthenticated,
    resolvedDraftState,
    resolvedExecutionPreferences,
  };
}
