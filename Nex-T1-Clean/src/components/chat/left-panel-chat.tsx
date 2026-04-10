"use client";

import { ExpandablePanel } from "@/components/layout/panels/expandable-panel";
import { TableEditorChatProvider } from "@/components/features/table-editor/table-chat-provider";
import { MessageInput } from "./message-input";
import { MessageList } from "./message-list";
import type { LeftPanelChatProps } from "./types";

export function LeftPanelChat({
  panelState,
  defaultSize,
  panelRef,
}: LeftPanelChatProps) {
  const { isCollapsed, isOpen, collapse, expand } = panelState;
  const ariaExpanded = isOpen && !isCollapsed;

  return (
    <ExpandablePanel
      aria-expanded={ariaExpanded}
      collapseButtonLabel="Collapse Chat"
      collapsedLabel="Chat"
      collapsedSize={30}
      defaultSize={defaultSize}
      header={false}
      isCollapsed={isCollapsed}
      isOpen={isOpen}
      maxSize={100}
      minSize={0}
      onCollapse={collapse}
      onExpand={expand}
      panelClassName="bg-muted"
      panelRef={panelRef}
    >
      <TableEditorChatProvider>
        <MessageList />
        <MessageInput />
      </TableEditorChatProvider>
    </ExpandablePanel>
  );
}
