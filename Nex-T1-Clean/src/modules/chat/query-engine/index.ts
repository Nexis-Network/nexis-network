/**
 * Query Engine — Public API
 *
 * Barrel export for the query-engine module. Re-exports all public
 * types, classes, and functions that consumers need.
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type {
  BudgetDecision,
  StepUsage,
  BudgetConfig,
  BudgetSummary,
  QueryConfig,
  QueryResult,
} from "./types";

// ---------------------------------------------------------------------------
// Budget controller
// ---------------------------------------------------------------------------

export { BudgetController } from "./budget";

// ---------------------------------------------------------------------------
// Session state management
// ---------------------------------------------------------------------------

export {
  createSession,
  updateSession,
  getSession,
  onSessionChange,
  getSessionSummary,
  removeSession,
  getActiveSessionCount,
  destroySessionStore,
} from "./session";

export type {
  SessionStatus,
  SessionState,
  SessionSummary,
} from "./session";

// ---------------------------------------------------------------------------
// Lifecycle hooks integration
// ---------------------------------------------------------------------------

export {
  runSessionStartHooks,
  runSessionEndHooks,
  runStopHooks,
  runPreCompactHooks,
  runPostCompactHooks,
} from "./lifecycle-hooks";

export type {
  LifecycleHookResult,
  SessionStats,
} from "./lifecycle-hooks";

// ---------------------------------------------------------------------------
// Lifecycle callbacks
// ---------------------------------------------------------------------------

export {
  createOnAgentFinish,
  createOnStepFinish,
} from "./lifecycle-callbacks";

export type {
  AgentFinishDeps,
  StepFinishDeps,
} from "./lifecycle-callbacks";

// ---------------------------------------------------------------------------
// Integration layer
// ---------------------------------------------------------------------------

export { createQueryEngineStream } from "./integration";

export type {
  QueryEngineStreamHandles,
  QueryEngineBudgetOverrides,
} from "./integration";

// ---------------------------------------------------------------------------
// Query engine orchestrator
// ---------------------------------------------------------------------------

export { QueryEngine } from "./engine";
