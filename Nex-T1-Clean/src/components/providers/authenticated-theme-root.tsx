"use client";

import { useEffect, type ReactNode } from "react";

import {
  AppThemePreferenceProvider,
  useAppThemePreference,
} from "@/lib/hooks/ui/use-app-theme-preference";

function AuthenticatedThemeScope({ children }: { children: ReactNode }) {
  const { currentTheme } = useAppThemePreference();

  useEffect(() => {
    document.documentElement.dataset.authTheme = currentTheme;
  }, [currentTheme]);

  return (
    <div className="auth-theme-root min-h-0 flex-1" data-auth-theme={currentTheme} suppressHydrationWarning>
      {children}
    </div>
  );
}

export function AuthenticatedThemeRoot({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AppThemePreferenceProvider>
      <AuthenticatedThemeScope>{children}</AuthenticatedThemeScope>
    </AppThemePreferenceProvider>
  );
}
