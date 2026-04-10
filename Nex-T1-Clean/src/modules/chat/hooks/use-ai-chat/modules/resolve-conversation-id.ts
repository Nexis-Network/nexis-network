"use client";

import { normalizeConversationId } from "../use-ai-chat-utils";
import type { UseNexChatOptions } from "../use-ai-chat.types";

type ResolveConversationId = UseNexChatOptions["resolveConversationId"];

export async function resolveConversationIdForSend(args: {
  conversationId: string | null;
  text: string;
  handleConversationId: (conversationId: string) => void;
  resolveConversationId?: ResolveConversationId;
}): Promise<string | null> {
  const {
    conversationId,
    text,
    handleConversationId,
    resolveConversationId,
  } = args;

  const normalizedConversationId = normalizeConversationId(conversationId);
  if (normalizedConversationId) {
    return normalizedConversationId;
  }

  if (typeof resolveConversationId !== "function") {
    return null;
  }

  const resolvedConversationId = normalizeConversationId(
    await resolveConversationId({
      text,
      conversationId: null,
    }),
  );
  if (!resolvedConversationId) {
    return null;
  }

  handleConversationId(resolvedConversationId);
  return resolvedConversationId;
}
