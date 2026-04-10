"use client";

import { useEffect, useMemo, useRef } from "react";
import { logger } from "@/lib/logger";
import type { ConversationMessage } from "@/components/dashboard/chat-types";

import { getConversationMessageRenderedText } from "./chat-session-sync-rendered-text";
import { buildSyncSignature } from "./chat-session-sync-signature";
import type { UseChatSessionSyncArgs } from "./chat-session-sync.types";
import {
  findOrphanedTransientAssistantMessageIds,
  hasConversationMessageChanged,
  mergeSyncedConversationMessage,
} from "./chat-session-sync-utils";

export { buildSyncSignature } from "./chat-session-sync-signature";
export {
  findOrphanedTransientAssistantMessageIds,
  hasConversationMessageChanged,
  mergeSyncedConversationMessage,
} from "./chat-session-sync-utils";

export function useChatSessionSync({
  normalizedAiMessages,
  aiStatus,
  selectedModelValue,
  sessionMessages,
  addMessage,
  removeMessage,
  updateMessage,
  mapToConversationMessage,
  dedupePayloads,
  mergeSources,
  consumePendingMarketData,
}: UseChatSessionSyncArgs) {
  const sessionMessagesRef = useRef(sessionMessages);
  useEffect(() => {
    sessionMessagesRef.current = sessionMessages;
  }, [sessionMessages]);

  const syncSignature = useMemo(
    () => buildSyncSignature(normalizedAiMessages, aiStatus),
    [normalizedAiMessages, aiStatus],
  );
  const lastSyncSignatureRef = useRef<string>("");
  const renderedAssistantIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (normalizedAiMessages.length === 0) return;

    if (lastSyncSignatureRef.current === syncSignature) {
      return;
    }
    lastSyncSignatureRef.current = syncSignature;

    const lastAssistant = [...normalizedAiMessages]
      .reverse()
      .find((message) => message && message.role === "assistant");
    const lastAssistantId = lastAssistant?.id ?? null;

    const existingById = new Map(sessionMessagesRef.current.map((message) => [message.id, message]));

    for (const message of normalizedAiMessages) {
      const mapped = mapToConversationMessage(message, {
        lastAssistantId,
        status: aiStatus,
        selectedModelValue,
      });

      const existing = existingById.get(mapped.id);
      const renderedText = getConversationMessageRenderedText(mapped);

      if (
        mapped.role === "assistant" &&
        renderedText.length > 0 &&
        !renderedAssistantIdsRef.current.has(mapped.id)
      ) {
        renderedAssistantIdsRef.current.add(mapped.id);
        logger.debug("[useChatSessionSync] assistant message rendered", {
          id: mapped.id,
          textLength: renderedText.length,
          status: mapped.status,
        });
      }

      if (!existing) {
        addMessage(mapped);
        existingById.set(mapped.id, mapped);
        continue;
      }

      updateMessage(mapped.id, (previous) =>
        mergeSyncedConversationMessage(
          previous,
          mapped,
          dedupePayloads,
          mergeSources,
        ),
      );
    }

    const lastMessage = normalizedAiMessages.at(-1);
    if (!lastMessage || lastMessage.role !== "assistant" || !lastMessage.id) {
      return;
    }

    updateMessage(lastMessage.id, (current) => {
      const pendingUpdate = consumePendingMarketData(
        lastMessage.id!,
        current.payloads ?? [],
        dedupePayloads,
      );
      if (!pendingUpdate) return current;

      const next: ConversationMessage = {
        ...current,
        displayPreferences: pendingUpdate.displayPreferences ?? current.displayPreferences,
        intentAnalysis: pendingUpdate.intentAnalysis ?? current.intentAnalysis,
        requestedTickers: pendingUpdate.requestedTickers ?? current.requestedTickers,
        query: pendingUpdate.query ?? current.query,
        payloads: pendingUpdate.payloads,
      };

      if (!hasConversationMessageChanged(current, next)) {
        return current;
      }

      return next;
    });

    const orphanedTransientIds = findOrphanedTransientAssistantMessageIds(
      sessionMessagesRef.current,
      normalizedAiMessages,
    );

    for (const messageId of orphanedTransientIds) {
      removeMessage(messageId);
    }
  }, [
    normalizedAiMessages,
    syncSignature,
    aiStatus,
    addMessage,
    removeMessage,
    mapToConversationMessage,
    updateMessage,
    dedupePayloads,
    mergeSources,
    consumePendingMarketData,
    selectedModelValue,
  ]);
}
