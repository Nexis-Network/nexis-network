/** Typed convenience wrappers around dispatchHooks for each event type. */

import { dispatchHooks } from "./dispatcher";
import type { AggregatedHookResult } from "./types";

/** Dispatches PreToolUse hooks for a tool invocation. */
export async function executePreToolHooks(args: {
  toolName: string;
  toolInput: UntypedJson;
  toolCategory: string;
  requiresApproval: boolean;
  sessionId: string | null;
  userId: string | null;
  projectRoot?: string;
}): Promise<AggregatedHookResult> {
  return dispatchHooks(
    "PreToolUse",
    {
      hook_event_name: "PreToolUse",
      tool_name: args.toolName,
      tool_input: args.toolInput,
      tool_category: args.toolCategory,
      requires_approval: args.requiresApproval,
      session_id: args.sessionId,
      user_id: args.userId,
      timestamp: new Date().toISOString(),
    },
    args.projectRoot,
  );
}

/** Dispatches PostToolUse hooks after a successful tool invocation. */
export async function executePostToolHooks(args: {
  toolName: string;
  toolInput: UntypedJson;
  toolOutput: UntypedJson;
  toolCategory: string;
  durationMs: number;
  sessionId: string | null;
  userId: string | null;
  projectRoot?: string;
}): Promise<AggregatedHookResult> {
  return dispatchHooks(
    "PostToolUse",
    {
      hook_event_name: "PostToolUse",
      tool_name: args.toolName,
      tool_input: args.toolInput,
      tool_output: args.toolOutput,
      tool_category: args.toolCategory,
      duration_ms: args.durationMs,
      session_id: args.sessionId,
      user_id: args.userId,
      timestamp: new Date().toISOString(),
    },
    args.projectRoot,
  );
}

/** Dispatches PostToolUseFailure hooks after a failed tool invocation. */
export async function executePostToolFailureHooks(args: {
  toolName: string;
  toolInput: UntypedJson;
  errorMessage: string;
  errorCategory: string;
  sessionId: string | null;
  userId: string | null;
  projectRoot?: string;
}): Promise<AggregatedHookResult> {
  return dispatchHooks(
    "PostToolUseFailure",
    {
      hook_event_name: "PostToolUseFailure",
      tool_name: args.toolName,
      tool_input: args.toolInput,
      error_message: args.errorMessage,
      error_category: args.errorCategory,
      session_id: args.sessionId,
      user_id: args.userId,
      timestamp: new Date().toISOString(),
    },
    args.projectRoot,
  );
}

/** Dispatches Stop hooks when the assistant finishes a turn. */
export async function executeStopHooks(args: {
  assistantResponse: string;
  toolCallsCount: number;
  turnNumber: number;
  sessionId: string | null;
  userId: string | null;
  projectRoot?: string;
}): Promise<AggregatedHookResult> {
  return dispatchHooks(
    "Stop",
    {
      hook_event_name: "Stop",
      assistant_response: args.assistantResponse,
      tool_calls_count: args.toolCallsCount,
      turn_number: args.turnNumber,
      session_id: args.sessionId,
      user_id: args.userId,
      timestamp: new Date().toISOString(),
    },
    args.projectRoot,
  );
}

/**
 * Dispatches SessionStart hooks at the beginning of a conversation session.
 */
export async function executeSessionStartHooks(args: {
  sessionId: string | null;
  userId: string | null;
  projectRoot?: string;
}): Promise<AggregatedHookResult> {
  return dispatchHooks(
    "SessionStart",
    {
      hook_event_name: "SessionStart",
      session_id: args.sessionId,
      user_id: args.userId,
      timestamp: new Date().toISOString(),
    },
    args.projectRoot,
  );
}

/**
 * Dispatches SessionEnd hooks at the end of a conversation session.
 */
export async function executeSessionEndHooks(args: {
  totalTurns: number;
  totalToolCalls: number;
  sessionId: string | null;
  userId: string | null;
  projectRoot?: string;
}): Promise<AggregatedHookResult> {
  return dispatchHooks(
    "SessionEnd",
    {
      hook_event_name: "SessionEnd",
      total_turns: args.totalTurns,
      total_tool_calls: args.totalToolCalls,
      session_id: args.sessionId,
      user_id: args.userId,
      timestamp: new Date().toISOString(),
    },
    args.projectRoot,
  );
}

/**
 * Dispatches PreCompact hooks before conversation history compaction.
 */
export async function executePreCompactHooks(args: {
  sessionId: string | null;
  userId: string | null;
  projectRoot?: string;
}): Promise<AggregatedHookResult> {
  return dispatchHooks(
    "PreCompact",
    {
      hook_event_name: "PreCompact",
      session_id: args.sessionId,
      user_id: args.userId,
      timestamp: new Date().toISOString(),
    },
    args.projectRoot,
  );
}

/**
 * Dispatches PostCompact hooks after conversation history compaction.
 */
export async function executePostCompactHooks(args: {
  sessionId: string | null;
  userId: string | null;
  projectRoot?: string;
}): Promise<AggregatedHookResult> {
  return dispatchHooks(
    "PostCompact",
    {
      hook_event_name: "PostCompact",
      session_id: args.sessionId,
      user_id: args.userId,
      timestamp: new Date().toISOString(),
    },
    args.projectRoot,
  );
}
