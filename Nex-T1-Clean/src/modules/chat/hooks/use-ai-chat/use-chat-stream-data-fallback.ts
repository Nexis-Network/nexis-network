"use client";

import { useCallback, useState } from "react";

import { deriveFallbackText } from "./modules/use-chat-normalization/fallback";
import type { AnyUIMessage } from "./use-ai-chat.types";

type StreamDataPart = {
  type: `data-${string}`;
  data: unknown;
  id?: string;
  transient?: boolean;
};

function getDataPartKey(part: StreamDataPart): string {
  return `${part.type}:${part.id ?? "__default__"}`;
}

function collectObservedDataPartKeys(parts: unknown, keys: Set<string>): void {
  if (!Array.isArray(parts)) {
    return;
  }

  for (const rawPart of parts) {
    if (!rawPart || typeof rawPart !== "object") {
      continue;
    }

    const part = rawPart as {
      type?: unknown;
      id?: unknown;
      parts?: unknown;
      data?: unknown;
      output?: unknown;
      result?: unknown;
    };

    if (typeof part.type === "string" && part.type.startsWith("data-")) {
      keys.add(`${part.type}:${typeof part.id === "string" ? part.id : "__default__"}`);
    }

    collectObservedDataPartKeys(part.parts, keys);

    for (const nestedValue of [part.data, part.output, part.result]) {
      if (
        nestedValue &&
        typeof nestedValue === "object" &&
        Array.isArray((nestedValue as { parts?: unknown[] }).parts)
      ) {
        collectObservedDataPartKeys(
          (nestedValue as { parts: unknown[] }).parts,
          keys,
        );
      }
    }
  }
}

function upsertDataPart(
  current: StreamDataPart[],
  incoming: StreamDataPart,
): StreamDataPart[] {
  const next = [...current];
  const index = next.findIndex((part) => getDataPartKey(part) === getDataPartKey(incoming));

  if (index === -1) {
    next.push(incoming);
    return next;
  }

  next[index] = incoming;
  return next;
}

function buildSyntheticDataMessage(
  parts: StreamDataPart[],
  messages: AnyUIMessage[],
): AnyUIMessage | null {
  if (parts.length === 0) {
    return null;
  }

  const lastMessage = messages.at(-1);
  const fallbackContent = deriveFallbackText({
    id: lastMessage?.id ?? "stream-data",
    role: "assistant",
    content: "",
    parts: parts as unknown as AnyUIMessage["parts"],
    payloads: [],
  });

  return {
    id: `${lastMessage?.id ?? "assistant"}:stream-data`,
    role: "data" as never,
    content: fallbackContent,
    parts: parts as unknown as AnyUIMessage["parts"],
  } as AnyUIMessage;
}

export function projectChatStreamDataFallback(
  messages: AnyUIMessage[],
  streamParts: StreamDataPart[],
): AnyUIMessage[] {
  if (streamParts.length === 0) {
    return messages;
  }

  const observedKeys = new Set<string>();
  for (const message of messages) {
    collectObservedDataPartKeys(message.parts, observedKeys);
  }

  const missingParts = streamParts.filter(
    (part) => !observedKeys.has(getDataPartKey(part)),
  );
  if (missingParts.length === 0) {
    return messages;
  }

  const syntheticMessage = buildSyntheticDataMessage(missingParts, messages);
  return syntheticMessage ? [...messages, syntheticMessage] : messages;
}

export function useChatStreamDataState() {
  const [streamParts, setStreamParts] = useState<StreamDataPart[]>([]);

  const handleDataPart = useCallback((part: StreamDataPart) => {
    if (
      !part ||
      typeof part.type !== "string" ||
      !part.type.startsWith("data-") ||
      part.transient
    ) {
      return;
    }

    setStreamParts((current) => upsertDataPart(current, part));
  }, []);

  return {
    streamParts,
    handleDataPart,
    resetStreamParts: () => setStreamParts([]),
  };
}
