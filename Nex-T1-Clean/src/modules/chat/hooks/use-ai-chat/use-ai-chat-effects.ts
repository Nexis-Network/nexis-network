"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type MutableRefObject,
} from "react";

import { writeStoredActiveStreamConversationId } from "@/lib/hooks/chat/chat-resume-storage";

import type { AnyUIMessage } from "./use-ai-chat.types";

export function useLatestRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}

export function useChatStoreResetEffect(args: {
  id?: string;
  sdkInitialMessages?: AnyUIMessage[];
  setMessages: (messages: AnyUIMessage[]) => void;
  setNewChat: (id: string, messages: AnyUIMessage[]) => void;
  lastAppliedChatIdRef: MutableRefObject<string | null>;
}): void {
  const { id, sdkInitialMessages, setMessages, setNewChat, lastAppliedChatIdRef } =
    args;

  useLayoutEffect(() => {
    const normalizedChatId =
      typeof id === "string" && id.trim().length > 0 ? id.trim() : null;

    if (!normalizedChatId) {
      lastAppliedChatIdRef.current = null;
      return;
    }

    if (lastAppliedChatIdRef.current === normalizedChatId) {
      return;
    }

    lastAppliedChatIdRef.current = normalizedChatId;
    const nextMessages = sdkInitialMessages ?? [];
    setMessages(nextMessages);
    setNewChat(normalizedChatId, nextMessages);
  }, [id, lastAppliedChatIdRef, sdkInitialMessages, setMessages, setNewChat]);
}

export function useAssistantLoggingEffect(_args: {
  aiMessages: AnyUIMessage[];
  status: string;
  firstAssistantMessageLoggedRef: MutableRefObject<boolean>;
  firstAssistantTextLoggedRef: MutableRefObject<boolean>;
}): void {}

export function useActiveStreamConversationEffect(args: {
  conversationId: string | null;
  status: string;
}): void {
  const { conversationId, status } = args;

  useEffect(() => {
    if ((status === "streaming" || status === "submitted") && conversationId) {
      writeStoredActiveStreamConversationId(conversationId);
      return;
    }

    if (status === "ready" || status === "error") {
      writeStoredActiveStreamConversationId(null);
    }
  }, [conversationId, status]);
}
