"use client";

import { cn } from "@/lib/utils";
import { WorkbenchIcon } from "./icons";
import type { WorkbenchShellStatusItem } from "./types";

type StatusGroupProps = {
  items: WorkbenchShellStatusItem[];
};

function StatusGroup({ items }: StatusGroupProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "inline-flex min-w-0 items-center gap-1.5 text-[11px]",
            item.tone === "default"
              ? "text-[var(--artifact-foreground)]"
              : "text-[var(--artifact-muted)]",
          )}
        >
          {item.icon ? <WorkbenchIcon name={item.icon} className="size-3.5" /> : null}
          <span className="truncate">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

type WorkbenchShellStatusBarProps = {
  left: WorkbenchShellStatusItem[];
  right: WorkbenchShellStatusItem[];
};

export function WorkbenchShellStatusBar({
  left,
  right,
}: WorkbenchShellStatusBarProps) {
  return (
    <div className="flex h-[var(--artifact-workbench-statusbar-height)] items-center justify-between gap-4 border-t border-[var(--artifact-workbench-statusbar-border)] bg-[var(--artifact-workbench-statusbar-bg)] px-2.5">
      <StatusGroup items={left} />
      <StatusGroup items={right} />
    </div>
  );
}
