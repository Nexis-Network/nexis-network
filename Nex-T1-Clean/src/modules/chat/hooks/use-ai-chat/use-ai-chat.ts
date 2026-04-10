"use client";

import { useRef, useState } from "react";

import { useLatestRef } from "./use-ai-chat-effects";
import {
  useChatLifecycleCallbacks,
  useConversationState,
} from "./use-ai-chat-callbacks";
import { useNexChatOperations } from "./use-ai-chat-operations";
import { useNexChatRuntime } from "./use-ai-chat-runtime";
import type {
  NexChatMessage,
  UseNexChatOptions,
  UseNexChatReturn,
} from "./use-ai-chat.types";
import { EMPTY_BODY } from "./use-ai-chat-utils";

export type { NexChatMessage };
export type { UseNexChatOptions, UseNexChatReturn } from "./use-ai-chat.types";
export { mapToUIMessage } from "./use-ai-chat-utils";

export function useNexChat(
  options: UseNexChatOptions = {},
): UseNexChatReturn {
  const {
    api = "/api/chat",
    initialMessages = [],
    id,
    model,
    systemPromptProfileId,
    onFinish,
    onError,
    onToolCall,
    body = EMPTY_BODY,
    conversationId: controlledConversationId,
    onConversationId,
    resolveConversationId,
    resume = false,
  } = options;
  const isConversationIdControlled = Object.prototype.hasOwnProperty.call(
    options,
    "conversationId",
  );
  const [localInput, setLocalInput] = useState("");
  const [localError, setLocalError] = useState<Error | null>(null);
  const firstAssistantMessageLoggedRef = useRef(false);
  const firstAssistantTextLoggedRef = useRef(false);
  const lastAppliedChatIdRef = useRef<string | null>(null);
  const onErrorRef = useLatestRef(onError);
  const onFinishRef = useLatestRef(onFinish);
  const { conversationId, handleConversationId } = useConversationState({
    conversationId: controlledConversationId,
    isConversationIdControlled,
    onConversationId,
  });
  const { handleChatError, handleChatFinish } = useChatLifecycleCallbacks({
    onErrorRef,
    onFinishRef,
    setLocalError,
  });
  const {
    aiMessages,
    messages,
    status,
    usage,
    chatRequestBody,
    setMessages,
    sendSdkMessage,
    cancelActiveStream,
    regenerate,
    stopSdkChat,
    addToolApprovalResponse,
    mapToUIMessageInstance,
  } = useNexChatRuntime({
    api,
    initialMessages,
    id,
    model,
    systemPromptProfileId,
    body,
    conversationId,
    handleConversationId,
    handleChatError,
    handleChatFinish,
    onToolCall,
    resume,
    lastAppliedChatIdRef,
    firstAssistantMessageLoggedRef,
    firstAssistantTextLoggedRef,
  });

  const {
    stop,
    sendMessage,
    reload,
    append,
    replaceMessages,
    clear,
  } = useNexChatOperations({
    chatMessages: aiMessages,
    setMessages,
    sendSdkMessage,
    cancelActiveStream,
    regenerate,
    stopSdkChat,
    resume,
    conversationId,
    chatRequestBody,
    handleConversationId,
    resolveConversationId,
    onErrorRef,
    setLocalError,
    setLocalInput,
    mapToUIMessageInstance,
    firstAssistantMessageLoggedRef,
    firstAssistantTextLoggedRef,
  });

  return {
    messages,
    input: localInput,
    setInput: setLocalInput,
    status,
    isLoading: status === "streaming" || status === "submitted",
    sendMessage,
    respondToToolApproval: addToolApprovalResponse,
    stop,
    reload,
    append,
    replaceMessages,
    clear,
    error: localError,
    ...(usage ? { usage } : {}),
  };
}

export const useAIChat = useNexChat;
export type UseAIChatOptions = UseNexChatOptions;
export type UseAIChatReturn = UseNexChatReturn;
export type ChatMessage = NexChatMessage;

export default useNexChat;
