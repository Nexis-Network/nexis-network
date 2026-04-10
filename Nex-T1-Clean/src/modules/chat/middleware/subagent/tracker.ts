/**
 * Nex Subagent Tracker -- Active Subagent Map Management
 *
 * Maintains the bounded set of active subagents and provides
 * query, termination, and cleanup operations.
 */

import type { AgentContext, NexAgentType } from "./context";
import {
  getSubagentCostSummary,
  markSubagentInactive,
} from "./cost-accounting";
import { clearSubagentCosts } from "./cost-aggregation";
import type { SubagentConfig, SubagentResult } from "./lifecycle";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActiveSubagent = {
  agentId: string;
  context: AgentContext;
  abortController: AbortController;
  startedAt: number;
  config: SubagentConfig;
};

// ---------------------------------------------------------------------------
// Internal State
// ---------------------------------------------------------------------------

/**
 * Maximum concurrent subagents. Prevents runaway spawning from
 * consuming all available memory or connections.
 */
export const MAX_CONCURRENT_SUBAGENTS = 50;

export const activeSubagents = new Map<string, ActiveSubagent>();

/**
 * Synchronous concurrency guard. Incremented when a slot is reserved
 * (before any async work) and decremented if creation is rolled back.
 */
export let pendingCreations = 0;

export function incrementPending(): void {
  pendingCreations++;
}

export function decrementPending(): void {
  pendingCreations--;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Terminates a subagent by aborting its controller and removing it
 * from the active tracker. Also cleans up associated cost tracking data.
 *
 * @param agentId - The subagent to terminate
 * @returns The final cost summary, or null if the agent was not found
 */
export function terminateSubagent(agentId: string): SubagentResult | null {
  const entry = activeSubagents.get(agentId);
  if (!entry) return null;

  // Abort the subagent's execution chain
  if (!entry.abortController.signal.aborted) {
    entry.abortController.abort(new Error("Subagent terminated by parent"));
  }

  // Collect final cost summary before cleanup
  const costSummary = getSubagentCostSummary(agentId);
  const durationMs = Date.now() - entry.startedAt;

  // Mark cost entry as inactive (eligible for eviction) but preserve
  // the data for post-termination aggregation queries.
  markSubagentInactive(agentId);

  // Remove from active tracking
  activeSubagents.delete(agentId);

  return {
    status: "aborted",
    text: "",
    usage: {
      tokens: costSummary?.totalTokens ?? 0,
      durationMs,
      costUsd: costSummary?.totalCostUsd ?? 0,
    },
    agentId,
  };
}

/**
 * Returns the number of currently active subagents.
 */
export function getActiveSubagentCount(): number {
  return activeSubagents.size;
}

/**
 * Returns a snapshot of all active subagent IDs and their metadata.
 * Useful for monitoring and debugging.
 */
export function getActiveSubagents(): Array<{
  agentId: string;
  agentType: NexAgentType;
  model: string;
  startedAt: number;
  label?: string;
}> {
  return Array.from(activeSubagents.values()).map((entry) => ({
    agentId: entry.agentId,
    agentType: entry.context.agentType,
    model: entry.context.model,
    startedAt: entry.startedAt,
    label: entry.context.label,
  }));
}

/**
 * Terminates all active subagents and cleans up all cost tracking data.
 * Used during session cleanup or when the parent session is ending.
 *
 * @param parentSessionId - Optional: if provided, also clears cost data
 *   for all subagents belonging to this parent session
 * @returns The number of subagents terminated
 */
export function terminateAllSubagents(parentSessionId?: string): number {
  const count = activeSubagents.size;
  const ids = [...activeSubagents.keys()];

  for (const id of ids) {
    terminateSubagent(id);
  }

  // Clean up cost tracking for the parent session if provided
  if (parentSessionId) {
    clearSubagentCosts(parentSessionId);
  }

  return count;
}
