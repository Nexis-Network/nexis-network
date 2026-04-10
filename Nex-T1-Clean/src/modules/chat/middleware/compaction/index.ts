/**
 * Auto-Compaction Engine
 *
 * Context window management via microcompaction and full summarization.
 */

export {
  estimateTokens,
  estimateMessagesTokens,
  microcompact,
  buildCompactionPrompt,
  compactMessages,
  shouldAutoCompact,
  recordCompactionResult,
  markCompactionInProgress,
  clearSessionState,
  getActiveSessionCount,
} from "./engine";

export type {
  CompactionConfig,
  CompactionResult,
} from "./types";
