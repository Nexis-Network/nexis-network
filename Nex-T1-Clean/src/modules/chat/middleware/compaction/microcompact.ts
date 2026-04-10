/**
 * Auto-Compaction Engine — Microcompaction
 *
 * Lightweight compaction: trims old tool results and removes
 * image blocks from older messages without summarization.
 */

import type { ModelMessage } from "ai";
import type { CompactionConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { estimateTokens } from "./estimation";

// ---------------------------------------------------------------------------
// Content part helpers
// ---------------------------------------------------------------------------

/** Type guard: does a content part have a `type` property? */
function isTypedPart(part: unknown): part is { type: string; [key: string]: unknown } {
  return typeof part === "object" && part !== null && "type" in part;
}

/**
 * Safely extracts content parts as an array of typed objects.
 * Returns null if content is not an array (e.g. it's a plain string).
 */
function getContentPartsArray(
  content: ModelMessage["content"],
): Array<{ type: string; [key: string]: unknown }> | null {
  if (!Array.isArray(content)) return null;

  const typed: Array<{ type: string; [key: string]: unknown }> = [];
  for (const part of content) {
    if (isTypedPart(part)) {
      typed.push(part);
    }
    // String parts in arrays are rare but valid for UserContent;
    // skip them for microcompaction purposes.
  }
  return typed;
}

// ---------------------------------------------------------------------------
// Microcompaction (lightweight, no summarization)
// ---------------------------------------------------------------------------

/**
 * Trims old tool results and removes image blocks from older messages.
 * Preserves the most recent messages intact.
 */
export function microcompact(
  messages: ModelMessage[],
  config: Partial<CompactionConfig> = {},
): { messages: ModelMessage[]; trimmedCount: number } {
  const maxToolTokens = config.maxToolResultTokens ?? DEFAULT_CONFIG.maxToolResultTokens;
  const recentThreshold = Math.max(4, Math.floor(messages.length * 0.3));
  let trimmedCount = 0;

  const result = messages.map((msg, idx) => {
    // Don't touch recent messages
    if (idx >= messages.length - recentThreshold) return msg;

    // System messages have string content only -- nothing to microcompact.
    // String content on user/assistant messages also has nothing to trim.
    const parts = getContentPartsArray(msg.content);
    if (parts === null) return msg;

    let changed = false;
    const newContent = parts.map((part) => {
      // Remove old image blocks
      if (part.type === "image") {
        trimmedCount++;
        changed = true;
        return { type: "text" as const, text: "[image removed during compaction]" };
      }

      // Trim large tool results (handles both AI SDK naming conventions)
      if (part.type === "tool-result") {
        const text =
          typeof part.text === "string"
            ? part.text
            : typeof part.result === "string"
              ? part.result
              : JSON.stringify(part.result ?? "");
        if (estimateTokens(text) > maxToolTokens) {
          trimmedCount++;
          changed = true;
          const truncated = text.slice(0, maxToolTokens * 4);
          return { ...part, result: truncated + "\n[output truncated during compaction]" };
        }
      }

      // Trim large tool-call args
      if (part.type === "tool-call" && part.args !== undefined) {
        const argsText =
          typeof part.args === "string" ? part.args : JSON.stringify(part.args);
        if (estimateTokens(argsText) > maxToolTokens) {
          trimmedCount++;
          changed = true;
          const truncated = argsText.slice(0, maxToolTokens * 4);
          return { ...part, args: truncated + "\n[args truncated during compaction]" };
        }
      }

      return part;
    });

    if (!changed) return msg;

    return { ...msg, content: newContent } as ModelMessage;
  });

  return { messages: result, trimmedCount };
}
