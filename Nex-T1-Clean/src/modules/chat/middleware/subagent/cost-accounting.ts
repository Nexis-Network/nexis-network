/**
 * Nex Subagent Cost Accounting -- Per-Subagent Cost Tracking
 *
 * Per-subagent cost tracking that integrates with the parent session's
 * SessionCostTracker. Each subagent accumulates its own usage.
 *
 * Aggregation and cleanup are in ./cost-aggregation.ts.
 *
 * Bounded: maximum 200 tracked subagent entries.
 * Eviction policy: only terminated (inactive) entries are evicted.
 */

import {
  SessionCostTracker,
  type SessionCostSummary,
} from "../cost-tracker";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubagentCostEntry = {
  /** Subagent identifier */
  agentId: string;
  /** Parent session this subagent belongs to */
  parentSessionId: string;
  /** Dedicated tracker for this subagent's costs */
  tracker: SessionCostTracker;
  /** Timestamp of creation (for eviction ordering) */
  createdAt: number;
  /** Whether this subagent is still actively running */
  active: boolean;
};

export type SubagentCostSummary = {
  agentId: string;
  parentSessionId: string;
  totalCostUsd: number;
  totalTokens: number;
  turnCount: number;
  /** Full session-level breakdown if needed */
  details: SessionCostSummary;
};

// ---------------------------------------------------------------------------
// Internal State
// ---------------------------------------------------------------------------

/**
 * Maximum subagent cost entries tracked. When exceeded, the oldest
 * INACTIVE entries are evicted to prevent unbounded memory growth.
 */
const MAX_SUBAGENT_ENTRIES = 200;

const subagentCostEntries = new Map<string, SubagentCostEntry>();
const parentToSubagents = new Map<string, Set<string>>();

// ---------------------------------------------------------------------------
// Internal Accessors (for cost-aggregation.ts)
// ---------------------------------------------------------------------------

/** @internal Used by cost-aggregation.ts for cleanup and queries. */
export function _getSubagentCostEntries(): Map<string, SubagentCostEntry> {
  return subagentCostEntries;
}

/** @internal Used by cost-aggregation.ts for parent lookups. */
export function _getParentToSubagents(): Map<string, Set<string>> {
  return parentToSubagents;
}

// ---------------------------------------------------------------------------
// Eviction
// ---------------------------------------------------------------------------

/**
 * Evicts the oldest INACTIVE cost entry if the map exceeds the limit.
 * Active subagent entries are never evicted.
 */
function evictOldestInactiveIfNeeded(): void {
  if (subagentCostEntries.size < MAX_SUBAGENT_ENTRIES) return;

  let oldestId: string | null = null;
  let oldestTime = Infinity;

  for (const [id, entry] of subagentCostEntries) {
    if (!entry.active && entry.createdAt < oldestTime) {
      oldestTime = entry.createdAt;
      oldestId = id;
    }
  }

  if (oldestId) {
    const entry = subagentCostEntries.get(oldestId);
    if (entry) {
      const siblings = parentToSubagents.get(entry.parentSessionId);
      siblings?.delete(oldestId);
      if (siblings?.size === 0) {
        parentToSubagents.delete(entry.parentSessionId);
      }
    }
    subagentCostEntries.delete(oldestId);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates a dedicated cost tracker for a subagent, linked to its parent.
 *
 * @param parentSessionId - The parent session to aggregate costs into
 * @param agentId - The subagent's unique identifier
 * @returns The subagent's SessionCostTracker
 */
export function createSubagentCostTracker(
  parentSessionId: string,
  agentId: string,
): SessionCostTracker {
  evictOldestInactiveIfNeeded();

  const tracker = new SessionCostTracker(agentId);

  const entry: SubagentCostEntry = {
    agentId,
    parentSessionId,
    tracker,
    createdAt: Date.now(),
    active: true,
  };

  subagentCostEntries.set(agentId, entry);

  let siblings = parentToSubagents.get(parentSessionId);
  if (!siblings) {
    siblings = new Set();
    parentToSubagents.set(parentSessionId, siblings);
  }
  siblings.add(agentId);

  return tracker;
}

/**
 * Marks a subagent's cost entry as inactive, making it eligible for
 * eviction. Call this when a subagent is terminated.
 */
export function markSubagentInactive(agentId: string): void {
  const entry = subagentCostEntries.get(agentId);
  if (entry) {
    entry.active = false;
  }
}

/**
 * Returns the cost summary for a single subagent.
 */
export function getSubagentCostSummary(
  agentId: string,
): SubagentCostSummary | null {
  const entry = subagentCostEntries.get(agentId);
  if (!entry) return null;

  const details = entry.tracker.getSummary();

  return {
    agentId: entry.agentId,
    parentSessionId: entry.parentSessionId,
    totalCostUsd: details.totalCostUsd,
    totalTokens: details.totalInputTokens + details.totalOutputTokens,
    turnCount: details.turnCount,
    details,
  };
}

/**
 * Records a turn's usage into the subagent's cost tracker.
 */
export function recordSubagentTurn(
  agentId: string,
  args: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens?: number;
    cacheCreationInputTokens?: number;
    reasoningTokens?: number;
    durationMs: number;
  },
): void {
  const entry = subagentCostEntries.get(agentId);
  if (!entry) return;

  entry.tracker.recordTurn(args);
}
