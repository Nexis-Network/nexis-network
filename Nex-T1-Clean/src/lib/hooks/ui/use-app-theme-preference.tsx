import { useContext } from "react";

import {
  AppThemePreferenceContext,
  type AppThemePreferenceContextValue,
} from "./app-theme-preference-context";

export { AppThemePreferenceProvider } from "./app-theme-preference-provider";

export function useAppThemePreference(): AppThemePreferenceContextValue {
  const context = useContext(AppThemePreferenceContext);

  if (!context) {
    throw new Error(
      "useAppThemePreference must be used within AppThemePreferenceProvider",
    );
  }

  return context;
}
