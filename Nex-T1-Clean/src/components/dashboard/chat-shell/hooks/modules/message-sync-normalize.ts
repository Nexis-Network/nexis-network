"use client";

import { logger } from "@/lib/logger";

import {
  isDuplicateAssistantMessage,
  mergeSyncMessage,
} from "./message-sync-merge";
import type { SyncMessage } from "./message-sync.types";

export function normalizeSyncMessages(aiMessages: UntypedJson): SyncMessage[] {
  const result: SyncMessage[] = [];
  const idToIndex = new Map<string, number>();

  for (const raw of aiMessages as SyncMessage[]) {
    const message = raw ?? {};
    const id = typeof message.id === "string" ? message.id : null;
    const role = typeof message.role === "string" ? message.role : null;

    if (!id || !role) {
      logger.warn("[normalizeAiMessages] Skipping invalid message:", message);
      continue;
    }

    if (role === "system") {
      continue;
    }

    if (role === "data") {
      const assistantLikeMessage: SyncMessage = {
        ...message,
        role: "assistant",
      };
      const existingIndex = idToIndex.get(id);

      if (typeof existingIndex === "number") {
        result[existingIndex] = mergeSyncMessage(
          result[existingIndex],
          assistantLikeMessage,
        );
        continue;
      }

      const lastIndex = result.length - 1;
      if (lastIndex >= 0 && result[lastIndex]?.role === "assistant") {
        result[lastIndex] = mergeSyncMessage(result[lastIndex], {
          ...assistantLikeMessage,
          id: result[lastIndex]?.id,
        });
        idToIndex.set(id, lastIndex);
        continue;
      }

      idToIndex.set(id, result.length);
      result.push(assistantLikeMessage);
      continue;
    }

    const existingIndex = idToIndex.get(id);
    if (typeof existingIndex === "number") {
      result[existingIndex] = mergeSyncMessage(result[existingIndex], message);
      continue;
    }

    const lastMessage = result.at(-1);
    if (lastMessage && isDuplicateAssistantMessage(lastMessage, message)) {
      const lastIndex = result.length - 1;
      result[lastIndex] = mergeSyncMessage(lastMessage, message);
      idToIndex.set(id, lastIndex);
      continue;
    }

    idToIndex.set(id, result.length);
    result.push(message);
  }

  return result;
}
