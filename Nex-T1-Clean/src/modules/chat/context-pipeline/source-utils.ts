/**
 * Context Source Utilities
 *
 * Prompt assembly and scope ordering helpers used by the context pipeline.
 */

import type { CacheScope, PromptSection } from "./types";

// ---------------------------------------------------------------------------
// Scope ordering (for cache boundary placement)
// ---------------------------------------------------------------------------

export const SCOPE_ORDER: Record<CacheScope, number> = {
  global: 0,
  session: 1,
  turn: 2,
};

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

/**
 * Concatenate resolved sections into a single system prompt string.
 * Sections are joined with double newlines.
 */
export function assemblePromptFromSections(sections: PromptSection[]): string {
  return sections.map((s) => s.content).join("\n\n");
}
