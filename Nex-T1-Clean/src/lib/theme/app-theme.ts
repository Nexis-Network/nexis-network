"use client";

export const APP_THEMES = ["system", "light", "dark"] as const;

export type AppTheme = (typeof APP_THEMES)[number];
export type ResolvedAppThemeMode = "light" | "dark";

/** "system" follows the OS prefers-color-scheme automatically. */
export const DEFAULT_APP_THEME: AppTheme = "system";
export const APP_THEME_STORAGE_KEY = "nex-auth-theme";
export const APP_THEME_MIGRATION_STORAGE_KEY =
  "nex-auth-theme-migrated-v1";
export const LEGACY_APP_THEME_STORAGE_KEYS = ["theme"] as const;

type MetadataRecord = Record<string, UntypedJson>;

function isMetadataRecord(value: unknown): value is MetadataRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isAppTheme(value: unknown): value is AppTheme {
  return value === "system" || value === "light" || value === "dark";
}

/** Migrate legacy "default" preference to "light" so existing users keep a familiar look. */
export function migrateLegacyTheme(value: unknown): AppTheme {
  if (value === "default") return "light";
  return isAppTheme(value) ? value : DEFAULT_APP_THEME;
}

export function normalizeAppTheme(value: unknown): AppTheme {
  return isAppTheme(value) ? value : DEFAULT_APP_THEME;
}

export function resolveAppThemeMode(
  theme: unknown,
  resolvedTheme?: unknown,
): ResolvedAppThemeMode {
  if (theme === "light" || resolvedTheme === "light") {
    return "light";
  }

  return "dark";
}

export function getAppThemeFromMetadata(
  metadata: MetadataRecord | null | undefined,
): AppTheme | null {
  if (!isMetadataRecord(metadata)) {
    return null;
  }

  const preferences = isMetadataRecord(metadata.preferences)
    ? metadata.preferences
    : null;
  const theme = preferences?.theme;

  if (theme === "default") return "light";
  return isAppTheme(theme) ? theme : null;
}

export function mergeThemePreferenceIntoMetadata(
  metadata: MetadataRecord | null | undefined,
  theme: AppTheme,
): MetadataRecord {
  const base = isMetadataRecord(metadata) ? { ...metadata } : {};
  const preferences = isMetadataRecord(base.preferences)
    ? { ...base.preferences }
    : {};

  return {
    ...base,
    preferences: {
      ...preferences,
      theme,
    },
  };
}
