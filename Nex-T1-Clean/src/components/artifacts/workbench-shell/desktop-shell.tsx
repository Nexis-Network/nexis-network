"use client";

import { cn } from "@/lib/utils";
import { WorkbenchShellDock } from "./dock";
import { WorkbenchShellHeader } from "./header";
import { WorkbenchShellRail } from "./rail";
import { WorkbenchShellStatusBar } from "./status-bar";
import type { WorkbenchShellModel } from "./types";
import { hasWorkbenchStatusItems, resolveWorkbenchRowTemplate } from "./utils";

type WorkbenchDesktopShellProps = {
  model: WorkbenchShellModel;
  className?: string;
};

export function WorkbenchDesktopShell({
  model,
  className,
}: WorkbenchDesktopShellProps) {
  const hasDock = Boolean(model.dock);
  const dockCollapsed = Boolean(model.dock?.collapsed);
  const hasStatusBar = Boolean(
    model.statusBar &&
      (hasWorkbenchStatusItems(model.statusBar.left) ||
        hasWorkbenchStatusItems(model.statusBar.right)),
  );

  return (
    <div
      data-testid="artifact-panel"
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--artifact-workbench-shell-radius)] border border-[var(--artifact-border-strong)] bg-[var(--artifact-shell)] shadow-[var(--artifact-shadow)]",
        className,
      )}
    >
      <WorkbenchShellHeader
        filesAction={model.filesAction}
        primaryTabs={model.primaryTabs}
        overflowTabs={model.overflowTabs}
        headerActions={model.headerActions}
      />

      <div
        className="grid min-h-0 flex-1"
        style={{
          gridTemplateRows: resolveWorkbenchRowTemplate({
            hasDock,
            dockCollapsed,
          }),
        }}
      >
        <div className="min-h-0 flex flex-col">
          <div
            className="grid min-h-0 flex-1"
            style={{
              gridTemplateColumns: model.rail
                ? "var(--artifact-workbench-explorer-width) minmax(0, 1fr)"
                : "minmax(0, 1fr)",
            }}
          >
            {model.rail ? <WorkbenchShellRail rail={model.rail} /> : null}
            <div className="min-h-0 overflow-hidden bg-[var(--artifact-workbench-main-bg)]">
              {model.main}
            </div>
          </div>

          {hasStatusBar && model.statusBar ? (
            <WorkbenchShellStatusBar
              left={model.statusBar.left}
              right={model.statusBar.right}
            />
          ) : null}
        </div>

        {model.dock ? <WorkbenchShellDock dock={model.dock} /> : null}
      </div>
    </div>
  );
}
