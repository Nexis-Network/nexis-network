/**
 * Nex Subagent Context Isolation System
 *
 * Provides AsyncLocalStorage-based context isolation, per-agent tool
 * permission scoping, lifecycle management with bounded concurrency,
 * and per-subagent cost tracking aggregated to parent sessions.
 *
 * @module subagent
 */

// ── Context Isolation ───────────────────────────────────────────────────
export type { AgentContext, NexAgentType } from "./context";
export {
  runWithAgentContext,
  getCurrentAgentContext,
  isSubagent,
  getCurrentAgentId,
} from "./context";

// ── Tool Permissions ────────────────────────────────────────────────────
export type { FilterableTool } from "./permissions";
export {
  DISALLOWED_SUBAGENT_TOOLS,
  canAgentUseTool,
  filterToolsForAgent,
  getDeniedToolsSummary,
} from "./permissions";

// ── Lifecycle Management ────────────────────────────────────────────────
export type { SubagentConfig, SubagentResult } from "./lifecycle";
export {
  createSubagent,
  runAsSubagent,
} from "./lifecycle";

// ── Active Subagent Tracking ───────────────────────────────────────────
export {
  terminateSubagent,
  getActiveSubagentCount,
  getActiveSubagents,
  terminateAllSubagents,
} from "./tracker";

// ── Cost Accounting ─────────────────────────────────────────────────────
export type { SubagentCostEntry, SubagentCostSummary } from "./cost-accounting";
export {
  createSubagentCostTracker,
  markSubagentInactive,
  getSubagentCostSummary,
  recordSubagentTurn,
} from "./cost-accounting";

// ── Cost Aggregation ───────────────────────────────────────────────────
export {
  aggregateSubagentCosts,
  clearSubagentCosts,
  getTrackedSubagentCount,
} from "./cost-aggregation";
