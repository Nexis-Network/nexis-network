"use client";

import { dedupeMessagePayloads } from "./message-sync-payloads";
import { mergeSyncSources } from "./message-sync-sources";
import type { SyncMessage } from "./message-sync.types";
import { preferRicherMessageParts } from "./message-sync-parts";

export function mergeSyncMessage(
  base: SyncMessage,
  incoming: SyncMessage,
): SyncMessage {
  const mergedContent =
    typeof incoming.content === "string" && incoming.content.trim().length > 0
      ? incoming.content
      : base.content;

  return {
    ...base,
    ...incoming,
    content: mergedContent,
    parts: preferRicherMessageParts(base.parts, incoming.parts) ?? [],
    thoughts: [...(base.thoughts ?? []), ...(incoming.thoughts ?? [])],
    payloads: dedupeMessagePayloads([
      ...(base.payloads ?? []),
      ...(incoming.payloads ?? []),
    ]),
    sources: mergeSyncSources(base.sources ?? [], incoming.sources ?? []),
  };
}

export function isDuplicateAssistantMessage(
  previous: SyncMessage,
  next: SyncMessage,
): boolean {
  if (previous.role !== "assistant" || next.role !== "assistant") {
    return false;
  }

  if (previous.id && next.id && previous.id !== next.id) {
    return false;
  }

  const previousContent =
    typeof previous.content === "string" ? previous.content.trim() : "";
  const nextContent =
    typeof next.content === "string" ? next.content.trim() : "";

  if (previousContent === nextContent) {
    return true;
  }

  return Boolean(
    previousContent &&
      nextContent &&
      (nextContent.startsWith(previousContent) ||
        previousContent.startsWith(nextContent)),
  );
}
