/**
 * Query Engine Types
 *
 * Core type definitions for the query engine budget enforcement system.
 * These types define the contract between the budget controller,
 * the cost tracker, and the query execution pipeline.
 */

// ---------------------------------------------------------------------------
// Budget Decision
// ---------------------------------------------------------------------------

/**
 * Outcome of a budget check after each query step.
 *
 * - 'continue'     : all limits are within bounds; proceed to next step.
 * - 'stop_turns'   : maximum turn count reached.
 * - 'stop_cost'    : cumulative USD cost exceeded the budget cap.
 * - 'stop_tokens'  : input or output token ceiling breached.
 */
export type BudgetDecision =
  | "continue"
  | "stop_turns"
  | "stop_cost"
  | "stop_tokens";

// ---------------------------------------------------------------------------
// Step Usage
// ---------------------------------------------------------------------------

/**
 * Token and cost usage recorded for a single query step (turn).
 * Mirrors the shape reported by the AI SDK usage callback.
 */
export type StepUsage = {
  /** Model identifier used in this step. */
  model: string;
  /** Number of non-cached input tokens consumed. */
  inputTokens: number;
  /** Number of output tokens generated. */
  outputTokens: number;
  /** Input tokens served from prompt cache. */
  cacheReadInputTokens: number;
  /** Input tokens written into prompt cache. */
  cacheCreationInputTokens: number;
  /** Reasoning/chain-of-thought tokens (if applicable). */
  reasoningTokens: number;
  /** Wall-clock duration of this step in milliseconds. */
  durationMs: number;
};

// ---------------------------------------------------------------------------
// Budget Config
// ---------------------------------------------------------------------------

/**
 * Per-query budget limits. Every field is optional; the BudgetController
 * fills in generous defaults for any omitted value.
 */
export type BudgetConfig = {
  /** Maximum number of LLM round-trips (turns) allowed. */
  maxTurns?: number;
  /** Maximum cumulative USD spend across all turns. */
  maxBudgetUsd?: number;
  /** Maximum cumulative input tokens (all categories combined). */
  maxInputTokens?: number;
  /** Maximum cumulative output tokens. */
  maxOutputTokens?: number;
};

// ---------------------------------------------------------------------------
// Budget Summary
// ---------------------------------------------------------------------------

/**
 * Snapshot of budget consumption at a point in time, used for
 * reporting and observability.
 */
export type BudgetSummary = {
  /** Budget limits in effect for this query. */
  limits: Required<BudgetConfig>;
  /** Number of turns completed so far. */
  turnsUsed: number;
  /** Cumulative USD cost so far. */
  costUsedUsd: number;
  /** Cumulative input tokens consumed so far. */
  inputTokensUsed: number;
  /** Cumulative output tokens generated so far. */
  outputTokensUsed: number;
  /** Fraction of turn budget consumed (0-1). */
  turnUtilization: number;
  /** Fraction of cost budget consumed (0-1). */
  costUtilization: number;
  /** Fraction of input token budget consumed (0-1). */
  inputTokenUtilization: number;
  /** Fraction of output token budget consumed (0-1). */
  outputTokenUtilization: number;
  /** The last budget decision rendered. */
  lastDecision: BudgetDecision;
};

// ---------------------------------------------------------------------------
// Query Config
// ---------------------------------------------------------------------------

/**
 * Configuration for a single query execution within the chat pipeline.
 * Passed per-request to allow callers to override defaults.
 */
export type QueryConfig = {
  /** Unique identifier for the query session. */
  sessionId: string;
  /** Model to use for this query. */
  model: string;
  /** Budget limits for this query. Omitted fields use defaults. */
  budget?: BudgetConfig;
  /** System prompt override. */
  systemPrompt?: string;
  /** Append additional content to the system prompt. */
  appendSystemPrompt?: string;
  /** Temperature for generation (0-2). */
  temperature?: number;
  /** Maximum tokens to generate per turn. */
  maxTokensPerTurn?: number;
  /** Enable extended thinking / reasoning mode. */
  enableThinking?: boolean;
  /** Whether to stream responses. */
  stream?: boolean;
  /** Abort signal for cancellation. */
  abortSignal?: AbortSignal;
  /** Verbose logging for debugging. */
  verbose?: boolean;
};

// ---------------------------------------------------------------------------
// Query Result
// ---------------------------------------------------------------------------

/**
 * Result returned after a query completes or is stopped by the budget
 * controller. Contains the final output, usage summary, and stop reason.
 */
export type QueryResult = {
  /** Whether the query completed successfully. */
  success: boolean;
  /** The budget decision that ended the query, or 'continue' if it finished naturally. */
  stopReason: BudgetDecision | "completed" | "aborted" | "error";
  /** Final assistant response text (empty string if stopped before generation). */
  responseText: string;
  /** Accumulated budget summary at the time the query ended. */
  budgetSummary: BudgetSummary;
  /** Total wall-clock duration in milliseconds. */
  durationMs: number;
  /** Error message if the query failed. */
  error?: string;
};
