"use client";

import { useMemo } from "react";

import type { ConversationMessage } from "@/components/dashboard/chat-types";
import type { ChatExecutionPreferences } from "@/modules/chat/execution-preferences";
import { useAIChat } from "@/modules/chat/hooks/use-ai-chat";
import type { ChatModel } from "@/components/dashboard/chat-config";

import {
  createChatStoreId,
  toHydratedAiMessage,
} from "./use-chat-controller-utils";

type UseChatControllerAiStateArgs = {
  sessionMessages: ConversationMessage[];
  executionPreferences: ChatExecutionPreferences;
  historySyncVersion: number;
  initialChatStoreId: string;
  currentConversationId: string | null;
  setCurrentConversationId: (conversationId: string) => void;
  createNewConversation?: (firstMessage: string, model: string) => Promise<string | null>;
  resumeStreamOnMount: boolean;
  selectedModel: ChatModel;
  promptProfileId: string | null;
  onError: (error: Error) => void;
  onFinish: () => void;
};

export function useChatControllerAiState({
  sessionMessages,
  executionPreferences,
  historySyncVersion,
  initialChatStoreId,
  currentConversationId,
  setCurrentConversationId,
  createNewConversation,
  resumeStreamOnMount,
  selectedModel,
  promptProfileId,
  onError,
  onFinish,
}: UseChatControllerAiStateArgs) {
  const requestBody = useMemo(
    () => ({ executionPreferences }),
    [executionPreferences],
  );
  const hydratedAiMessages = useMemo(
    () => sessionMessages.map(toHydratedAiMessage),
    [sessionMessages],
  );
  const chatStoreId =
    historySyncVersion > 0
      ? `chat-sync:${historySyncVersion}`
      : initialChatStoreId || createChatStoreId(currentConversationId);

  const chat = useAIChat({
    api: "/api/chat",
    id: chatStoreId,
    initialMessages: hydratedAiMessages,
    model: selectedModel.value,
    systemPromptProfileId: promptProfileId ?? undefined,
    body: requestBody,
    conversationId: currentConversationId,
    onConversationId: setCurrentConversationId,
    resolveConversationId: createNewConversation
      ? async ({ text, conversationId }) => {
          if (conversationId) {
            return conversationId;
          }

          return createNewConversation(text, selectedModel.value);
        }
      : undefined,
    resume: resumeStreamOnMount,
    onError,
    onFinish,
  });

  return {
    hydratedAiMessages,
    hydrateMessage: toHydratedAiMessage,
    aiMessages: chat.messages,
    aiInput: chat.input,
    setAiInput: chat.setInput,
    sendMessage: chat.sendMessage,
    respondToToolApproval: chat.respondToToolApproval,
    reloadChat: chat.reload,
    replaceAiMessages: chat.replaceMessages,
    stopChat: chat.stop,
    clearChat: chat.clear,
    aiStatus: chat.status,
    aiUsage: chat.usage,
  };
}
