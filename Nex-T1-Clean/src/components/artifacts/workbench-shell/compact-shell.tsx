"use client";

import { cn } from "@/lib/utils";
import { WorkbenchShellOverflowMenu } from "./overflow-menu";
import { WorkbenchIcon } from "./icons";
import type { WorkbenchShellModel } from "./types";
import { shouldShowWorkbenchMobileBack } from "./utils";

type WorkbenchCompactShellProps = {
  model: WorkbenchShellModel;
  className?: string;
};

export function WorkbenchCompactShell({
  model,
  className,
}: WorkbenchCompactShellProps) {
  const showBack = shouldShowWorkbenchMobileBack({
    viewport: model.viewport,
    showMobileBack: model.showMobileBack,
  });

  return (
    <div
      data-testid="artifact-panel"
      className={cn("flex h-full min-h-0 flex-col gap-3 overflow-hidden", className)}
    >
      <div className="rounded-[var(--artifact-workbench-shell-radius)] border border-[var(--artifact-border-strong)] bg-[var(--artifact-shell)] px-[var(--artifact-workbench-mobile-padding)] py-3 shadow-[var(--artifact-shadow)]">
        <div className="flex items-center gap-2">
          {showBack ? (
            <button
              type="button"
              data-testid="artifact-mobile-back"
              onClick={model.onMobileBack}
              className="inline-flex h-8 min-w-16 items-center justify-center gap-1 rounded-full border border-[var(--artifact-border)] bg-[var(--artifact-control-bg)] px-3 text-xs text-[var(--artifact-muted)] transition hover:bg-[var(--artifact-control-hover)] hover:text-[var(--artifact-foreground)]"
            >
              <span className="text-base leading-none">‹</span>
              Files
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--artifact-foreground)]">
              {model.title}
            </p>
            {model.subtitle ? (
              <p className="mt-1 truncate text-xs text-[var(--artifact-muted)]">
                {model.subtitle}
              </p>
            ) : null}
          </div>
          <WorkbenchShellOverflowMenu items={model.overflowTabs} />
        </div>

        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          {model.compactTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onSelect}
              disabled={tab.disabled}
              data-testid={tab.testId}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition",
                tab.active
                  ? "border-[var(--artifact-border-strong)] bg-[var(--artifact-control-active)] text-[var(--artifact-foreground)]"
                  : "border-[var(--artifact-border)] bg-[var(--artifact-control-bg)] text-[var(--artifact-muted)] hover:bg-[var(--artifact-control-hover)] hover:text-[var(--artifact-foreground)]",
              )}
            >
              <WorkbenchIcon name={tab.icon} className="size-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[var(--artifact-workbench-shell-radius)] border border-[var(--artifact-border-strong)] bg-[var(--artifact-shell)] shadow-[var(--artifact-shadow)]">
        {model.main}
      </div>
    </div>
  );
}
