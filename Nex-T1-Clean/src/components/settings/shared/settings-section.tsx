import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SettingsSection({ title, description, action, children, className }: SettingsSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight text-[var(--settings-foreground-strong)]">
            {title}
          </h2>
          {description && (
            <p className="text-sm leading-6 text-[var(--settings-foreground-muted)]">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
