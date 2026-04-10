/**
 * Auto-Compaction Engine — Shared Types
 */

import type { ModelMessage } from "ai";

export type CompactionConfig = {
  /** Model's context window size in tokens */
  contextWindow: number;
  /** Maximum output tokens reserved for model response */
  maxOutputTokens: number;
  /** Buffer tokens before triggering auto-compact (default: 13000) */
  bufferTokens: number;
  /** Maximum tokens per tool result to keep (older results trimmed) */
  maxToolResultTokens: number;
  /**
   * Maximum number of messages to include in a compaction prompt.
   * Prevents the compaction prompt itself from overflowing context.
   */
  maxCompactionPromptMessages: number;
};

export type CompactionResult = {
  /** Compacted messages */
  messages: ModelMessage[];
  /** Number of messages preserved (not compacted) */
  preserved: number;
  /** Number of messages removed */
  removed: number;
  /** Whether compaction was performed */
  compacted: boolean;
  /** Summary generated during compaction */
  summary: string | null;
  /** Headlines of discarded messages */
  discardedHeadlines: string[];
};

export type CompactionState = {
  /** Estimated token count of current conversation */
  estimatedTokens: number;
  /** Number of consecutive compaction failures */
  consecutiveFailures: number;
  /** Whether auto-compaction is currently in progress */
  inProgress: boolean;
};

export const DEFAULT_CONFIG: CompactionConfig = {
  contextWindow: 128_000,
  maxOutputTokens: 8_192,
  bufferTokens: 13_000,
  maxToolResultTokens: 2_000,
  maxCompactionPromptMessages: 200,
};
