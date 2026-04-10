"use client";

import { type ChatStatus } from "ai";

import type {
  AIAgentStream,
  AssistantPayload,
  ConversationMessage,
  Source,
} from "@/components/dashboard/chat-types";

export type SyncMessage = {
  id?: string;
  role?: string;
  content?: string;
  model?: string;
  createdAt?: Date;
  parts?: ConversationMessage["parts"];
  thoughts?: AIAgentStream[];
  payloads?: AssistantPayload[];
  sources?: Source[];
};

export type UseChatSessionSyncArgs = {
  normalizedAiMessages: SyncMessage[];
  aiStatus: ChatStatus;
  selectedModelValue: string;
  sessionMessages: ConversationMessage[];
  addMessage: (message: ConversationMessage) => void;
  removeMessage: (messageId: string) => void;
  updateMessage: (
    messageId: string,
    updater: (message: ConversationMessage) => ConversationMessage,
  ) => void;
  mapToConversationMessage: (
    message: SyncMessage,
    options: {
      lastAssistantId: string | null;
      status: ChatStatus;
      selectedModelValue: string;
    },
  ) => ConversationMessage;
  dedupePayloads: (payloads?: AssistantPayload[]) => AssistantPayload[];
  mergeSources: (left?: Source[], right?: Source[]) => Source[];
  consumePendingMarketData: (
    messageId: string,
    payloads: AssistantPayload[],
    dedupePayloads: (payloads?: AssistantPayload[]) => AssistantPayload[],
  ) => {
    displayPreferences?: ConversationMessage["displayPreferences"];
    intentAnalysis?: ConversationMessage["intentAnalysis"];
    requestedTickers?: ConversationMessage["requestedTickers"];
    query?: ConversationMessage["query"];
    payloads: AssistantPayload[];
  } | null;
};
