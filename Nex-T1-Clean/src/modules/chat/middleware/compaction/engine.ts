/**
 * Auto-Compaction Engine — Core
 *
 * Session state management and auto-compaction trigger logic.
 * Token estimation, microcompaction, and summarization are in
 * separate modules (estimation.ts, microcompact.ts, summarize.ts).
 */

import type { ModelMessage } from "ai";
import type { CompactionConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { estimateMessagesTokens } from "./estimation";

// ---------------------------------------------------------------------------
// Re-exports for barrel compatibility
// ---------------------------------------------------------------------------

export { estimateTokens, estimateMessagesTokens } from "./estimation";
export { microcompact } from "./microcompact";
export { buildCompactionPrompt, compactMessages } from "./summarize";
export type { CompactionConfig, CompactionResult } from "./types";

// ---------------------------------------------------------------------------
// Auto-compaction trigger
// ---------------------------------------------------------------------------

/**
 * Maximum number of session state entries to retain.
 * When exceeded, the oldest entries are evicted to prevent unbounded growth.
 */
const MAX_SESSION_STATES = 1_000;

type CompactionState = {
  estimatedTokens: number;
  consecutiveFailures: number;
  inProgress: boolean;
};

const sessionStates = new Map<string, CompactionState>();

const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Evicts the oldest session state entries when the map exceeds the size limit.
 * Map iteration order in JS is insertion order, so the first entries are oldest.
 */
function evictStaleSessionStates(): void {
  if (sessionStates.size <= MAX_SESSION_STATES) return;

  const excess = sessionStates.size - MAX_SESSION_STATES;
  const keys = Array.from(sessionStates.keys());
  for (let i = 0; i < excess && i < keys.length; i++) {
    sessionStates.delete(keys[i]);
  }
}

function getOrCreateState(sessionId: string): CompactionState {
  return sessionStates.get(sessionId) ?? {
    estimatedTokens: 0,
    consecutiveFailures: 0,
    inProgress: false,
  };
}

/**
 * Checks if auto-compaction should be triggered.
 * Returns true if estimated tokens exceed the threshold.
 */
export function shouldAutoCompact(
  sessionId: string,
  messages: ModelMessage[],
  config: Partial<CompactionConfig> = {},
): boolean {
  const state = getOrCreateState(sessionId);

  if (state.inProgress) return false;
  if (state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) return false;

  const contextWindow = config.contextWindow ?? DEFAULT_CONFIG.contextWindow;
  const maxOutput = config.maxOutputTokens ?? DEFAULT_CONFIG.maxOutputTokens;
  const buffer = config.bufferTokens ?? DEFAULT_CONFIG.bufferTokens;

  const threshold = contextWindow - maxOutput - buffer;
  const estimated = estimateMessagesTokens(messages);

  state.estimatedTokens = estimated;
  sessionStates.set(sessionId, state);
  evictStaleSessionStates();

  return estimated > threshold;
}

/**
 * Records compaction attempt result.
 */
export function recordCompactionResult(
  sessionId: string,
  success: boolean,
): void {
  const state = getOrCreateState(sessionId);

  state.inProgress = false;
  if (success) {
    state.consecutiveFailures = 0;
  } else {
    state.consecutiveFailures++;
  }

  sessionStates.set(sessionId, state);
}

export function markCompactionInProgress(sessionId: string): void {
  const state = getOrCreateState(sessionId);
  state.inProgress = true;
  sessionStates.set(sessionId, state);
}

/**
 * Removes session state for a given session ID.
 * Call this when a session ends to prevent memory leaks.
 */
export function clearSessionState(sessionId: string): void {
  sessionStates.delete(sessionId);
}

/**
 * Returns the current number of tracked sessions.
 * Useful for monitoring and debugging.
 */
export function getActiveSessionCount(): number {
  return sessionStates.size;
}
