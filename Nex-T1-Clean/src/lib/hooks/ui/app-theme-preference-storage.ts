import {
  APP_THEME_MIGRATION_STORAGE_KEY,
  APP_THEME_STORAGE_KEY,
  LEGACY_APP_THEME_STORAGE_KEYS,
} from "@/lib/theme/app-theme";

export function clearLegacyAppThemeStorage(storage: Storage): void {
  for (const storageKey of LEGACY_APP_THEME_STORAGE_KEYS) {
    storage.removeItem(storageKey);
  }

  storage.removeItem(APP_THEME_STORAGE_KEY);
}

export function hasCompletedAppThemeMigration(storage: Storage): boolean {
  return storage.getItem(APP_THEME_MIGRATION_STORAGE_KEY) === "1";
}

export function markAppThemeMigrationComplete(storage: Storage): void {
  storage.setItem(APP_THEME_MIGRATION_STORAGE_KEY, "1");
}
