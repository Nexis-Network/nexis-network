"use client";

import { mapSyncMessageToConversationMessage } from "./message-sync-mapper";
import { dedupeMessagePayloads } from "./message-sync-payloads";
import { normalizeSyncMessages } from "./message-sync-normalize";
import { mergeSyncSources } from "./message-sync-sources";

export function useMessageSync() {
  return {
    mergeSources: mergeSyncSources,
    dedupePayloads: dedupeMessagePayloads,
    normalizeAiMessages: normalizeSyncMessages,
    mapToConversationMessage: mapSyncMessageToConversationMessage,
  };
}
