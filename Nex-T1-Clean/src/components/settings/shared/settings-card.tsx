import { RotateCcw, AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/settings/shared/settings-button";
import { Skeleton } from "@/components/ui/skeleton";

interface SettingsCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  footerHint?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: ReactNode;
  className?: string;
}

export function SettingsCard({
  title,
  description,
  icon,
  badge,
  footerHint,
  isLoading,
  error,
  onRetry,
  children,
  className,
}: SettingsCardProps) {
  return (
    <section
      className={cn(
        "space-y-5 rounded-[var(--settings-panel-radius)] border border-[var(--settings-border)] bg-[var(--settings-card-bg)] p-5 text-[var(--settings-foreground-strong)] shadow-none",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-[var(--settings-foreground-muted)]">{icon}</span>}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[var(--settings-foreground-strong)]">{title}</h3>
            {description && (
              <p className="text-sm leading-6 text-[var(--settings-foreground-muted)]">{description}</p>
            )}
          </div>
        </div>
        {badge}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4 bg-[var(--settings-elevated)]" />
          <Skeleton className="h-4 w-1/2 bg-[var(--settings-elevated)]" />
          <Skeleton className="h-8 w-full bg-[var(--settings-elevated)]" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-[var(--settings-radius)] border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <p className="flex-1 text-xs">{error}</p>
          {onRetry && (
            <Button variant="ghost" size="icon-sm" onClick={onRetry} className="text-destructive hover:text-destructive">
              <RotateCcw className="size-3.5" />
            </Button>
          )}
        </div>
      ) : (
        children
      )}

      {footerHint && (
        <p className="border-t border-[var(--settings-border)] pt-3 text-xs leading-5 text-[var(--settings-foreground-muted)]">
          {footerHint}
        </p>
      )}
    </section>
  );
}
