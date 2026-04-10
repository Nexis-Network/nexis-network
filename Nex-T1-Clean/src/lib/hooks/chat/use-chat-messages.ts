/**
 * Chat Messages Hook
 * Production-grade state management for chat messages
 */

import { useCallback, useState } from "react";
import type { ConversationMessage } from "@/components/chat/types";

const MAX_CHAT_MESSAGES = 200;

export function useChatMessages() {
  const [messages, setMessagesState] = useState<ConversationMessage[]>([]);

  const appendMessage = useCallback((message: ConversationMessage) => {
    setMessagesState((prev) => {
      const existingIndex = prev.findIndex((candidate) => candidate.id === message.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          ...message,
        };
        return next;
      }

      const next = [...prev, message];
      if (next.length > MAX_CHAT_MESSAGES) {
        return next.slice(next.length - MAX_CHAT_MESSAGES);
      }
      return next;
    });
  }, []);

  const updateMessage = useCallback(
    (id: string, updater: (message: ConversationMessage) => ConversationMessage) => {
      setMessagesState((prev) =>
        prev.map((message) => (message.id === id ? updater(message) : message))
      );
    },
    []
  );

  const removeMessage = useCallback((id: string) => {
    setMessagesState((prev) => prev.filter((message) => message.id !== id));
  }, []);

  const clearMessages = useCallback(() => {
    setMessagesState([]);
  }, []);

  const replaceMessages = useCallback((nextMessages: ConversationMessage[]) => {
    setMessagesState(() => {
      if (nextMessages.length > MAX_CHAT_MESSAGES) {
        return nextMessages.slice(nextMessages.length - MAX_CHAT_MESSAGES);
      }
      return nextMessages;
    });
  }, []);

  const getReadyHistory = useCallback(() => {
    return messages
      .filter((message) => message.status === "ready" && Boolean(message.content?.trim()))
      .map((message) => ({
        role: message.role,
        content: message.content ?? "",
      }));
  }, [messages]);

  return {
    messages,
    appendMessage,
    updateMessage,
    removeMessage,
    replaceMessages,
    clearMessages,
    getReadyHistory,
  };
}
