"use client";

import type {
  AssistantPayload,
  ConversationMessage,
  Source,
} from "@/components/dashboard/chat-types";
import { isTransientProgressAssistantMessage } from "@/modules/chat/transient-progress-message";

import { signatureForValue } from "./chat-session-sync-signature";
import type { SyncMessage } from "./chat-session-sync.types";
import { preferRicherMessageParts } from "./message-sync-parts";

export function hasConversationMessageChanged(
  previous: ConversationMessage,
  next: ConversationMessage,
): boolean {
  if (previous === next) {
    return false;
  }

  if (
    previous.id !== next.id ||
    previous.role !== next.role ||
    previous.content !== next.content ||
    previous.status !== next.status ||
    previous.model !== next.model ||
    previous.query !== next.query
  ) {
    return true;
  }

  if (signatureForValue(previous.parts ?? []) !== signatureForValue(next.parts ?? [])) {
    return true;
  }
  if (
    signatureForValue(previous.thoughts ?? []) !==
    signatureForValue(next.thoughts ?? [])
  ) {
    return true;
  }
  if (
    signatureForValue(previous.payloads ?? []) !==
    signatureForValue(next.payloads ?? [])
  ) {
    return true;
  }
  if (
    signatureForValue(previous.sources ?? []) !==
    signatureForValue(next.sources ?? [])
  ) {
    return true;
  }
  if (
    signatureForValue(previous.displayPreferences ?? null) !==
    signatureForValue(next.displayPreferences ?? null)
  ) {
    return true;
  }
  if (
    signatureForValue(previous.intentAnalysis ?? null) !==
    signatureForValue(next.intentAnalysis ?? null)
  ) {
    return true;
  }
  if (
    signatureForValue(previous.requestedTickers ?? []) !==
    signatureForValue(next.requestedTickers ?? [])
  ) {
    return true;
  }
  if (
    signatureForValue(previous.suggestions ?? []) !==
    signatureForValue(next.suggestions ?? [])
  ) {
    return true;
  }
  if (
    signatureForValue(previous.followUpQuestions ?? []) !==
    signatureForValue(next.followUpQuestions ?? [])
  ) {
    return true;
  }

  return false;
}

export function mergeSyncedConversationMessage(
  previous: ConversationMessage,
  mapped: ConversationMessage,
  dedupePayloads: (payloads?: AssistantPayload[]) => AssistantPayload[],
  mergeSources: (left?: Source[], right?: Source[]) => Source[],
): ConversationMessage {
  const nextParts = preferRicherMessageParts(previous.parts, mapped.parts) ?? [];

  const next = {
    ...previous,
    ...mapped,
    parts: nextParts,
    displayPreferences: previous.displayPreferences ?? mapped.displayPreferences,
    intentAnalysis: previous.intentAnalysis ?? mapped.intentAnalysis,
    requestedTickers: previous.requestedTickers ?? mapped.requestedTickers,
    suggestions: previous.suggestions ?? mapped.suggestions,
    query: previous.query ?? mapped.query,
    payloads: dedupePayloads([
      ...(previous.payloads ?? []),
      ...(mapped.payloads ?? []),
    ]),
    sources: mergeSources(previous.sources ?? [], mapped.sources ?? []),
  };

  if (!hasConversationMessageChanged(previous, next)) {
    return previous;
  }

  return next;
}

export function findOrphanedTransientAssistantMessageIds(
  sessionMessages: ConversationMessage[],
  normalizedAiMessages: SyncMessage[],
): string[] {
  if (sessionMessages.length === 0) {
    return [];
  }

  const activeIds = new Set(
    normalizedAiMessages
      .map((message) =>
        typeof message.id === "string" && message.id.length > 0
          ? message.id
          : null,
      )
      .filter((messageId): messageId is string => messageId !== null),
  );

  return sessionMessages
    .filter((message) => {
      if (message.role !== "assistant" || activeIds.has(message.id)) {
        return false;
      }

      return isTransientProgressAssistantMessage({
        role: message.role,
        content: message.content,
        parts: message.parts,
      });
    })
    .map((message) => message.id);
}
