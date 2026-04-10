"use client";

import type { FileUIPart, UIMessage } from "ai";
import type { MutableRefObject } from "react";

import type { AnyUIMessage, NexChatMessage } from "./use-ai-chat.types";

type SetChatMessages = (
  messages: AnyUIMessage[] | ((messages: AnyUIMessage[]) => AnyUIMessage[]),
) => void;

export type UseNexChatOperationsArgs = {
  chatMessages: AnyUIMessage[];
  setMessages: SetChatMessages;
  sendSdkMessage: (
    message: { text: string; files?: FileUIPart[] },
    options?: { body?: Record<string, UntypedJson> },
  ) => Promise<void>;
  cancelActiveStream: (
    conversationId: string | null,
  ) => Promise<"cancelled" | "inactive">;
  regenerate: () => Promise<void>;
  stopSdkChat: () => void;
  resume: boolean;
  conversationId: string | null;
  chatRequestBody: Record<string, UntypedJson>;
  handleConversationId: (nextConversationId: string) => void;
  resolveConversationId?: (args: {
    text: string;
    conversationId: string | null;
  }) => Promise<string | null> | string | null;
  onErrorRef: MutableRefObject<((error: Error) => void) | undefined>;
  setLocalError: (error: Error | null) => void;
  setLocalInput: (value: string) => void;
  mapToUIMessageInstance: (message: NexChatMessage) => UIMessage;
  firstAssistantMessageLoggedRef: MutableRefObject<boolean>;
  firstAssistantTextLoggedRef: MutableRefObject<boolean>;
};
