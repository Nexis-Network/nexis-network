"use client";

import { useCallback, useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";

import { useSupabaseAuth } from "@/components/providers/supabase-auth-provider";
import { useServerSessionReady } from "@/lib/hooks/auth/use-server-session-ready";
import { useAuthenticatedShellDataOptional } from "@/lib/hooks/user/authenticated-shell-data";
import { useProfileAggregate } from "@/lib/hooks/user/use-profile-aggregate";
import {
  APP_THEME_STORAGE_KEY,
  getAppThemeFromMetadata,
  isAppTheme,
  normalizeAppTheme,
  type AppTheme,
} from "@/lib/theme/app-theme";

import type { AppThemePreferenceContextValue } from "./app-theme-preference-context";
import {
  clearLegacyAppThemeStorage,
  markAppThemeMigrationComplete,
} from "./app-theme-preference-storage";
import { persistAppThemePreference } from "./persist-app-theme-preference";
import { runAppThemeTransition } from "./theme-transition";
import { useSyncAppThemePreference } from "./use-sync-app-theme-preference";

function clearLegacyThemeStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  clearLegacyAppThemeStorage(window.localStorage);
}

function getStoredAppThemePreference(): AppTheme | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedTheme = window.localStorage.getItem(APP_THEME_STORAGE_KEY);
  return isAppTheme(storedTheme) ? storedTheme : null;
}

function useAppThemePreferenceMutation(
  metadata: Record<string, UntypedJson> | null | undefined,
  remotePersistenceEnabled: boolean,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nextTheme: AppTheme): Promise<AppTheme> => {
      if (!remotePersistenceEnabled) {
        return nextTheme;
      }

      await persistAppThemePreference(metadata, nextTheme);
      return nextTheme;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ["profile-aggregate"] });
    },
  });
}

export function useAppThemePreferenceState(): AppThemePreferenceContextValue {
  const { status } = useSupabaseAuth();
  const { isReady: serverSessionReady } = useServerSessionReady();
  const shellData = useAuthenticatedShellDataOptional();
  const profileQuery = useProfileAggregate({
    enabled: shellData ? false : undefined,
  });
  const profile = shellData?.profileData ?? profileQuery.data;
  const isLoading = shellData?.profileLoading ?? profileQuery.isLoading;
  const { theme, resolvedTheme, setTheme } = useTheme();
  const seededDefaultRef = useRef(false);
  const migrationPendingRef = useRef(false);
  const metadata = profile?.identity?.metadata;
  const isNonProductionTestMode =
    process.env.NODE_ENV !== "production" &&
    typeof window !== "undefined" &&
    ((window as Window & { __TEST_MODE?: boolean }).__TEST_MODE === true ||
      process.env.NEXT_PUBLIC_TEST_MODE === "true" ||
      process.env.E2E_TEST_MODE === "true");

  // When theme is "system", resolve to the actual light/dark value so CSS
  // selectors ([data-auth-theme="light"/"dark"]) and UI indicators work.
  const rawTheme = normalizeAppTheme(theme);
  const currentTheme: AppTheme =
    rawTheme === "system"
      ? normalizeAppTheme(resolvedTheme)
      : rawTheme;
  const persistedTheme = useMemo(
    () =>
      getAppThemeFromMetadata(metadata) ??
      (isNonProductionTestMode ? getStoredAppThemePreference() : null),
    [isNonProductionTestMode, metadata],
  );
  const mutation = useAppThemePreferenceMutation(
    metadata,
    !isNonProductionTestMode && serverSessionReady,
  );

  useSyncAppThemePreference({
    currentTheme,
    isLoading,
    isServerSessionReady: serverSessionReady,
    mutation,
    persistedTheme,
    setTheme,
    status,
    seededDefaultRef,
    migrationPendingRef,
  });

  const setAppThemePreference = useCallback(
    async (nextTheme: AppTheme): Promise<void> => {
      runAppThemeTransition({ nextTheme, setTheme });
      clearLegacyThemeStorage();

      if (typeof window !== "undefined") {
        markAppThemeMigrationComplete(window.localStorage);
      }

      if (
        status !== "authenticated" ||
        isNonProductionTestMode ||
        !serverSessionReady
      ) {
        return;
      }

      mutation.mutate(nextTheme);
    },
    [isNonProductionTestMode, mutation, serverSessionReady, setTheme, status],
  );

  // Always expose a resolved "light" | "dark" as currentTheme so CSS data
  // attributes and UI indicators match.  When the persisted preference is
  // "system" we fall through to the OS-resolved value.
  const effectiveTheme: AppTheme =
    persistedTheme && persistedTheme !== "system"
      ? persistedTheme
      : currentTheme;

  return useMemo(
    () => ({
      currentTheme: effectiveTheme,
      persistedTheme,
      isPending: mutation.isPending,
      setAppThemePreference,
    }),
    [effectiveTheme, mutation.isPending, persistedTheme, setAppThemePreference],
  );
}
