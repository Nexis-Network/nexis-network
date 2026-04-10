"use client";

import { cn } from "@/lib/utils";
import { WorkbenchIcon } from "./icons";
import type { WorkbenchShellRail } from "./types";

type WorkbenchShellRailProps = {
  rail: WorkbenchShellRail;
};

export function WorkbenchShellRail({ rail }: WorkbenchShellRailProps) {
  return (
    <aside className="min-h-0 border-r border-[var(--artifact-border-strong)] bg-[var(--artifact-file-tree-bg)]">
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex h-[34px] items-center border-b border-[var(--artifact-border-strong)] px-1.5">
          <div className="flex items-center gap-1">
            {rail.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onSelect}
                disabled={action.disabled}
                aria-label={action.label}
                className={cn(
                  "relative inline-flex h-[26px] w-[26px] items-center justify-center rounded-[5px] text-[var(--artifact-workbench-icon-inactive)] transition hover:bg-[var(--artifact-control-hover)] hover:text-[var(--artifact-workbench-icon-active)]",
                  action.active &&
                    "text-[var(--artifact-workbench-icon-active)] after:absolute after:bottom-[-4px] after:left-1/2 after:h-px after:w-[22px] after:-translate-x-1/2 after:bg-current",
                )}
              >
                <WorkbenchIcon name={action.icon} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex h-[35px] items-center justify-between border-b border-[var(--artifact-border-strong)] px-3">
          <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--artifact-foreground)]">
            {rail.title}
          </span>
          <div className="flex items-center gap-1">
            {rail.controls?.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onSelect}
                disabled={action.disabled}
                aria-label={action.label}
                className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-[5px] text-[var(--artifact-workbench-icon-inactive)] transition hover:bg-[var(--artifact-control-hover)] hover:text-[var(--artifact-workbench-icon-active)]"
              >
                <WorkbenchIcon name={action.icon} />
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-2">{rail.content}</div>
      </div>
    </aside>
  );
}
