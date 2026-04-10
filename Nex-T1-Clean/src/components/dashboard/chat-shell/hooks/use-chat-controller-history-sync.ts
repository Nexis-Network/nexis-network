"use client";

import { useEffect } from "react";

import type { ConversationMessage } from "@/components/dashboard/chat-types";
import type { NexChatMessage } from "@/types/chat-message";

type UseChatControllerHistorySyncArgs = {
  historySyncVersion: number;
  aiMessagesLength: number;
  sessionMessagesLength: number;
  hydratedAiMessages: NexChatMessage[];
  hydrateMessage: (message: ConversationMessage) => NexChatMessage;
  registerHistorySyncListener: (
    listener: (messages: ConversationMessage[]) => void,
  ) => () => void;
  replaceAiMessages: (messages: NexChatMessage[]) => void;
  stopChat: () => void;
  clearChat: () => void;
};

export function useChatControllerHistorySync({
  historySyncVersion,
  aiMessagesLength,
  sessionMessagesLength,
  hydratedAiMessages,
  hydrateMessage,
  registerHistorySyncListener,
  replaceAiMessages,
  stopChat,
  clearChat,
}: UseChatControllerHistorySyncArgs): void {
  useEffect(() => {
    return registerHistorySyncListener((nextMessages) => {
      const nextHydratedMessages = nextMessages.map(hydrateMessage);

      stopChat();

      if (nextHydratedMessages.length === 0) {
        clearChat();
        return;
      }

      replaceAiMessages(nextHydratedMessages);
    });
  }, [
    clearChat,
    hydrateMessage,
    registerHistorySyncListener,
    replaceAiMessages,
    stopChat,
  ]);

  useEffect(() => {
    if (
      historySyncVersion > 0 ||
      aiMessagesLength > 0 ||
      sessionMessagesLength === 0
    ) {
      return;
    }

    replaceAiMessages(hydratedAiMessages);
  }, [
    aiMessagesLength,
    historySyncVersion,
    hydratedAiMessages,
    replaceAiMessages,
    sessionMessagesLength,
  ]);
}
