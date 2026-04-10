/**
 * Nex Subagent Cost Aggregation -- Parent Session Rollup and Cleanup
 *
 * Aggregates per-subagent costs into parent session summaries
 * and handles eviction of inactive cost entries.
 */

import type { SubagentCostSummary } from "./cost-accounting";
import {
  getSubagentCostSummary,
  _getSubagentCostEntries,
  _getParentToSubagents,
} from "./cost-accounting";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Aggregates all subagent costs for a parent session.
 *
 * This is idempotent -- calling it multiple times recalculates from
 * the subagent trackers each time (no double-counting).
 *
 * @param parentSessionId - The parent session to aggregate into
 * @returns Aggregate cost summary across all subagents
 */
export function aggregateSubagentCosts(parentSessionId: string): {
  totalCostUsd: number;
  totalTokens: number;
  subagentCount: number;
  breakdown: SubagentCostSummary[];
} {
  const parentToSubagents = _getParentToSubagents();
  const agentIds = parentToSubagents.get(parentSessionId);
  if (!agentIds || agentIds.size === 0) {
    return { totalCostUsd: 0, totalTokens: 0, subagentCount: 0, breakdown: [] };
  }

  let totalCostUsd = 0;
  let totalTokens = 0;
  const breakdown: SubagentCostSummary[] = [];

  for (const agentId of agentIds) {
    const summary = getSubagentCostSummary(agentId);
    if (summary) {
      totalCostUsd += summary.totalCostUsd;
      totalTokens += summary.totalTokens;
      breakdown.push(summary);
    }
  }

  return {
    totalCostUsd,
    totalTokens,
    subagentCount: agentIds.size,
    breakdown,
  };
}

/**
 * Removes all cost tracking entries for a parent session's subagents.
 * Called during session cleanup.
 */
export function clearSubagentCosts(parentSessionId: string): void {
  const parentToSubagents = _getParentToSubagents();
  const subagentCostEntries = _getSubagentCostEntries();
  const agentIds = parentToSubagents.get(parentSessionId);
  if (!agentIds) return;

  for (const agentId of agentIds) {
    subagentCostEntries.delete(agentId);
  }
  parentToSubagents.delete(parentSessionId);
}

/**
 * Returns the total number of tracked subagent cost entries.
 * Useful for monitoring.
 */
export function getTrackedSubagentCount(): number {
  return _getSubagentCostEntries().size;
}
