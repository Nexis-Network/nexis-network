/**
 * Nex Subagent Lifecycle -- Creation and Execution
 * Active subagent tracking is in ./tracker.ts.
 */

import { randomUUID } from "node:crypto";
import { setMaxListeners } from "node:events";

import type { AgentContext, NexAgentType } from "./context";
import { runWithAgentContext } from "./context";
import { createSubagentCostTracker, markSubagentInactive } from "./cost-accounting";
import {
  activeSubagents,
  pendingCreations,
  incrementPending,
  decrementPending,
  MAX_CONCURRENT_SUBAGENTS,
} from "./tracker";

// ---------------------------------------------------------------------------
// Configuration Types
// ---------------------------------------------------------------------------

/**
 * Configuration for spawning a new subagent.
 */
export type SubagentConfig = {
  /** Model identifier for inference (e.g., "openai/gpt-4.1-mini") */
  model: string;
  /** Maximum number of inference turns before forced termination */
  maxTurns: number;
  /** Maximum cost in USD before forced termination (0 = unlimited) */
  maxBudgetUsd: number;
  /** Tools the subagent is permitted to invoke (empty = all non-denied) */
  toolPermissions: string[];
  /** Parent session ID for cost aggregation and context linking */
  parentSessionId: string;
  /** Subagent type classification */
  agentType?: NexAgentType;
  /** Human-readable label for logging and analytics */
  label?: string;
  /** Parent's AbortController — child will be linked to this */
  parentAbortController?: AbortController;
};

/**
 * Result returned when a subagent completes (success or failure).
 */
export type SubagentResult = {
  /** Terminal status of the subagent */
  status: "completed" | "failed" | "aborted" | "budget_exceeded";
  /** Final text output from the subagent */
  text: string;
  /** Usage and cost metrics */
  usage: {
    /** Total tokens consumed (input + output) */
    tokens: number;
    /** Wall-clock duration in milliseconds */
    durationMs: number;
    /** Estimated cost in USD */
    costUsd: number;
  };
  /** The agent ID for correlation */
  agentId: string;
};

// ---------------------------------------------------------------------------
// Child AbortController
// ---------------------------------------------------------------------------

/**
 * Default max listeners for subagent abort controllers.
 * Higher than Node default (10) to support tool chains.
 */
const ABORT_CONTROLLER_MAX_LISTENERS = 50;

/**
 * Creates a child AbortController that aborts when the parent aborts.
 * Aborting the child does NOT affect the parent.
 *
 * The child listener on the parent signal is cleaned up when the child
 * is aborted (from any source), preventing listener leaks.
 */
function createChildAbortController(parent?: AbortController): AbortController {
  const child = new AbortController();
  setMaxListeners(ABORT_CONTROLLER_MAX_LISTENERS, child.signal);

  if (!parent) return child;

  // Handle case where parent is already aborted before child creation
  if (parent.signal.aborted) {
    child.abort(parent.signal.reason);
    return child;
  }

  const handler = () => {
    if (!child.signal.aborted) {
      child.abort(parent.signal.reason);
    }
  };

  parent.signal.addEventListener("abort", handler, { once: true });

  // Cleanup: remove parent listener when child is aborted from any source
  child.signal.addEventListener(
    "abort",
    () => {
      parent.signal.removeEventListener("abort", handler);
    },
    { once: true },
  );

  return child;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates a new subagent with an isolated context and registers it
 * in the active subagent tracker.
 *
 * @param config - Subagent spawn configuration
 * @returns The created AgentContext and a cleanup handle
 * @throws Error if MAX_CONCURRENT_SUBAGENTS is exceeded
 */
export function createSubagent(config: SubagentConfig): {
  context: AgentContext;
  abortController: AbortController;
  agentId: string;
} {
  const effectiveCount = activeSubagents.size + pendingCreations;
  if (effectiveCount >= MAX_CONCURRENT_SUBAGENTS) {
    throw new Error(
      `Subagent limit reached (${MAX_CONCURRENT_SUBAGENTS}). ` +
        `Active: ${activeSubagents.size}, pending: ${pendingCreations}. ` +
        `Terminate existing subagents before spawning new ones.`,
    );
  }

  incrementPending();

  try {
    const agentId = `nex-sub-${randomUUID().slice(0, 8)}`;
    const abortController = createChildAbortController(config.parentAbortController);

    const context: AgentContext = {
      agentId,
      parentSessionId: config.parentSessionId,
      agentType: config.agentType ?? "general",
      toolPermissions: Object.freeze([...config.toolPermissions]),
      model: config.model,
      abortSignal: abortController.signal,
      createdAt: Date.now(),
      label: config.label,
    };

    createSubagentCostTracker(config.parentSessionId, agentId);

    activeSubagents.set(agentId, {
      agentId,
      context,
      abortController,
      startedAt: Date.now(),
      config,
    });

    return { context, abortController, agentId };
  } finally {
    decrementPending();
  }
}

/**
 * Runs an async function within a subagent's isolated context.
 * On completion (success or failure), the subagent is properly terminated.
 *
 * @param config - Subagent configuration
 * @param fn - The async work to execute in the subagent context
 * @returns The result of `fn`, executed within the isolated context
 */
export async function runAsSubagent<T>(
  config: SubagentConfig,
  fn: (context: AgentContext) => Promise<T>,
): Promise<T> {
  const { context, abortController, agentId } = createSubagent(config);

  try {
    return await runWithAgentContext(context, () => fn(context));
  } finally {
    if (activeSubagents.has(agentId)) {
      if (!abortController.signal.aborted) {
        abortController.abort(new Error("Subagent execution completed"));
      }
      markSubagentInactive(agentId);
      activeSubagents.delete(agentId);
    }
  }
}
