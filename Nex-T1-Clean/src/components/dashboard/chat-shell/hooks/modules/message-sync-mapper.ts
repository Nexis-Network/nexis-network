"use client";

import type { ChatStatus } from "ai";

import type {
  AIAgentStream,
  AssistantPayload,
  ConversationMessage,
  Source,
} from "@/components/dashboard/chat-types";

import type { SyncMessage } from "./message-sync.types";

export function mapSyncMessageToConversationMessage(
  message: SyncMessage,
  options: {
    lastAssistantId: string | null;
    status: ChatStatus;
    selectedModelValue: string;
  },
): ConversationMessage {
  const messageId =
    typeof message.id === "string" && message.id.length > 0
      ? message.id
      : typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `msg-${Date.now().toString(16)}`;
  const role: ConversationMessage["role"] =
    message.role === "assistant" ? "assistant" : "user";
  const isAssistant = role === "assistant";
  const isLatestAssistant = isAssistant && options.lastAssistantId === messageId;
  const isStreaming =
    options.status === "streaming" || options.status === "submitted";

  return {
    id: messageId,
    role,
    content: typeof message.content === "string" ? message.content : "",
    status: isAssistant && isLatestAssistant && isStreaming ? "pending" : "ready",
    parts: Array.isArray(message.parts) ? [...message.parts] : [],
    thoughts: Array.isArray(message.thoughts)
      ? [...message.thoughts]
      : ([] as AIAgentStream[]),
    sources: Array.isArray(message.sources)
      ? [...message.sources]
      : ([] as Source[]),
    agent: null,
    model:
      typeof message.model === "string" && message.model.trim().length > 0
        ? message.model
        : options.selectedModelValue,
    createdAt: message.createdAt,
    suggestions: [],
    followUpQuestions: [],
    requestedTickers: [],
    payloads: Array.isArray(message.payloads)
      ? [...message.payloads]
      : ([] as AssistantPayload[]),
  } as ConversationMessage;
}
