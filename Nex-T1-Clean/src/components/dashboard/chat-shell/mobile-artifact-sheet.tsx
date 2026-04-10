"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MobileArtifactSheetProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function MobileArtifactSheet({
  title,
  onClose,
  children,
}: MobileArtifactSheetProps) {
  return (
    <div
      aria-label="Artifacts panel"
      aria-modal="true"
      className="fixed inset-0 z-40 flex flex-col bg-[var(--artifact-shell)]"
      role="dialog"
    >
      <div className="flex min-h-0 flex-1 flex-col px-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-[max(env(safe-area-inset-top),0.5rem)]">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--artifact-radius-shell)] border border-[var(--artifact-border-strong)] bg-[var(--artifact-shell)] shadow-[var(--artifact-shadow)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--artifact-border-strong)] bg-[var(--artifact-toolbar)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--artifact-muted)]">
                Artifact workspace
              </p>
              <p className="truncate text-sm font-medium text-[var(--artifact-foreground)]">
                {title}
              </p>
            </div>
            <button
              aria-label="Close artifacts panel"
              className={cn(
                "inline-flex h-10 min-w-10 items-center justify-center rounded-[var(--artifact-radius-pill)] border border-[var(--artifact-border)] px-4 text-sm font-medium text-[var(--artifact-foreground)] transition-colors",
                "bg-[var(--artifact-control-bg)] hover:bg-[var(--artifact-control-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--artifact-border-strong)]",
              )}
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden bg-[var(--artifact-panel)] p-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
