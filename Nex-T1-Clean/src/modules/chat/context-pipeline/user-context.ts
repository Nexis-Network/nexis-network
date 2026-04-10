/**
 * User Context Injection
 *
 * Handles user context wrapping and tool schema injection options
 * for the PromptAssembler pipeline.
 */

import {
  wrapInSystemReminder,
  type ContextProvenanceEntry,
} from "@/modules/chat/middleware/context-enhancer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for user context injection. */
export type UserContextPayload = Record<string, string>;

/** Placeholder options for future tool schema injection. */
export type ToolSchemaInjectionOptions = {
  /** Tool definitions to inject (format TBD in Phase 4) */
  schemas?: unknown[];
  /** Where to place tool schemas relative to the cache boundary */
  placement?: "static" | "dynamic";
};

// ---------------------------------------------------------------------------
// User context builder
// ---------------------------------------------------------------------------

/**
 * Build the user context string wrapped in system-reminder tags.
 * Returns null if the context produces no output.
 */
export function buildUserContextPart(
  context: UserContextPayload,
): string | null {
  const wrapped = wrapInSystemReminder(context);
  return wrapped || null;
}

/**
 * Create a provenance entry for user context injection.
 */
export function buildUserContextProvenance(
  content: string,
): ContextProvenanceEntry {
  return {
    source: "user_context_injection",
    scope: "turn",
    sizeChars: content.length,
    injectedAt: new Date().toISOString(),
  };
}
