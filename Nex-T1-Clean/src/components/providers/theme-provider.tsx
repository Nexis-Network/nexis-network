'use client'

import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

import {
  APP_THEME_STORAGE_KEY,
  APP_THEMES,
  DEFAULT_APP_THEME,
} from "@/lib/theme/app-theme";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      defaultTheme={DEFAULT_APP_THEME}
      disableTransitionOnChange
      enableSystem
      storageKey={APP_THEME_STORAGE_KEY}
      themes={[...APP_THEMES]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
