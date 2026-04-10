"use client";

import { createId } from "@/components/dashboard/chat-intent";
import type { ChatCheckpoint, ConversationMessage } from "@/components/dashboard/chat-types";
import { useCallback, useState } from "react";


import { logger } from '@/lib/logger';
export function useChatCheckpoints(messages: ConversationMessage[]) {
  const [checkpoints, setCheckpoints] = useState<ChatCheckpoint[]>([]);

  const handleCreateCheckpoint = useCallback(
    (messageId: string, label?: string) => {
      setCheckpoints((previous: ChatCheckpoint[]) => {
        if (previous.some((checkpoint) => checkpoint.messageId === messageId)) {
          return previous;
        }

        const messageIndex = messages.findIndex((message) => message.id === messageId);
        if (messageIndex === -1) {
          return previous;
        }

        const message = messages[messageIndex];
        const summarySource = (message.content ?? message.query ?? "").trim();
        const summary =
          summarySource.length > 0 ? summarySource.replace(/\s+/g, " ").slice(0, 160) : null;

        const fallbackLabel =
          label?.trim() ||
          message.agent?.name ||
          (message.role === "user" ? "User prompt" : "Assistant response");

        const checkpoint: ChatCheckpoint = {
          id: createId(),
          label: fallbackLabel,
          summary,
          messageId,
          messageIndex,
          createdAt: new Date().toISOString(),
          role: message.role,
          restoredAt: null,
        };

        const next = [...previous, checkpoint];
        next.sort((a, b) => a.messageIndex - b.messageIndex);
        return next;
      });
    },
    [messages],
  );

  // Note: handleRestoreCheckpoint was largely a stub or simple state setter in the original.
  // We'll keep it simple here. If more logic is needed, it can be added.
  const handleRestoreCheckpoint = useCallback(
    async (checkpointId: string) => {
       // Implementation depends on how we want to handle restoration (e.g. truncating messages).
       // For now keeping it compatible with the interface.
       logger.debug("Restore checkpoint requested", checkpointId);
    },
    []
  );

  return {
    checkpoints,
    handleCreateCheckpoint,
    handleRestoreCheckpoint
  };
}
