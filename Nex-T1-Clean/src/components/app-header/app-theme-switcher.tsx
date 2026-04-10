"use client";

import { motion, useReducedMotion } from "motion/react";

import { appShellClasses } from "@/components/app/app-shell-primitives";
import { APP_THEME_OPTIONS } from "@/components/theme/app-theme-options";
import { useAppThemePreference } from "@/lib/hooks/ui/use-app-theme-preference";
import { cn } from "@/lib/utils";

export function AppThemeSwitcher({ className }: { className?: string }) {
  const { currentTheme, isPending, setAppThemePreference } = useAppThemePreference();
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className={cn(appShellClasses.themeSwitcherShell, className)}
      role="radiogroup"
      aria-label="Theme"
    >
      {APP_THEME_OPTIONS.map((option) => {
        const isActive = option.value === currentTheme;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            disabled={isPending}
            onClick={() => void setAppThemePreference(option.value)}
            aria-checked={isActive}
            className={cn(
              appShellClasses.themeSwitcherButton,
              isActive
                ? appShellClasses.themeSwitcherButtonActive
                : appShellClasses.themeSwitcherButtonInactive,
            )}
          >
            {isActive ? (
              <motion.span
                layoutId="app-theme-switcher-indicator"
                className={appShellClasses.themeSwitcherIndicator}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 360, damping: 32 }
                }
              />
            ) : null}
            <span className={appShellClasses.themeSwitcherLabel}>
              <Icon className={appShellClasses.themeSwitcherIcon} />
              <span className="hidden sm:inline">{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
