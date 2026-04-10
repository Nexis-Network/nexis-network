/**
 * QueryEngine Lifecycle Hooks Integration
 *
 * Connects the middleware hook dispatcher to QueryEngine lifecycle events.
 * Each function wraps dispatcher calls with proper input construction,
 * error handling, and fail-open semantics (errors are logged, never crash
 * the pipeline).
 */

import { logger } from "@/lib/logger";
import {
  executeSessionStartHooks,
  executeSessionEndHooks,
  executeStopHooks as dispatchStopHooks,
  executePreCompactHooks,
  executePostCompactHooks,
} from "../middleware/dispatcher";
import type { AggregatedHookResult } from "../middleware/types";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type LifecycleHookResult = {
  /** True if any hook blocked the operation */
  blocked: boolean;
  /** Merged additional context injected by hooks */
  additionalContext: string | null;
  /** System messages from all hooks */
  systemMessages: string[];
};

// ---------------------------------------------------------------------------
// Session stats (passed to end / stop hooks)
// ---------------------------------------------------------------------------

export type SessionStats = {
  totalTurns: number;
  totalToolCalls: number;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toLifecycleResult(
  aggregated: AggregatedHookResult,
): LifecycleHookResult {
  return {
    blocked: aggregated.blocked || aggregated.preventContinuation,
    additionalContext: aggregated.additionalContext,
    systemMessages: aggregated.systemMessages,
  };
}

const EMPTY_RESULT: LifecycleHookResult = {
  blocked: false,
  additionalContext: null,
  systemMessages: [],
};

/**
 * Safely executes an async hook dispatcher, returning EMPTY_RESULT on error.
 * Guarantees fail-open: exceptions are logged and never propagate.
 */
async function safeDispatch(
  label: string,
  fn: () => Promise<AggregatedHookResult>,
): Promise<LifecycleHookResult> {
  try {
    const aggregated = await fn();
    return toLifecycleResult(aggregated);
  } catch (error) {
    logger.error(`Lifecycle hook failed (${label})`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return EMPTY_RESULT;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Dispatches SessionStart hooks at the beginning of a conversation session.
 * Returns additional context that should be prepended to the system prompt.
 */
export async function runSessionStartHooks(
  sessionId: string | null,
  userId: string | null,
  projectRoot?: string,
): Promise<LifecycleHookResult> {
  return safeDispatch("SessionStart", () =>
    executeSessionStartHooks({ sessionId, userId, projectRoot }),
  );
}

/**
 * Dispatches SessionEnd hooks when a conversation session concludes.
 * Includes turn and tool-call counts for analytics hooks.
 */
export async function runSessionEndHooks(
  sessionId: string | null,
  userId: string | null,
  stats: SessionStats,
  projectRoot?: string,
): Promise<LifecycleHookResult> {
  return safeDispatch("SessionEnd", () =>
    executeSessionEndHooks({
      sessionId,
      userId,
      totalTurns: stats.totalTurns,
      totalToolCalls: stats.totalToolCalls,
      projectRoot,
    }),
  );
}

/**
 * Dispatches Stop hooks after the assistant finishes a turn.
 * Hooks may prevent continuation or inject additional context for follow-up.
 */
export async function runStopHooks(
  sessionId: string | null,
  userId: string | null,
  assistantResponse: string,
  stats: SessionStats & { turnNumber: number },
  projectRoot?: string,
): Promise<LifecycleHookResult> {
  return safeDispatch("Stop", () =>
    dispatchStopHooks({
      sessionId,
      userId,
      assistantResponse,
      toolCallsCount: stats.totalToolCalls,
      turnNumber: stats.turnNumber,
      projectRoot,
    }),
  );
}

/**
 * Dispatches PreCompact hooks before conversation history compaction.
 * Hooks may inject context that should survive the compaction step.
 */
export async function runPreCompactHooks(
  sessionId: string | null,
  userId: string | null,
  projectRoot?: string,
): Promise<LifecycleHookResult> {
  return safeDispatch("PreCompact", () =>
    executePreCompactHooks({ sessionId, userId, projectRoot }),
  );
}

/**
 * Dispatches PostCompact hooks after conversation history compaction.
 * Hooks may inject context based on what the compacted state looks like.
 */
export async function runPostCompactHooks(
  sessionId: string | null,
  userId: string | null,
  projectRoot?: string,
): Promise<LifecycleHookResult> {
  return safeDispatch("PostCompact", () =>
    executePostCompactHooks({ sessionId, userId, projectRoot }),
  );
}
