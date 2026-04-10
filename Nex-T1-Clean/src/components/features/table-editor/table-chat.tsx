"use client";

import { MessageCircle, Table } from "lucide-react";
import { ResizableHandle, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatMessageInput } from "./chat-message-input";
import { ChatMessageList } from "./chat-message-list";
import { PanelLeftChat } from "./panel-left-chat";
import { PanelRightArtifact } from "./panel-right-artifact";
import { TableArtifactMobile } from "./table-artifact-mobile";
import { TableArtifactLoading } from "./table-artifact-loading";
import { TableEditorChatProvider, useTableEditorChat } from "./table-chat-provider";
import { useChatArtifactPair } from "../../../hooks/table-editor/use-artifact-panel-state";
/**
 * Main chat component that handles both simple chat and table editing modes
 * Shows a basic chat interface when no table data exists
 * Shows a split-panel interface (chat + table editor) when table data is present
 */
function TableChatShell() {
  // Get the current table data and check if we have any content
  const { tableArtifact } = useTableEditorChat();
  const hasArtifactData = Boolean(tableArtifact?.data);

  // Manage the state of both chat and table panels
  // This hook coordinates between the left chat panel and right table panel
  const { leftState, rightState } = useChatArtifactPair({
    artifact: tableArtifact,
    // Automatically open the table panel when:
    // - We have table data
    // - Data is currently loading
    // - Data is being streamed from the AI
    autoOpenWhen: (current) =>
      Boolean(current?.hasData && current?.data) || current?.status === "loading" || current?.status === "streaming",
    coordination: {
      autoResize: true, // Panels resize automatically
      cascadeCollapse: false, // Panels don't collapse together
    },
  });

  // Show simple chat interface when no table data exists
  if (!hasArtifactData && !rightState.isOpen) {
    return (
      <div className="flex flex-col items-center justify-center transition-all duration-700 ease-in-out">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
          <ChatMessageList />
          <ChatMessageInput />
        </div>
      </div>
    );
  }

  // Show split-panel interface when table data exists
  // Desktop: Left side: Chat messages, Right side: Table editor
  // Mobile: Tab-based interface with full-screen panels
  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Desktop Layout - Resizable Panels */}
      <div className="hidden h-full w-full md:flex">
        <ResizablePanelGroup className="flex h-full w-full" direction="horizontal">
          <PanelLeftChat panelState={leftState} />
          <ResizableHandle />
          <PanelRightArtifact artifact={tableArtifact} leftPanelState={leftState} rightPanelState={rightState} />
        </ResizablePanelGroup>
      </div>

      {/* Mobile Layout - Tab Interface */}
      <div className="flex h-full w-full md:hidden">
        <Tabs className="flex h-full w-full flex-col" defaultValue="chat">
          <TabsList className="grid w-full grid-cols-2 rounded-none">
            <TabsTrigger className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm" value="chat">
              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Chat</span>
            </TabsTrigger>
            <TabsTrigger className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm" value="table">
              <Table className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Table</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent className="m-0 flex-1 overflow-hidden" value="chat">
            <div className="flex h-full flex-col">
              <ChatMessageList />
              <ChatMessageInput />
            </div>
          </TabsContent>

          <TabsContent className="m-0 flex-1 overflow-hidden" value="table">
            <div className="h-full w-full">
              {(() => {
                const shouldShowLoading = Boolean(
                  tableArtifact?.isActive &&
                    (tableArtifact?.data)?.stage &&
                    (tableArtifact?.data)?.stage !== "complete"
                );

                if (shouldShowLoading) {
                  return <TableArtifactLoading showDetails={true} showTableSkeleton={true} />;
                }
                if (hasArtifactData) {
                  return <TableArtifactMobile />;
                }
                return (
                  <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground text-sm">
                    Send a prompt with CSV data or instructions to generate the table editor artifact.
                  </div>
                );
              })()}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function TableChat() {
  return (
    <TableEditorChatProvider>
      <TableChatShell />
    </TableEditorChatProvider>
  );
}
