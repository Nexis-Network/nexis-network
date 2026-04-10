"use client";

import {
  ChevronsRight,
  Copy,
  Download,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  workbenchIconButtonClass,
  workbenchTabListClass,
} from "@/components/artifacts/workbench/workbench-ui";
import type { WorkbenchTab } from "./sandbox-workbench-surface";
import {
  WORKBENCH_TAB_ICONS,
  WORKBENCH_TAB_LABELS,
} from "./sandbox-workbench-chrome.utils";

type SandboxWorkbenchChromeHeaderProps = {
  activeTab: WorkbenchTab;
  onCollapsePanel?: () => void;
  onSetActiveTab: (tab: WorkbenchTab) => void;
  viewTabEnabled: Record<WorkbenchTab, boolean>;
  visibleTabs: WorkbenchTab[];
};

export function SandboxWorkbenchChromeHeader({
  activeTab,
  onCollapsePanel,
  onSetActiveTab,
  viewTabEnabled,
  visibleTabs,
}: SandboxWorkbenchChromeHeaderProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 border-b bg-[var(--artifact-toolbar)] px-4 py-3"
      style={{ borderColor: "var(--artifact-border-strong)" }}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Collapse artifact panel"
          onClick={onCollapsePanel}
          className={cn(workbenchIconButtonClass, "shrink-0")}
        >
          <ChevronsRight className="size-4" />
        </button>
        <div className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--artifact-muted)] md:block">
          Workspace
        </div>
      </div>
      <div className="no-scrollbar flex flex-1 items-center justify-end overflow-x-auto">
        <div className={workbenchTabListClass}>
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab;
            const isDisabled = !viewTabEnabled[tab];
            const tabTestId =
              tab === "code"
                ? "artifact-view-switch-code"
                : tab === "preview"
                  ? "artifact-view-switch-preview"
                  : `artifact-view-switch-${tab}`;

            return (
              <button
                key={tab}
                type="button"
                data-testid={tabTestId}
                onClick={() => onSetActiveTab(tab)}
                disabled={isDisabled}
                className={cn(
                  "rounded-[var(--artifact-radius-pill)] border px-3 py-1.5 text-xs font-medium transition",
                  isActive
                    ? "border-[var(--artifact-border-strong)] bg-[var(--artifact-control-active)] text-[var(--artifact-control-foreground)]"
                    : "border-transparent bg-[var(--artifact-control-bg)] text-[var(--artifact-control-muted)] hover:bg-[var(--artifact-control-hover)] hover:text-[var(--artifact-control-foreground)]",
                  isDisabled && "cursor-not-allowed opacity-55",
                )}
              >
                {WORKBENCH_TAB_LABELS[tab]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type SandboxWorkbenchChromeMetaBarProps = {
  activeTab: WorkbenchTab;
  canCopy: boolean;
  canDownload: boolean;
  metaTitle: string;
  previewUrl: string;
  onCopy: () => void;
  onDownload: () => void;
};

export function SandboxWorkbenchChromeMetaBar({
  activeTab,
  canCopy,
  canDownload,
  metaTitle,
  previewUrl,
  onCopy,
  onDownload,
}: SandboxWorkbenchChromeMetaBarProps) {
  const ActiveViewIcon = WORKBENCH_TAB_ICONS[activeTab];

  return (
    <div
      className="flex items-center justify-between gap-3 border-b bg-[var(--artifact-toolbar)] px-4 py-3"
      style={{ borderColor: "var(--artifact-border-strong)" }}
    >
      <div className="flex min-w-0 items-center gap-2 rounded-[var(--artifact-radius-pill)] border border-[var(--artifact-border)] bg-[var(--artifact-control-bg)] px-3 py-2">
        <ActiveViewIcon className="size-3.5 shrink-0 text-[var(--artifact-control-muted)]" />
        <span className="truncate text-[13px] font-medium text-[var(--artifact-foreground)]">
          {metaTitle}
        </span>
      </div>
      <div className="ml-3 flex items-center gap-1.5">
        {activeTab === "preview" && previewUrl ? (
          <button
            type="button"
            aria-label="Open preview in new tab"
            onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
            className={workbenchIconButtonClass}
          >
            <ExternalLink className="size-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Copy active view content"
          onClick={onCopy}
          disabled={!canCopy}
          className={workbenchIconButtonClass}
        >
          <Copy className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Download active view content"
          onClick={onDownload}
          disabled={!canDownload}
          className={workbenchIconButtonClass}
        >
          <Download className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

type SandboxWorkbenchChromeStatusBarProps = {
  activeTab: WorkbenchTab;
  fileCount: number;
  hasFiles: boolean;
  sandboxId: string | null;
  statusLabel: string;
};

export function SandboxWorkbenchChromeStatusBar({
  activeTab,
  fileCount,
  hasFiles,
  sandboxId,
  statusLabel,
}: SandboxWorkbenchChromeStatusBarProps) {
  return (
    <div
      className="flex min-h-9 items-center justify-between gap-3 border-t px-4 text-[11px]"
      style={{
        borderColor: "var(--artifact-border-strong)",
        backgroundColor: "var(--artifact-statusbar-bg)",
      }}
    >
      <div className="flex min-w-0 items-center gap-2 text-[var(--artifact-muted)]">
        <span className="truncate">{WORKBENCH_TAB_LABELS[activeTab]}</span>
        {sandboxId ? (
          <span className="truncate">Sandbox {sandboxId.slice(0, 8)}</span>
        ) : null}
      </div>
      <div className="flex items-center gap-2 text-[var(--artifact-foreground)]">
        <span>{statusLabel}</span>
        <span className="text-[var(--artifact-muted)]">
          {hasFiles ? `${fileCount} files` : "No files"}
        </span>
      </div>
    </div>
  );
}
