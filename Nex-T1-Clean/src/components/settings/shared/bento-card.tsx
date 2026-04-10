import { cn } from "@/lib/utils";
import type { ReactNode, RefObject } from "react";
import { StatusIndicator } from "./status-indicator";

export interface BentoCardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  ref?: RefObject<HTMLDivElement | null>;
}

export function BentoCard({ children, className, noPadding, ref }: BentoCardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-[var(--settings-panel-radius)] border border-[var(--settings-border)] bg-[var(--settings-card-bg)] text-[var(--settings-foreground-strong)] shadow-none",
        noPadding ? "p-0" : "p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface BentoCardHeaderProps {
  title: string;
  action?: ReactNode;
  className?: string;
  status?: "online" | "warning" | "offline" | "syncing";
}

export function BentoCardHeader({ title, action, className, status }: BentoCardHeaderProps) {
  return (
    <div
      className={cn(
        "-mx-5 -mt-5 mb-5 flex items-center justify-between border-b border-[var(--settings-border)] px-5 py-4",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {status && <StatusIndicator status={status} size={6} />}
        <h3 className="text-sm font-semibold text-[var(--settings-foreground-strong)]">
          {title}
        </h3>
      </div>
      {action}
    </div>
  );
}
