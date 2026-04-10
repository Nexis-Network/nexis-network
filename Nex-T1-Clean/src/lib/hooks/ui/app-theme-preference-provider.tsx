"use client";

import type { ReactElement, ReactNode } from "react";

import { AppThemePreferenceContext } from "./app-theme-preference-context";
import { useAppThemePreferenceState } from "./use-app-theme-preference-state";

export function AppThemePreferenceProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const value = useAppThemePreferenceState();

  return (
    <AppThemePreferenceContext.Provider value={value}>
      {children}
    </AppThemePreferenceContext.Provider>
  );
}
