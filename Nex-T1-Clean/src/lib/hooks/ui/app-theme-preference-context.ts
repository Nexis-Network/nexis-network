import { createContext } from "react";

import type { AppTheme } from "@/lib/theme/app-theme";

export type AppThemePreferenceContextValue = {
  currentTheme: AppTheme;
  persistedTheme: AppTheme | null;
  isPending: boolean;
  setAppThemePreference: (theme: AppTheme) => Promise<void>;
};

export const AppThemePreferenceContext =
  createContext<AppThemePreferenceContextValue | null>(null);
