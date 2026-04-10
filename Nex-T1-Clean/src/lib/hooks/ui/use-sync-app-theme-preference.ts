"use client";

import { useEffect, type MutableRefObject } from "react";
import type { UseMutationResult } from "@tanstack/react-query";

import { DEFAULT_APP_THEME, type AppTheme } from "@/lib/theme/app-theme";

import {
  clearLegacyAppThemeStorage,
  hasCompletedAppThemeMigration,
  markAppThemeMigrationComplete,
} from "./app-theme-preference-storage";

type UseSyncAppThemePreferenceParams = {
  currentTheme: AppTheme;
  isLoading: boolean;
  isServerSessionReady: boolean;
  mutation: UseMutationResult<AppTheme, Error, AppTheme, unknown>;
  persistedTheme: AppTheme | null;
  setTheme: (theme: string) => void;
  status: string;
  seededDefaultRef: MutableRefObject<boolean>;
  migrationPendingRef: MutableRefObject<boolean>;
};

function startThemeMigration({
  currentTheme,
  mutation,
  persistedTheme,
  setTheme,
  storage,
  migrationPendingRef,
}: {
  currentTheme: AppTheme;
  mutation: UseMutationResult<AppTheme, Error, AppTheme, unknown>;
  persistedTheme: AppTheme | null;
  setTheme: (theme: string) => void;
  storage: Storage;
  migrationPendingRef: MutableRefObject<boolean>;
}): void {
  migrationPendingRef.current = true;
  clearLegacyAppThemeStorage(storage);

  if (currentTheme !== DEFAULT_APP_THEME) {
    setTheme(DEFAULT_APP_THEME);
  }

  void (async (): Promise<void> => {
    try {
      if (persistedTheme !== DEFAULT_APP_THEME) {
        await mutation.mutateAsync(DEFAULT_APP_THEME);
      }

      markAppThemeMigrationComplete(storage);
    } catch {
      migrationPendingRef.current = false;
    }
  })();
}

function syncThemeSelection({
  currentTheme,
  mutation,
  persistedTheme,
  setTheme,
  seededDefaultRef,
}: {
  currentTheme: AppTheme;
  mutation: UseMutationResult<AppTheme, Error, AppTheme, unknown>;
  persistedTheme: AppTheme | null;
  setTheme: (theme: string) => void;
  seededDefaultRef: MutableRefObject<boolean>;
}): void {
  if (persistedTheme) {
    if (currentTheme !== persistedTheme) {
      setTheme(persistedTheme);
    }
    return;
  }

  if (seededDefaultRef.current) {
    return;
  }

  seededDefaultRef.current = true;
  if (currentTheme !== DEFAULT_APP_THEME) {
    setTheme(DEFAULT_APP_THEME);
  }

  mutation.mutate(DEFAULT_APP_THEME);
}

export function useSyncAppThemePreference(
  params: UseSyncAppThemePreferenceParams,
): void {
  const {
    currentTheme,
    isLoading,
    isServerSessionReady,
    mutation,
    persistedTheme,
    setTheme,
    status,
    seededDefaultRef,
    migrationPendingRef,
  } = params;

  useEffect(() => {
    if (
      status !== "authenticated" ||
      isLoading ||
      !isServerSessionReady ||
      typeof window === "undefined"
    ) {
      return;
    }

    const storage = window.localStorage;

    if (!hasCompletedAppThemeMigration(storage)) {
      if (migrationPendingRef.current) {
        return;
      }

      startThemeMigration({
        currentTheme,
        mutation,
        persistedTheme,
        setTheme,
        storage,
        migrationPendingRef,
      });

      return;
    }

    syncThemeSelection({
      currentTheme,
      mutation,
      persistedTheme,
      setTheme,
      seededDefaultRef,
    });
  }, [
    currentTheme,
    isLoading,
    isServerSessionReady,
    migrationPendingRef,
    mutation,
    persistedTheme,
    seededDefaultRef,
    setTheme,
    status,
  ]);
}
