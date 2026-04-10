/**
 * Cache-aware message builder for the Nex-T1 chat pipeline.
 *
 * Handles user-context injection, attachment insertion, and delegates to
 * the existing compaction layer when the conversation exceeds the token budget.
 *
 * Every injected message is tagged with `isMeta: true` so the compaction pass
 * can identify and prioritise real user/assistant turns over synthetic context.
 */

import type { Attachment, AttachmentMessage } from "./attachments";
import { buildAttachmentMessage } from "./attachments";
import {
  compactMessages,
  estimateTokens,
  type CompactMessagesOptions,
  type CompactionResult,
} from "@/modules/chat/pipeline/message-compaction";

// ---------------------------------------------------------------------------
// Shared message shape (mirrors ChatMessageLike from message-compaction)
// ---------------------------------------------------------------------------

export type PipelineMessage = {
  role: string;
  content: UntypedJson;
  /** When true the message was injected by the pipeline, not the user. */
  isMeta?: boolean;
};

// ---------------------------------------------------------------------------
// User-context types
// ---------------------------------------------------------------------------

export type UserContext = {
  /** ISO-8601 date string (e.g. "2026-04-02"). */
  currentDate?: string;
  /** Short git status summary for the current working tree. */
  gitStatus?: string;
  /** Running session cost summary when credit tracking is enabled. */
  sessionCost?: string;
  /** Project-level instructions (from project config or instruction files). */
  projectInstructions?: string;
};

// ---------------------------------------------------------------------------
// Prepare options & result
// ---------------------------------------------------------------------------

export type PrepareMessagesOptions = {
  /** User-context fields to prepend as a system-reminder. */
  userContext?: UserContext;
  /** Attachments to inject after the user-context message. */
  attachments?: Attachment[];
  /**
   * Maximum context-window size in estimated tokens.
   * When set, the builder delegates to `compactMessages` if the prepared
   * conversation exceeds this limit.
   */
  contextLimit?: number;
  /** Forwarded to the compaction layer. */
  compactionOptions?: CompactMessagesOptions;
};

export type PrepareMessagesResult = {
  messages: PipelineMessage[];
  /** Number of meta messages injected (context + attachments). */
  injectedCount: number;
  /** Estimated token count of the final message array. */
  estimatedTokens: number;
  /** Non-null when compaction was triggered. */
  compaction: CompactionResult | null;
};

// ---------------------------------------------------------------------------
// 1. prependUserContext
// ---------------------------------------------------------------------------

/**
 * Inject a `system-reminder` user message at the head of the conversation
 * containing date, git status, session cost, and project instructions.
 *
 * Returns the original array untouched when no context fields are provided.
 */
export function prependUserContext(
  messages: PipelineMessage[],
  context: UserContext,
): PipelineMessage[] {
  const sections: string[] = [];

  if (context.currentDate) {
    sections.push(`# currentDate\nToday's date is ${context.currentDate}.`);
  }
  if (context.gitStatus) {
    sections.push(`# gitStatus\n${context.gitStatus}`);
  }
  if (context.sessionCost) {
    sections.push(`# sessionCost\n${context.sessionCost}`);
  }
  if (context.projectInstructions) {
    sections.push(`# projectInstructions\n${context.projectInstructions}`);
  }

  if (sections.length === 0) {
    return messages;
  }

  const body = [
    "<system-reminder>",
    "As you answer the user's questions, you can use the following context:",
    ...sections,
    "",
    "IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.",
    "</system-reminder>",
  ].join("\n");

  const contextMessage: PipelineMessage = {
    role: "user",
    content: body,
    isMeta: true,
  };

  return [contextMessage, ...messages];
}

// ---------------------------------------------------------------------------
// 2. injectAttachments
// ---------------------------------------------------------------------------

/**
 * Insert attachment messages (memory, skill, MCP resource, project instructions)
 * immediately after any leading meta messages so they sit between the
 * system-reminder context block and the first real user turn.
 */
export function injectAttachments(
  messages: PipelineMessage[],
  attachments: Attachment[],
): PipelineMessage[] {
  if (attachments.length === 0) {
    return messages;
  }

  const attachmentMessages: AttachmentMessage[] = attachments.map(buildAttachmentMessage);

  // Find the insertion point: right after leading meta messages.
  let insertIndex = 0;
  for (let i = 0; i < messages.length; i++) {
    if ((messages[i] as PipelineMessage | undefined)?.isMeta) {
      insertIndex = i + 1;
    } else {
      break;
    }
  }

  return [
    ...messages.slice(0, insertIndex),
    ...attachmentMessages,
    ...messages.slice(insertIndex),
  ];
}

// ---------------------------------------------------------------------------
// 3. prepareMessages (full pipeline)
// ---------------------------------------------------------------------------

/**
 * Full message preparation pipeline:
 *
 * 1. Prepend user context (date, git status, cost, instructions).
 * 2. Inject attachment messages (memory, skills, MCP resources).
 * 3. If a `contextLimit` is provided and the conversation exceeds it,
 *    delegate to {@link compactMessages} to trim older turns.
 * 4. Return prepared messages with metadata.
 */
export async function prepareMessages(
  messages: PipelineMessage[],
  options: PrepareMessagesOptions = {},
): Promise<PrepareMessagesResult> {
  const { userContext, attachments, contextLimit, compactionOptions } = options;

  // Step 1 — user context
  let prepared = userContext
    ? prependUserContext(messages, userContext)
    : [...messages];

  // Step 2 — attachments
  if (attachments && attachments.length > 0) {
    prepared = injectAttachments(prepared, attachments);
  }

  const injectedCount = prepared.length - messages.length;

  // Step 3 — compaction (optional)
  let compaction: CompactionResult | null = null;

  if (contextLimit != null && contextLimit > 0) {
    const estimated = estimateTokens(prepared);

    if (estimated > contextLimit) {
      compaction = await compactMessages(prepared, contextLimit, compactionOptions);
      prepared = compaction.messages as PipelineMessage[];
    }
  }

  return {
    messages: prepared,
    injectedCount,
    estimatedTokens: estimateTokens(prepared),
    compaction,
  };
}
