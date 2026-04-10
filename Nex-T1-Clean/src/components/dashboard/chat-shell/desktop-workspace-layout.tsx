"use client";

import type { ReactNode } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { getDesktopArtifactPanelSizing } from "@/components/dashboard/app-chat-shell-layout";
import { cn } from "@/lib/utils";

type DesktopWorkspaceLayoutProps = {
  chatPanel: ReactNode;
  rightPanel?: ReactNode;
  showRightPanel: boolean;
  className?: string;
};

function DesktopWorkspacePanelFrame({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}

export function DesktopWorkspaceLayout({
  chatPanel,
  rightPanel,
  showRightPanel,
  className,
}: DesktopWorkspaceLayoutProps) {
  const sizing = getDesktopArtifactPanelSizing();

  if (!showRightPanel || !rightPanel) {
    return (
      <div className={cn("flex h-full min-h-0 min-w-0 w-full flex-1", className)}>
        <DesktopWorkspacePanelFrame>{chatPanel}</DesktopWorkspacePanelFrame>
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      autoSaveId={sizing.autoSaveId}
      className={cn("h-full min-h-0 min-w-0 flex-1", className)}
      direction="horizontal"
    >
      <ResizablePanel
        className="min-w-0"
        defaultSize={sizing.chatDefaultSize}
        minSize={sizing.chatMinSize}
      >
        <DesktopWorkspacePanelFrame>{chatPanel}</DesktopWorkspacePanelFrame>
      </ResizablePanel>
      <ResizableHandle
        className="mx-1.5 bg-transparent after:w-px after:bg-[var(--artifact-handle)] hover:after:bg-[var(--artifact-handle-hover)] md:mx-2 [&>div]:h-10 [&>div]:w-4 [&>div]:rounded-full [&>div]:border-[var(--artifact-border)] [&>div]:bg-[var(--artifact-toolbar)] [&>div]:text-[var(--artifact-muted)]"
        withHandle
      />
      <ResizablePanel
        className="min-w-[18rem] max-w-full"
        defaultSize={sizing.panelDefaultSize}
        minSize={sizing.panelMinSize}
        maxSize={sizing.panelMaxSize}
      >
        <DesktopWorkspacePanelFrame>{rightPanel}</DesktopWorkspacePanelFrame>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
