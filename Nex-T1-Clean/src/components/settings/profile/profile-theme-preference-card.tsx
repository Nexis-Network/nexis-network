"use client";

import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import { APP_THEME_OPTIONS } from "@/components/theme/app-theme-options";
import { useAppThemePreference } from "@/lib/hooks/ui/use-app-theme-preference";
import { cn } from "@/lib/utils";

export function ProfileThemePreferenceCard() {
  const { currentTheme, isPending, setAppThemePreference } =
    useAppThemePreference();

  return (
    <SettingsPanel
      title="Theme"
      description="Choose how authenticated app surfaces look across /app and /settings."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {APP_THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = currentTheme === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={isPending}
              onClick={() => void setAppThemePreference(option.value)}
              className={cn(
                "flex min-h-28 flex-col items-start gap-3 rounded-[var(--settings-panel-radius)] border px-4 py-4 text-left transition-colors",
                isActive
                  ? "border-[var(--settings-border-strong)] bg-[var(--settings-elevated)] text-[var(--settings-foreground-strong)]"
                  : "border-[var(--settings-border)] bg-[var(--settings-card-bg)] text-[var(--settings-foreground-muted)] hover:border-[var(--settings-border-strong)] hover:bg-[var(--settings-elevated)] hover:text-[var(--settings-foreground-strong)]",
              )}
            >
              <span className="inline-flex size-8 items-center justify-center rounded-full border border-[var(--settings-border)] bg-[var(--settings-elevated)]">
                <Icon className="size-4" />
              </span>
              <span className="space-y-1">
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="block text-xs leading-5 opacity-80">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </SettingsPanel>
  );
}
