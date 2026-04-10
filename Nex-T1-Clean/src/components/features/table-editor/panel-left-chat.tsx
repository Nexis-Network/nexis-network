"use client";

import { PanelRightOpen } from "lucide-react";
import { ChatMessageInput, SpreadsheetSuggestions } from "./chat-message-input";
import { ChatMessageList } from "./chat-message-list";
import { ExpandablePanel, type ExpandablePanelState } from "@/components/layout/panels/expandable-panel";

type PanelLeftChatProps = {
  panelState: ExpandablePanelState;
};

export function PanelLeftChat({ panelState }: PanelLeftChatProps) {
  const { panelProps } = panelState;

  return (
    <ExpandablePanel
      {...panelProps}
      collapseButtonLabel="Collapse chat"
      collapsedLabel={<PanelRightOpen className="h-4 w-4" />}
      header={false}
      panelClassName="bg-background"
    >
      <div className="flex h-full flex-col">
        <ChatMessageList />
        <SpreadsheetSuggestions />
        <ChatMessageInput />
      </div>
    </ExpandablePanel>
  );
}
