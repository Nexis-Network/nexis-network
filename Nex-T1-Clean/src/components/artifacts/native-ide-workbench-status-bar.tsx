"use client";

import type { NativeIdeWorkbenchTab } from "./native-ide-workbench.utils";

type NativeIdeWorkbenchStatusBarProps = {
  activeTab: NativeIdeWorkbenchTab;
  fileCount: number;
  sandboxId: string | null | undefined;
  statusLabel: string;
};

export function NativeIdeWorkbenchStatusBar({
  activeTab,
  fileCount,
  sandboxId,
  statusLabel,
}: NativeIdeWorkbenchStatusBarProps) {
  return (
    <div
      className="flex min-h-9 items-center justify-between gap-3 border-t px-4 text-[11px]"
      style={{
        borderColor: "var(--artifact-border-strong)",
        backgroundColor: "var(--artifact-statusbar-bg)",
      }}
    >
      <div className="flex min-w-0 items-center gap-2 text-[var(--artifact-muted)]">
        <span className="truncate">{activeTab}</span>
        <span className="truncate">{fileCount} files</span>
      </div>
      <div className="flex items-center gap-2 text-[var(--artifact-foreground)]">
        <span>{statusLabel}</span>
        {sandboxId ? (
          <span className="text-[var(--artifact-muted)]">{sandboxId}</span>
        ) : null}
      </div>
    </div>
  );
}
