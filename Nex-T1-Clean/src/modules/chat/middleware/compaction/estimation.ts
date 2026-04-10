/**
 * Auto-Compaction Engine — Token Estimation
 *
 * Fast, approximate token counting for compaction trigger decisions.
 * Actual token counts come from the API response metadata.
 */

import type { ModelMessage } from "ai";

// ---------------------------------------------------------------------------
// Token estimation (fast, approximate)
// ---------------------------------------------------------------------------

/**
 * Rough token estimation: ~4 chars per token for English prose.
 *
 * Known limitations: code averages closer to ~3 chars/token, JSON ~3.5,
 * and non-Latin scripts (CJK, Arabic, etc.) can be 1-2 chars/token.
 * This heuristic is intentionally used only for compaction trigger
 * decisions -- actual token counts come from the API response metadata.
 */
export function estimateTokens(text: string): number {
  if (text.length === 0) return 0;
  return Math.ceil(text.length / 4);
}

/** Estimated token overhead per message for role/framing tokens. */
const MESSAGE_FRAMING_TOKENS = 4;

/** Estimated tokens for an image block (varies by resolution, but ~1k is a safe median). */
const IMAGE_TOKEN_ESTIMATE = 1_000;

/** Estimated tokens for a tool-call or tool-result structural marker. */
const TOOL_MARKER_TOKEN_ESTIMATE = 50;

/**
 * Extracts a text representation from a single content part for token estimation.
 * Handles TextPart, ToolCallPart, ToolResultPart, FilePart, ImagePart,
 * ReasoningPart, and ToolApprovalRequest/Response from the AI SDK.
 */
export function estimatePartTokens(part: unknown): number {
  if (typeof part === "string") {
    return estimateTokens(part);
  }

  if (!part || typeof part !== "object") {
    return 0;
  }

  const p = part as Record<string, unknown>;

  // TextPart: { type: "text", text: string }
  if (p.type === "text" && typeof p.text === "string") {
    return estimateTokens(p.text);
  }

  // ImagePart / FilePart with image data
  if (p.type === "image" || p.type === "file") {
    return IMAGE_TOKEN_ESTIMATE;
  }

  // ToolCallPart: { type: "tool-call", toolCallId, toolName, args }
  if (p.type === "tool-call") {
    let tokens = TOOL_MARKER_TOKEN_ESTIMATE;
    if (typeof p.toolName === "string") {
      tokens += estimateTokens(p.toolName);
    }
    if (p.args !== undefined) {
      tokens += estimateTokens(
        typeof p.args === "string" ? p.args : JSON.stringify(p.args),
      );
    }
    return tokens;
  }

  // ToolResultPart: { type: "tool-result", toolCallId, result, content? }
  if (p.type === "tool-result") {
    let tokens = TOOL_MARKER_TOKEN_ESTIMATE;
    if (p.result !== undefined) {
      tokens += estimateTokens(
        typeof p.result === "string" ? p.result : JSON.stringify(p.result),
      );
    }
    if (Array.isArray(p.content)) {
      for (const sub of p.content) {
        tokens += estimatePartTokens(sub);
      }
    }
    return tokens;
  }

  // ToolApprovalRequest / ToolApprovalResponse
  if (p.type === "tool-approval-request" || p.type === "tool-approval-response") {
    return TOOL_MARKER_TOKEN_ESTIMATE;
  }

  // ReasoningPart: { type: "reasoning", text: string }
  if (p.type === "reasoning" && typeof p.text === "string") {
    return estimateTokens(p.text);
  }

  // Fallback for unknown structured parts
  return TOOL_MARKER_TOKEN_ESTIMATE;
}

export function estimateMessagesTokens(messages: ModelMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    // Per-message framing overhead (role token, delimiters, etc.)
    total += MESSAGE_FRAMING_TOKENS;

    if (typeof msg.content === "string") {
      total += estimateTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        total += estimatePartTokens(part);
      }
    }
  }
  return total;
}
