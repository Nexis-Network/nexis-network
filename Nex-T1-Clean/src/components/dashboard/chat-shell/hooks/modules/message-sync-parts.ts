"use client";

import type { ConversationMessage } from "@/components/dashboard/chat-types";

type MessagePartLike = {
  type?: unknown;
  parts?: unknown;
  data?: unknown;
  output?: unknown;
  result?: unknown;
};

type MessageParts = ConversationMessage["parts"];

function isRecord(value: unknown): value is MessagePartLike {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasStructuredArtifactPart(parts: MessageParts): boolean {
  if (!Array.isArray(parts)) {
    return false;
  }

  for (const rawPart of parts) {
    const candidate = rawPart as unknown;
    if (!isRecord(candidate)) {
      continue;
    }

    if (
      typeof candidate.type === "string" &&
      candidate.type.startsWith("data-artifact-")
    ) {
      return true;
    }

    for (const nestedValue of [
      candidate.parts,
      candidate.data,
      candidate.output,
      candidate.result,
    ]) {
      const nestedParts =
        Array.isArray(nestedValue) ? nestedValue : isRecord(nestedValue) && Array.isArray(nestedValue.parts)
          ? nestedValue.parts
          : undefined;

      if (hasStructuredArtifactPart(nestedParts)) {
        return true;
      }
    }
  }

  return false;
}

function hasOnlyTextParts(parts: unknown[] | undefined): boolean {
  return (
    Array.isArray(parts) &&
    parts.length > 0 &&
    parts.every(
      (part) => isRecord(part) && typeof part.type === "string" && part.type === "text",
    )
  );
}

export function preferRicherMessageParts(
  previousParts: MessageParts,
  incomingParts: MessageParts,
): MessageParts {
  if (!Array.isArray(incomingParts) || incomingParts.length === 0) {
    return previousParts;
  }

  if (
    hasStructuredArtifactPart(previousParts) &&
    hasOnlyTextParts(incomingParts)
  ) {
    return previousParts;
  }

  return incomingParts;
}
