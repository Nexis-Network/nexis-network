"use client";

import { cn } from "@/lib/utils";
import { WorkbenchIcon } from "./icons";
import type { WorkbenchShellDock } from "./types";

type WorkbenchShellDockProps = {
  dock: WorkbenchShellDock;
};

export function WorkbenchShellDock({ dock }: WorkbenchShellDockProps) {
  return (
    <section className="min-h-0 border-t border-[var(--artifact-workbench-dock-divider)] bg-[var(--artifact-shell)]">
      <div className="flex h-[var(--artifact-workbench-dock-header-height)] items-center justify-between border-b border-[var(--artifact-workbench-dock-divider)]">
        <div className="flex h-full items-center">
          {dock.tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onSelect}
              disabled={tab.disabled}
              data-testid={tab.testId}
              className={cn(
                "inline-flex h-full items-center gap-2 px-3 text-sm text-[var(--artifact-muted)] transition",
                tab.active &&
                  "border-b border-[var(--artifact-workbench-icon-active)] font-medium text-[var(--artifact-foreground)]",
              )}
            >
              <WorkbenchIcon name={tab.icon} className="size-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {dock.onToggleCollapse ? (
          <button
            type="button"
            onClick={dock.onToggleCollapse}
            aria-label={dock.collapsed ? "Expand dock" : "Collapse dock"}
            className="mr-1 inline-flex h-6 w-6 items-center justify-center rounded-[var(--artifact-radius-control)] text-[var(--artifact-workbench-icon-inactive)] transition hover:bg-[var(--artifact-control-hover)] hover:text-[var(--artifact-workbench-icon-active)]"
          >
            <WorkbenchIcon name="close" />
          </button>
        ) : null}
      </div>

      {!dock.collapsed ? (
        <div className="min-h-0 h-[calc(100%-var(--artifact-workbench-dock-header-height))] overflow-hidden">
          {dock.content}
        </div>
      ) : null}
    </section>
  );
}
