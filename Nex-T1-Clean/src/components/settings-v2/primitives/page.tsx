import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SettingsPageHeaderProps = {
  title: string;
  description?: string;
  badge?: ReactNode;
  action?: ReactNode;
  className?: string;
};

type SettingsFeaturePillProps = {
  label?: string;
  className?: string;
};

type SettingsSectionProps = {
  title?: string;
  description?: string;
  badge?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  tone?: "band" | "ledger";
};

export function SettingsPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section data-settings-page className={cn("w-full space-y-6", className)}>
      {children}
    </section>
  );
}

export function SettingsPageHeader({
  title,
  description,
  badge,
  action,
  className,
}: SettingsPageHeaderProps) {
  return (
    <header data-settings-page-header className={cn("flex flex-col py-6", className)}>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="settings-page-title">{title}</h1>
        {badge}
        {action ? <div className="ml-auto">{action}</div> : null}
      </div>
      {description ? (
        <p className="settings-page-description mt-3 max-w-[760px]">
          {description}
        </p>
      ) : null}
    </header>
  );
}

export function SettingsPageBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-settings-page-body
      className={cn("flex flex-col gap-8 pb-6 xl:flex-row", className)}
    >
      {children}
    </div>
  );
}

export function SettingsMainColumn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-settings-main-column
      className={cn("flex min-w-0 flex-1 flex-col gap-8", className)}
    >
      {children}
    </div>
  );
}

export function SettingsSideColumn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      data-settings-side-column
      className={cn("flex w-full flex-col gap-6 xl:max-w-[352px]", className)}
    >
      {children}
    </aside>
  );
}

export function SettingsFeaturePill({
  label = "View latest capabilities",
  className,
}: SettingsFeaturePillProps) {
  return (
    <div
      className={cn(
        "settings-feature-pill inline-flex h-[38px] max-w-full items-center gap-2 rounded-full px-[6px] py-[6px]",
        className,
      )}
    >
      <Badge
        variant="secondary"
        className="settings-feature-pill-badge rounded-full px-[10px] py-0 text-[12px]"
      >
        Updated
      </Badge>
      <span className="text-sm font-medium text-[var(--settings-foreground-strong)]">
        {label}
      </span>
      <ChevronRight className="size-4 text-[var(--settings-foreground-strong)]" />
    </div>
  );
}

export function SettingsSection({
  title,
  description,
  badge,
  action,
  children,
  className,
  contentClassName,
  tone = "band",
}: SettingsSectionProps) {
  const hasHeader = title || description || badge || action;

  return (
    <section
      data-settings-surface={tone}
      className={cn(
        "w-full",
        tone === "band" ? "space-y-4" : "overflow-hidden",
        className,
      )}
    >
      {hasHeader ? (
        <header
          className={cn(
            "flex flex-wrap items-start gap-4",
            tone === "band"
              ? "pb-1"
              : "border-b border-[var(--settings-border)] px-5 py-4",
          )}
        >
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              {title ? <h2 className="settings-card-title">{title}</h2> : null}
              {badge}
            </div>
            {description ? (
              <p className="settings-card-description max-w-3xl">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="ml-auto shrink-0">{action}</div> : null}
        </header>
      ) : null}

      <div
        data-settings-surface={
          tone === "ledger" ? "ledger-content" : "band-content"
        }
        className={cn(
          tone === "ledger" ? "px-0 py-0" : "px-0 py-0",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
