"use client";

import { AppThemeSwitcher } from "@/components/app-header/app-theme-switcher";
import { cn } from "@/lib/utils";

export function ProfileMenuThemeSection({
  className,
  labelClassName,
  switcherClassName,
}: {
  className?: string;
  labelClassName?: string;
  switcherClassName?: string;
  }) {
  return (
    <div className={cn("space-y-2", className)}>
      <p
        className={cn(
          "text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--auth-menu-fg)]/75",
          labelClassName,
        )}
      >
        Theme
      </p>
      <AppThemeSwitcher className={switcherClassName} />
    </div>
  );
}
