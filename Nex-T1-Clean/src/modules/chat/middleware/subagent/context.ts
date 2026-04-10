/**
 * Nex Subagent Context Isolation
 *
 * AsyncLocalStorage-based context isolation for subagent execution.
 * Each subagent runs in its own isolated async context so concurrent
 * subagents never interfere with each other's state.
 *
 * Pattern adapted from enterprise agent orchestration:
 * - AsyncLocalStorage ensures each async execution chain has its own context
 * - Concurrent subagents (backgrounded or parallel) remain isolated
 * - Parent context is never mutated by subagent operations
 */

import { AsyncLocalStorage } from "node:async_hooks";

// ---------------------------------------------------------------------------
// Agent Types
// ---------------------------------------------------------------------------

/**
 * Discriminated agent types supported by the subagent system.
 * - "worker": Specialized task executor (e.g., research, code, deploy)
 * - "coordinator": Manages multi-step workflows and dependencies
 * - "analyst": Domain-specific analysis (crypto, market, social)
 * - "general": General-purpose subagent
 */
export type NexAgentType = "worker" | "coordinator" | "analyst" | "general";

// ---------------------------------------------------------------------------
// Agent Context
// ---------------------------------------------------------------------------

/**
 * Immutable context carried through the async execution chain of a subagent.
 * Retrieved via `getCurrentAgentContext()` from any point in the call stack.
 */
export type AgentContext = {
  /** Unique identifier for this subagent instance */
  readonly agentId: string;
  /** Session ID of the parent that spawned this subagent */
  readonly parentSessionId: string;
  /** Categorization of this subagent's role */
  readonly agentType: NexAgentType;
  /** Tools this subagent is permitted to invoke */
  readonly toolPermissions: ReadonlyArray<string>;
  /** Model identifier the subagent should use for inference */
  readonly model: string;
  /** Abort signal linked to parent — propagates cancellation */
  readonly abortSignal: AbortSignal;
  /** Timestamp when the subagent context was created */
  readonly createdAt: number;
  /** Optional human-readable label for logging/analytics */
  readonly label?: string;
};

// ---------------------------------------------------------------------------
// AsyncLocalStorage Instance
// ---------------------------------------------------------------------------

const agentContextStorage = new AsyncLocalStorage<AgentContext>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Runs an async function within an isolated subagent context.
 * All async operations called from `fn` will inherit this context
 * via `getCurrentAgentContext()`.
 *
 * @param context - The agent context to bind to this execution chain
 * @param fn - The function to execute within the isolated context
 * @returns The return value of `fn`
 */
export function runWithAgentContext<T>(context: AgentContext, fn: () => T): T {
  return agentContextStorage.run(context, fn);
}

/**
 * Retrieves the current subagent context from AsyncLocalStorage.
 * Returns `undefined` when called outside of a `runWithAgentContext` scope
 * (i.e., on the main/parent execution path).
 */
export function getCurrentAgentContext(): AgentContext | undefined {
  return agentContextStorage.getStore();
}

/**
 * Returns `true` when the current execution is inside a subagent context.
 * Useful as a lightweight boolean guard when the full context is not needed.
 */
export function isSubagent(): boolean {
  return agentContextStorage.getStore() !== undefined;
}

/**
 * Returns the current agent ID, or `undefined` if not in a subagent context.
 * Convenience accessor for logging and analytics attribution.
 */
export function getCurrentAgentId(): string | undefined {
  return agentContextStorage.getStore()?.agentId;
}
