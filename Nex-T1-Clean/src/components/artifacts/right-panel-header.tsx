"use client";

import { ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RightPanelHeaderProps } from "./types";

export function RightPanelHeader({
  onCollapseRight,
  rightCollapsed,
  title,
}: RightPanelHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--artifact-divider)] bg-[var(--artifact-toolbar)] px-4 py-3">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--artifact-muted)]">
            Artifact
          </p>
          <h3 className="truncate text-sm font-medium text-[var(--artifact-foreground)]">
            {title ?? "Analysis"}
          </h3>
        </div>
        <button
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-[var(--artifact-radius-control)] border border-[var(--artifact-border)] bg-[var(--artifact-control-bg)]",
            "text-[var(--artifact-control-muted)] transition-colors hover:bg-[var(--artifact-control-hover)] hover:text-[var(--artifact-control-foreground)]",
          )}
          onClick={onCollapseRight}
          type="button"
        >
          <ArrowRightIcon
            className={cn(
              "h-4 w-4 transition-transform",
              rightCollapsed && "rotate-180",
            )}
          />
        </button>
      </div>
    </div>
  );
}
