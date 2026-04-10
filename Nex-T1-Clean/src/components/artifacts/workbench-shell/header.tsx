"use client";

import { cn } from "@/lib/utils";
import { WorkbenchIcon } from "./icons";
import { WorkbenchShellOverflowMenu } from "./overflow-menu";
import type { WorkbenchShellAction } from "./types";

type WorkbenchShellHeaderProps = {
  filesAction?: WorkbenchShellAction;
  primaryTabs: WorkbenchShellAction[];
  overflowTabs: WorkbenchShellAction[];
  headerActions?: WorkbenchShellAction[];
};

function ActionButton({ action }: { action: WorkbenchShellAction }) {
  return (
    <button
      type="button"
      onClick={action.onSelect}
      disabled={action.disabled}
      data-testid={action.testId}
      aria-label={action.label}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-[var(--artifact-radius-control)] border border-transparent bg-transparent text-[var(--artifact-workbench-icon-inactive)] transition hover:bg-[var(--artifact-control-hover)] hover:text-[var(--artifact-workbench-icon-active)] disabled:opacity-45",
        action.active &&
          "bg-[var(--artifact-control-active)] text-[var(--artifact-workbench-icon-active)]",
      )}
    >
      <WorkbenchIcon name={action.icon} />
    </button>
  );
}

export function WorkbenchShellHeader({
  filesAction,
  primaryTabs,
  overflowTabs,
  headerActions = [],
}: WorkbenchShellHeaderProps) {
  return (
    <div className="flex h-[var(--artifact-workbench-header-height)] items-center gap-3 border-b border-[var(--artifact-border-strong)] px-2">
      <div className="flex items-center gap-1">
        {filesAction ? <ActionButton action={filesAction} /> : null}
        <div className="inline-flex h-7 items-center gap-0.5 rounded-[6px] border border-[color:color-mix(in_oklab,var(--artifact-border-strong)_72%,transparent)] bg-[var(--artifact-control-bg)] p-0.5">
          {primaryTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onSelect}
              disabled={tab.disabled}
              data-testid={tab.testId}
              aria-pressed={tab.active}
              className={cn(
                "relative inline-flex h-6 w-7 items-center justify-center rounded-[5px] text-[var(--artifact-workbench-icon-inactive)] transition hover:text-[var(--artifact-workbench-icon-active)] disabled:opacity-45",
                tab.active &&
                  "bg-[var(--artifact-control-active)] text-[var(--artifact-workbench-icon-active)] shadow-[var(--artifact-shadow)]",
              )}
            >
              <WorkbenchIcon name={tab.icon} />
            </button>
          ))}
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
        <div className="pointer-events-none flex h-7 w-full max-w-[495px] items-center rounded-[999px] border border-[var(--artifact-divider)] px-2 opacity-0" />
      </div>

      <div className="ml-auto flex items-center gap-1">
        {headerActions.map((action) => (
          <ActionButton key={action.id} action={action} />
        ))}
        <WorkbenchShellOverflowMenu items={overflowTabs} />
      </div>
    </div>
  );
}
