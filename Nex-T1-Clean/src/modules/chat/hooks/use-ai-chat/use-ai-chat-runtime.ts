"use client";

import {
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { useChat, useChatActions } from "@ai-sdk-tools/store";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";

import { collapseTransientProgressAssistantMessages } from "@/modules/chat/transient-progress-message";
import { useToolHandler } from "./modules/use-tool-handler";
import { useChatTransport } from "./modules/use-chat-transport";
import { useChatNormalization } from "./modules/use-chat-normalization";
import {
  APP_CHAT_DATA_PART_SCHEMAS,
} from "./chat-data-parts";
import {
  projectChatStreamDataFallback,
  useChatStreamDataState,
} from "./use-chat-stream-data-fallback";
import {
  useActiveStreamConversationEffect,
  useAssistantLoggingEffect,
  useChatStoreResetEffect,
} from "./use-ai-chat-effects";
import type {
  AnyUIMessage,
  NexChatMessage,
  UseNexChatOptions,
  UseNexChatReturn,
} from "./use-ai-chat.types";
import {
  EMPTY_BODY,
  buildChatRequestBody,
  createClientTimeContext,
  createSdkInitialMessages,
} from "./use-ai-chat-utils";

type SetChatMessages =
  (messages: AnyUIMessage[] | ((messages: AnyUIMessage[]) => AnyUIMessage[])) => void;

type RuntimeArgs = {
  api: string;
  initialMessages: NexChatMessage[];
  id?: string;
  model?: string;
  systemPromptProfileId?: string;
  body?: Record<string, UntypedJson>;
  conversationId: string | null;
  handleConversationId: (nextConversationId: string) => void;
  handleChatError: (error: Error) => void;
  handleChatFinish: (result: UntypedJson) => void;
  onToolCall?: UseNexChatOptions["onToolCall"];
  resume: boolean;
  lastAppliedChatIdRef: MutableRefObject<string | null>;
  firstAssistantMessageLoggedRef: MutableRefObject<boolean>;
  firstAssistantTextLoggedRef: MutableRefObject<boolean>;
};

export function useNexChatRuntime(args: RuntimeArgs) {
  const {
    api,
    initialMessages,
    id,
    model,
    systemPromptProfileId,
    body = EMPTY_BODY,
    conversationId,
    handleConversationId,
    handleChatError,
    handleChatFinish,
    onToolCall,
    resume,
    lastAppliedChatIdRef,
    firstAssistantMessageLoggedRef,
    firstAssistantTextLoggedRef,
  } = args;
  const { setNewChat } = useChatActions<AnyUIMessage>();
  const { mapToCompatMessage, mapToUIMessage: mapToUIMessageInstance } =
    useChatNormalization();
  const { chatTransport, cancelActiveStream } = useChatTransport(api, {
    onConversationId: handleConversationId,
    conversationId,
  });
  const sdkInitialMessages = useMemo(
    () => createSdkInitialMessages(initialMessages) as AnyUIMessage[] | undefined,
    [initialMessages],
  );
  const clientTimeContext = useMemo(() => createClientTimeContext(), []);
  const chatRequestBody = useMemo(
    () =>
      buildChatRequestBody({
        model,
        systemPromptProfileId,
        conversationId,
        clientTimeContext,
        body,
      }),
    [body, clientTimeContext, conversationId, model, systemPromptProfileId],
  );
  const { streamParts, handleDataPart, resetStreamParts } =
    useChatStreamDataState();
  const chatResult = useChat({
    ...(id ? { id } : {}),
    ...(sdkInitialMessages ? { messages: sdkInitialMessages } : {}),
    dataPartSchemas: APP_CHAT_DATA_PART_SCHEMAS,
    transport: chatTransport,
    onData: handleDataPart,
    onError: handleChatError,
    onFinish: handleChatFinish,
    experimental_throttle: 50,
    sendAutomaticallyWhen:
      lastAssistantMessageIsCompleteWithApprovalResponses,
    resume,
  });
  const setMessages: SetChatMessages = (messages) =>
    chatResult.setMessages(messages as typeof chatResult.messages);

  useChatStoreResetEffect({
    id,
    sdkInitialMessages,
    setMessages: (messages) => setMessages(messages),
    setNewChat,
    lastAppliedChatIdRef,
  });

  const status = chatResult.status;
  const rawAiMessages = useMemo(
    () =>
      Array.isArray(chatResult.messages)
        ? (chatResult.messages as AnyUIMessage[])
        : [],
    [chatResult.messages],
  );
  const aiMessages = useMemo(
    () => projectChatStreamDataFallback(rawAiMessages, streamParts),
    [rawAiMessages, streamParts],
  );
  const previousStatusRef = useRef(status);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    const wasStreaming =
      previousStatus === "submitted" || previousStatus === "streaming";
    const isStreaming = status === "submitted" || status === "streaming";

    if (!wasStreaming && isStreaming) {
      resetStreamParts();
    }

    previousStatusRef.current = status;
  }, [resetStreamParts, status]);

  useToolHandler(aiMessages, onToolCall);

  const messages = useMemo(
    () =>
      collapseTransientProgressAssistantMessages(aiMessages).map(
        mapToCompatMessage,
      ),
    [aiMessages, mapToCompatMessage],
  );

  useAssistantLoggingEffect({
    aiMessages,
    status,
    firstAssistantMessageLoggedRef,
    firstAssistantTextLoggedRef,
  });
  useActiveStreamConversationEffect({ conversationId, status });

  return {
    aiMessages,
    messages,
    status,
    usage: (chatResult as { usage?: UseNexChatReturn["usage"] }).usage,
    chatRequestBody,
    setMessages,
    sendSdkMessage: chatResult.sendMessage,
    cancelActiveStream,
    regenerate: chatResult.regenerate,
    stopSdkChat: chatResult.stop,
    addToolApprovalResponse: chatResult.addToolApprovalResponse,
    mapToUIMessageInstance,
  };
}
