"use client";

import { useCallback } from "react";
import { useConversationSession } from "@/components/chat/conversation-session-provider";
import {
  ConversationHistoryOverlayLazy,
  TasksSidebarOverlayLazy,
  WalletsSidebarFlyoutLazy,
} from "@/components/sidebar/lazy-sidebar-overlays";
import { trackAgentEvent } from "@/modules/analytics/events";
import { useSidebarStore } from "@/stores/use-sidebar-store";

export function DashboardSidePanels() {
  const { activePanel, closePanel } = useSidebarStore();
  const { currentConversationId, loadConversationIntoChat, startFreshConversation } = useConversationSession();

  const closeActivePanel = useCallback(() => {
    closePanel();
  }, [closePanel]);

  return (
    <>
      <ConversationHistoryOverlayLazy
        isOpen={activePanel === "chatHistory"}
        onClose={closeActivePanel}
        currentConversationId={currentConversationId}
        onSelectConversation={async (id) => {
          await loadConversationIntoChat(id);
        }}
        onNewConversation={() => {
          trackAgentEvent("conversation_started", { source: "history_overlay" });
          startFreshConversation();
        }}
      />
      <TasksSidebarOverlayLazy isOpen={activePanel === "tasks"} onClose={closeActivePanel} />
      <WalletsSidebarFlyoutLazy isOpen={activePanel === "wallets"} onClose={closeActivePanel} />
    </>
  );
}
