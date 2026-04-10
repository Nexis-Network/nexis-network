/**
 * Hook Output Parser -- Parses raw hook output into validated HookOutput
 *
 * Handles JSON output, plain text fallback, and size limits.
 */

import { logger } from "@/lib/logger";
import type { HookOutput } from "./types";

/** Maximum length of raw output that will be parsed. Prevents runaway allocations. */
const MAX_OUTPUT_LENGTH = 64 * 1024; // 64 KB

/** Maximum length of a system message extracted from non-JSON output. */
const MAX_SYSTEM_MESSAGE_LENGTH = 4096;

/**
 * Parses raw hook output into a validated HookOutput object.
 *
 * - Valid JSON objects are field-validated and sanitized.
 * - Non-JSON output is treated as a plain system message (truncated to a safe length).
 * - Empty or excessively long output returns an empty result.
 */
export function parseHookOutput(raw: string): HookOutput {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  // Reject excessively long output before parsing
  if (trimmed.length > MAX_OUTPUT_LENGTH) {
    logger.warn("Hook output exceeds max length, truncating", {
      length: trimmed.length,
      maxLength: MAX_OUTPUT_LENGTH,
    });
    return {
      systemMessage: trimmed.slice(0, MAX_SYSTEM_MESSAGE_LENGTH) + "... [truncated]",
    };
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    const obj = parsed as Record<string, unknown>;

    return {
      continue: typeof obj.continue === "boolean" ? obj.continue : undefined,
      decision: isValidDecision(obj.decision) ? obj.decision : undefined,
      reason: typeof obj.reason === "string" ? obj.reason : undefined,
      systemMessage: typeof obj.systemMessage === "string"
        ? obj.systemMessage.slice(0, MAX_SYSTEM_MESSAGE_LENGTH)
        : undefined,
      updatedInput: isPlainObject(obj.updatedInput) ? obj.updatedInput : undefined,
      additionalContext: typeof obj.additionalContext === "string"
        ? obj.additionalContext.slice(0, MAX_SYSTEM_MESSAGE_LENGTH)
        : undefined,
      suppressOutput: typeof obj.suppressOutput === "boolean" ? obj.suppressOutput : undefined,
    };
  } catch {
    // Non-JSON output treated as system message, truncated to safe length
    const safeMessage = trimmed.slice(0, MAX_SYSTEM_MESSAGE_LENGTH);
    return { systemMessage: safeMessage };
  }
}

function isValidDecision(v: unknown): v is "approve" | "block" | "ask" {
  return v === "approve" || v === "block" || v === "ask";
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
