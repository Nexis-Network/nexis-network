"use client";

import type { ChatStatus, FileUIPart, UIMessage } from "ai";

import type { AppChatDataParts } from "./chat-data-parts";
import type { NexChatMessage } from "./modules/use-chat-normalization";

export type { NexChatMessage };

export type UseNexChatOptions = {
  api?: string;
  initialMessages?: NexChatMessage[];
  id?: string;
  model?: string;
  systemPromptProfileId?: string;
  onFinish?: (message: UIMessage) => void;
  onError?: (error: Error) => void;
  onToolCall?: (toolCall: {
    toolName: string;
    args: UntypedJson;
    toolCallId?: string;
    partIndex?: number;
  }) => void;
  body?: Record<string, UntypedJson>;
  conversationId?: string | null;
  onConversationId?: (conversationId: string) => void;
  resolveConversationId?: (args: {
    text: string;
    conversationId: string | null;
  }) => Promise<string | null> | string | null;
  resume?: boolean;
};

export type UseNexChatReturn = {
  messages: NexChatMessage[];
  input: string;
  setInput: (value: string) => void;
  status: ChatStatus;
  isLoading: boolean;
  sendMessage: (options: {
    text: string;
    files?: FileUIPart[];
    body?: Record<string, UntypedJson>;
  }) => Promise<void>;
  respondToToolApproval: (options: {
    id: string;
    approved: boolean;
    reason?: string;
  }) => PromiseLike<void> | void;
  stop: () => void;
  reload: () => Promise<void>;
  append: (message: NexChatMessage) => void;
  replaceMessages: (messages: NexChatMessage[]) => void;
  clear: () => void;
  error: Error | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export type AnyUIMessage = UIMessage<unknown, AppChatDataParts> & {
  content?: string;
  createdAt?: Date | string;
  toolInvocations?: Array<{
    toolCallId?: string;
    id?: string;
    state?: "call" | "partial-call" | "result" | string;
    toolName?: string;
    args?: UntypedJson;
    result?: UntypedJson;
  }>;
};
