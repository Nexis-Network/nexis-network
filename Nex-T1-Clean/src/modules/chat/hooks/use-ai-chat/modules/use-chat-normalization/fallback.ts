import { deriveStructuredFallbackText } from "@/modules/chat/ui-fallback-text";
import type { NexChatMessage } from "./types";

export function mergeOverlappingText(parts: string[]): string {
  let merged = "";

  for (const part of parts) {
    if (!part) {
      continue;
    }

    if (!merged) {
      merged = part;
      continue;
    }

    if (part === merged) {
      continue;
    }

    if (part.startsWith(merged)) {
      merged = part;
      continue;
    }

    if (merged.startsWith(part)) {
      continue;
    }

    const maxOverlap = Math.min(merged.length, part.length);
    let overlap = 0;
    for (let index = maxOverlap; index > 0; index -= 1) {
      if (merged.endsWith(part.slice(0, index))) {
        overlap = index;
        break;
      }
    }
    merged += part.slice(overlap);
  }

  return merged;
}

export function deriveFallbackText(message: NexChatMessage): string {
  return deriveStructuredFallbackText({
    role: message.role,
    content: message.content,
    parts: message.parts,
    payloads: message.payloads,
  });
}
