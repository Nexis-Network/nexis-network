/**
 * Auto-Compaction Engine — Full Compaction (Summarization)
 *
 * Builds summarization prompts and compacts messages by replacing
 * older conversation history with a structured summary.
 */

import type { ModelMessage } from "ai";
import type { CompactionConfig, CompactionResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

// ---------------------------------------------------------------------------
// Text extraction helpers
// ---------------------------------------------------------------------------

/** Type guard: does a content part have a `type` property? */
function isTypedPart(part: unknown): part is { type: string; [key: string]: unknown } {
  return typeof part === "object" && part !== null && "type" in part;
}

/**
 * Extracts a text representation of a message for inclusion in the
 * compaction prompt. Handles string content, array content with text/tool
 * parts, and truncates to a maximum character length.
 */
function extractMessageText(msg: ModelMessage, maxChars: number): string {
  if (typeof msg.content === "string") {
    return msg.content.slice(0, maxChars);
  }

  if (Array.isArray(msg.content)) {
    const fragments: string[] = [];
    let totalLen = 0;

    // Cast to unknown[] to avoid narrow union inference per role --
    // we handle all part shapes uniformly via isTypedPart.
    const parts = msg.content as unknown[];

    for (const part of parts) {
      if (totalLen >= maxChars) break;

      let text = "";
      if (typeof part === "string") {
        text = part;
      } else if (isTypedPart(part)) {
        if (part.type === "text" && typeof part.text === "string") {
          text = part.text as string;
        } else if (part.type === "tool-call") {
          text = `[tool-call: ${(part.toolName as string) ?? "unknown"}]`;
        } else if (part.type === "tool-result") {
          const result =
            typeof part.result === "string"
              ? part.result
              : JSON.stringify(part.result ?? "");
          text = `[tool-result: ${result.slice(0, 200)}]`;
        } else if (part.type === "reasoning" && typeof part.text === "string") {
          text = `[reasoning: ${(part.text as string).slice(0, 200)}]`;
        } else if (part.type === "image" || part.type === "file") {
          text = `[${part.type}]`;
        }
      }

      const remaining = maxChars - totalLen;
      const sliced = text.slice(0, remaining);
      if (sliced.length > 0) {
        fragments.push(sliced);
        totalLen += sliced.length;
      }
    }

    return fragments.join(" ");
  }

  return "";
}

// ---------------------------------------------------------------------------
// Full compaction (summarization)
// ---------------------------------------------------------------------------

/**
 * 9-section summarization prompt for full compaction.
 * The model generates a comprehensive summary preserving critical context.
 *
 * Limits the number of messages included to prevent the compaction prompt
 * itself from overflowing the model's context window.
 */
export function buildCompactionPrompt(
  messages: ModelMessage[],
  config: Partial<CompactionConfig> = {},
): string {
  const maxMessages = config.maxCompactionPromptMessages ?? DEFAULT_CONFIG.maxCompactionPromptMessages;

  // If there are more messages than the limit, take the first few and last
  // portion to capture both early context and recent work.
  let selectedMessages: { index: number; msg: ModelMessage }[];

  if (messages.length <= maxMessages) {
    selectedMessages = messages.map((msg, i) => ({ index: i, msg }));
  } else {
    // Keep first 10% for initial context, last 90% for recent context
    const headCount = Math.max(10, Math.floor(maxMessages * 0.1));
    const tailCount = maxMessages - headCount;
    const head = messages.slice(0, headCount).map((msg, i) => ({ index: i, msg }));
    const tailStart = messages.length - tailCount;
    const tail = messages.slice(tailStart).map((msg, i) => ({
      index: tailStart + i,
      msg,
    }));

    selectedMessages = [
      ...head,
      { index: headCount, msg: { role: "assistant", content: `[... ${messages.length - headCount - tailCount} messages omitted for compaction ...]` } as ModelMessage },
      ...tail,
    ];
  }

  const messageTexts = selectedMessages.map(({ index, msg }) => {
    const role = msg.role;
    const content = extractMessageText(msg, 500);
    return `[${index}] ${role}: ${content}`;
  });

  return `Summarize the following conversation into a structured context summary.
The summary MUST preserve all of the following sections:

1. **Primary Request and Intent** — All explicit requests from the user
2. **Key Technical Concepts** — Frameworks, technologies, patterns discussed
3. **Files and Code Sections** — File names, function names, code snippets mentioned
4. **Errors and Fixes** — What went wrong, what feedback the user gave
5. **Problem Solving** — Issues resolved and ongoing work
6. **All User Messages** — Critical for intent drift detection
7. **Pending Tasks** — Explicitly asked work not yet completed
8. **Current Work** — Recent file names, code, and context
9. **Optional Next Step** — What the user most recently asked for

Preserve technical detail. Include file paths, function names, and direct quotes.
Do NOT summarize away specifics into vague descriptions.

--- CONVERSATION (${messages.length} total messages) ---
${messageTexts.join("\n")}
--- END CONVERSATION ---

Respond with ONLY the structured summary, no preamble.`;
}

/**
 * Performs full compaction by summarizing older messages.
 * Keeps the most recent messages intact.
 */
export function compactMessages(
  messages: ModelMessage[],
  summary: string,
  preserveCount = 4,
): CompactionResult {
  if (messages.length <= preserveCount) {
    return {
      messages,
      preserved: messages.length,
      removed: 0,
      compacted: false,
      summary: null,
      discardedHeadlines: [],
    };
  }

  const toRemove = messages.slice(0, messages.length - preserveCount);
  const toKeep = messages.slice(messages.length - preserveCount);

  const discardedHeadlines = toRemove.map((m) => {
    return extractMessageText(m, 80);
  });

  // Create boundary marker message
  const boundaryMessage: ModelMessage = {
    role: "assistant" as const,
    content: `[Context Summary — ${toRemove.length} messages compacted]\n\n${summary}`,
  };

  return {
    messages: [boundaryMessage, ...toKeep],
    preserved: toKeep.length,
    removed: toRemove.length,
    compacted: true,
    summary,
    discardedHeadlines,
  };
}
