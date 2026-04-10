import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SettingsPanelProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function SettingsPanel({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: SettingsPanelProps) {
  const hasDescription = Boolean(description);

  return (
    <section
      data-settings-surface="panel"
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-card text-card-foreground shadow-none",
        className,
      )}
    >
      {title || description || action ? (
        <header
          className={cn(
            "flex flex-wrap justify-between gap-3 border-b border-border/70 px-5 sm:flex-nowrap",
            hasDescription
              ? "min-h-14 items-start py-3 sm:items-center"
              : "items-center py-2.5",
          )}
        >
          <div className={cn(hasDescription ? "space-y-1" : "")}>
            {title ? <h2 className="text-sm font-semibold text-foreground">{title}</h2> : null}
            {description ? (
              <p className="max-w-2xl text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <div className={cn("px-5 py-5", contentClassName)}>{children}</div>
    </section>
  );
}
