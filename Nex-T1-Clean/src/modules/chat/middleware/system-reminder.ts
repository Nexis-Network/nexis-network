/**
 * Context Enhancer — System Reminder Utilities
 *
 * Prompt cache boundary splitting, system-reminder XML wrapping,
 * and content escaping for safe injection.
 */

// ---------------------------------------------------------------------------
// Prompt Cache Boundary
// ---------------------------------------------------------------------------

/**
 * Marker separating static (cacheable) from dynamic (per-session) content.
 * Content above this marker can use provider-level prompt caching.
 * Content below changes per session/turn and busts the cache.
 */
export const SYSTEM_PROMPT_DYNAMIC_BOUNDARY =
  "\n\n<!-- SYSTEM_PROMPT_DYNAMIC_BOUNDARY -->\n\n";

/**
 * Splits a system prompt at the dynamic boundary into cacheable and volatile sections.
 *
 * Uses the full boundary marker (including surrounding newlines) for matching
 * to avoid false positives from partial content that happens to contain the token.
 */
export function splitPromptAtBoundary(systemPrompt: string): {
  staticSection: string;
  dynamicSection: string;
} {
  const idx = systemPrompt.indexOf(SYSTEM_PROMPT_DYNAMIC_BOUNDARY);
  if (idx < 0) {
    return { staticSection: systemPrompt, dynamicSection: "" };
  }
  return {
    staticSection: systemPrompt.slice(0, idx).trim(),
    dynamicSection: systemPrompt
      .slice(idx + SYSTEM_PROMPT_DYNAMIC_BOUNDARY.length)
      .trim(),
  };
}

// ---------------------------------------------------------------------------
// System Reminder Wrapper (for user context injection)
// ---------------------------------------------------------------------------

/**
 * Escapes content that could break out of the system-reminder XML tag.
 * Prevents injection attacks where user-controlled content contains
 * closing tags like </system-reminder>.
 */
export function escapeSystemReminderContent(content: string): string {
  // Replace literal closing tags that would break the wrapper structure.
  // Use a visually identical but structurally safe replacement.
  return content.replace(/<\/system-reminder>/gi, "&lt;/system-reminder&gt;");
}

/**
 * Wraps context in a system-reminder tag for injection into the conversation.
 * Similar to the reference architecture's prependUserContext pattern.
 *
 * All values are escaped to prevent injection of closing tags.
 */
export function wrapInSystemReminder(
  context: Record<string, string>,
): string {
  const entries = Object.entries(context)
    .filter(([, v]) => v.trim().length > 0)
    .map(
      ([key, value]) =>
        `# ${escapeSystemReminderContent(key)}\n${escapeSystemReminderContent(value)}`,
    )
    .join("\n\n");

  if (!entries) return "";

  return `<system-reminder>
As you answer the user's questions, you can use the following context:
${entries}

IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.
</system-reminder>`;
}
