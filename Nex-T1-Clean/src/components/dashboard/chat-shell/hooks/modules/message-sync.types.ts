"use client";

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
