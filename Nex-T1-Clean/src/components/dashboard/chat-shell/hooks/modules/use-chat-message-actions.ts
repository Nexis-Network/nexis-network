"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import type { ChatStatus } from "ai";

import type { ChatModel } from "@/components/dashboard/chat-config";
import type { ConversationMessage } from "@/components/dashboard/chat-types";
import { trackAgentEvent } from "@/modules/analytics/events";

import { logger } from "@/lib/logger";

type UseChatMessageActionsArgs = {
  messages: ConversationMessage[];
  sessionMessages: ConversationMessage[];
  chatStatus: ChatStatus;
  selectedModel: ChatModel;
  setInputValue: (value: string) => void;
  reloadChat: () => Promise<void>;
  replaceMessages: (messages: ConversationMessage[]) => void;
  persistMessages: (messages: ConversationMessage[]) => Promise<unknown>;
};

export function useChatMessageActions({
  messages,
  sessionMessages,
  chatStatus,
  selectedModel,
  setInputValue,
  reloadChat,
  replaceMessages,
  persistMessages,
}: UseChatMessageActionsArgs) {
  const handlePromptClick = useCallback(
    (prompt: string) => {
      setInputValue(prompt);
    },
    [setInputValue],
  );

  const handleFollowUpDecision = useCallback(
    (_messageId: string, _suggestionId: string, _decision: "accept" | "decline") => {
      logger.debug("[chat] handleFollowUpDecision called but feature is deferred — no-op");
      return Promise.resolve();
    },
    [],
  );

  const handleFollowUpQuestion = useCallback(
    (question: string) => {
      setInputValue(question);
    },
    [setInputValue],
  );

  const handleRegenerate = useCallback(
    async (_messageId: string) => {
      if (chatStatus === "streaming" || chatStatus === "submitted") {
        return;
      }

      try {
        await reloadChat();
        trackAgentEvent("chat_regenerate", {
          modelKey: selectedModel.value,
          modelId: selectedModel.model,
        });
      } catch (error) {
        logger.error("Regenerate failed", error);
        toast.error("Failed to regenerate response");
      }
    },
    [chatStatus, reloadChat, selectedModel.model, selectedModel.value],
  );

  const handleEditMessage = useCallback(
    (messageId: string) => {
      const message = messages.find((msg) => msg.id === messageId);
      const content = message?.content ?? "";
      setInputValue(content);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("nex:focusComposer"));
      }
    },
    [messages, setInputValue],
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      const next = sessionMessages.filter((message) => message.id !== messageId);
      replaceMessages(next);

      try {
        await persistMessages(next);
      } catch (error) {
        logger.warn("delete_message_persist_failed", error);
        toast.error("Failed to persist deleted message");
      }
    },
    [sessionMessages, replaceMessages, persistMessages],
  );

  const handleShareMessage = useCallback(
    async (messageId: string) => {
      if (typeof window === "undefined") return;

      const message = messages.find((msg) => msg.id === messageId);
      if (!message) return;

      const textContent = message.content ?? "";
      if (!textContent.trim()) {
        toast.info("Nothing to share");
        return;
      }

      try {
        await navigator.clipboard.writeText(textContent);
        toast.success("Message copied to clipboard");
        trackAgentEvent("chat_share", { messageId });
      } catch {
        toast.error("Failed to copy message");
      }
    },
    [messages],
  );

  return {
    handlePromptClick,
    handleFollowUpDecision,
    handleFollowUpQuestion,
    handleRegenerate,
    handleEditMessage,
    handleDeleteMessage,
    handleShareMessage,
  };
}
