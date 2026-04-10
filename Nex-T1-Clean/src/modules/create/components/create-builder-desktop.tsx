"use client";

import type { ComponentProps } from "react";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

import { CreateConversationPanel } from "./create-conversation-panel";
import { CreateHistoryList } from "./create-history-list";
import { CreatePreviewPanel } from "./create-preview-panel";

type CreateBuilderDesktopProps = {
  className?: string;
  conversationProps: ComponentProps<typeof CreateConversationPanel>;
  historyProps: ComponentProps<typeof CreateHistoryList>;
  previewProps: ComponentProps<typeof CreatePreviewPanel>;
};

export function CreateBuilderDesktop({
  className,
  conversationProps,
  historyProps,
  previewProps,
}: CreateBuilderDesktopProps) {
  return (
    <div className={cn("hidden min-h-0 flex-1 md:block", className)}>
      <ResizablePanelGroup className="h-full min-h-0" direction="horizontal">
        <ResizablePanel defaultSize={36} minSize={28}>
          <div className="grid h-full min-h-0 grid-cols-[14.5rem_minmax(0,1fr)] overflow-hidden">
            <CreateHistoryList {...historyProps} />
            <CreateConversationPanel {...conversationProps} />
          </div>
        </ResizablePanel>
        <ResizableHandle className="bg-[var(--auth-workspace-border)] after:bg-transparent" />
        <ResizablePanel defaultSize={64} minSize={36}>
          <CreatePreviewPanel {...previewProps} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
