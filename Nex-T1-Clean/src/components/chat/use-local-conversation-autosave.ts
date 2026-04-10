"use client";

import { useEffect, useRef } from "react";

import type { ConversationMessage } from "@/components/dashboard/chat-types";
import { isLocalConversationId } from "@/modules/chat/persistence/local-conversation-id";
import { logger } from "@/lib/logger";

type UseLocalConversationAutosaveArgs = {
  conversationId: string | null;
  messages: ConversationMessage[];
  persistMessages: (
    messages: ConversationMessage[],
    options?: { conversationId?: string },
  ) => Promise<unknown>;
};

function buildAutosaveSignature(messages: ConversationMessage[]): string {
  return messages
    .map((message) => {
      const partCount = Array.isArray(message.parts) ? message.parts.length : 0;
      const payloadCount = Array.isArray(message.payloads)
        ? message.payloads.length
        : 0;

      return [
        message.id,
        message.role,
        message.content ?? "",
        partCount,
        payloadCount,
      ].join(":");
    })
    .join("|");
}

export function useLocalConversationAutosave({
  conversationId,
  messages,
  persistMessages,
}: UseLocalConversationAutosaveArgs): void {
  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLocalConversationId(conversationId) || messages.length === 0) {
      return;
    }

    const signature = buildAutosaveSignature(messages);
    if (lastSignatureRef.current === signature) {
      return;
    }

    lastSignatureRef.current = signature;

    void persistMessages(messages, { conversationId }).catch((error) => {
      logger.warn("local_conversation_autosave_failed", {
        conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, [conversationId, messages, persistMessages]);

  useEffect(() => {
    if (!isLocalConversationId(conversationId)) {
      lastSignatureRef.current = null;
    }
  }, [conversationId]);
}
