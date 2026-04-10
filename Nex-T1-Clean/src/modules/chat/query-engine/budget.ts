/**
 * Budget Controller
 *
 * Enforces per-query resource limits (turns, USD cost, tokens) during
 * the query engine loop. After each step, the controller checks whether
 * any limit has been breached and returns a BudgetDecision that the
 * engine loop uses to decide whether to continue or stop.
 *
 * Integrates with SessionCostTracker for cumulative cost accounting.
 *
 * Pattern reference: modeled after the maxTurns / maxBudgetUsd checks
 * in the upstream QueryEngine loop, extracted into a reusable controller
 * so that budget enforcement is testable and composable independently
 * of the streaming pipeline.
 */

import type { SessionCostTracker } from "@/modules/chat/middleware/cost-tracker";

import type {
  BudgetConfig,
  BudgetDecision,
  BudgetSummary,
  StepUsage,
} from "./types";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/** Generous defaults for unconfigured budget fields. */
const DEFAULT_BUDGET: Readonly<Required<BudgetConfig>> = {
  maxTurns: 50,
  maxBudgetUsd: 5,
  maxInputTokens: 1_000_000,
  maxOutputTokens: 200_000,
};

// ---------------------------------------------------------------------------
// Budget Controller
// ---------------------------------------------------------------------------

export class BudgetController {
  private readonly limits: Readonly<Required<BudgetConfig>>;
  private readonly costTracker: SessionCostTracker;

  private turnsUsed = 0;
  private inputTokensUsed = 0;
  private outputTokensUsed = 0;
  private lastDecision: BudgetDecision = "continue";

  constructor(costTracker: SessionCostTracker, config?: BudgetConfig) {
    this.costTracker = costTracker;
    this.limits = Object.freeze({
      maxTurns: config?.maxTurns ?? DEFAULT_BUDGET.maxTurns,
      maxBudgetUsd: config?.maxBudgetUsd ?? DEFAULT_BUDGET.maxBudgetUsd,
      maxInputTokens: config?.maxInputTokens ?? DEFAULT_BUDGET.maxInputTokens,
      maxOutputTokens:
        config?.maxOutputTokens ?? DEFAULT_BUDGET.maxOutputTokens,
    });
  }

  // -------------------------------------------------------------------------
  // Core check
  // -------------------------------------------------------------------------

  /**
   * Records a step's usage, updates cumulative counters, and evaluates
   * all budget limits. Returns the budget decision.
   *
   * Call this after each LLM round-trip completes.
   *
   * Evaluation order (first breach wins):
   * 1. Turn limit
   * 2. USD cost limit (via SessionCostTracker)
   * 3. Token limits (input checked before output)
   */
  checkBudget(stepUsage: StepUsage): BudgetDecision {
    // Record the turn in the cost tracker for cumulative cost accounting
    this.costTracker.recordTurn({
      model: stepUsage.model,
      inputTokens: stepUsage.inputTokens,
      outputTokens: stepUsage.outputTokens,
      cacheReadInputTokens: stepUsage.cacheReadInputTokens,
      cacheCreationInputTokens: stepUsage.cacheCreationInputTokens,
      reasoningTokens: stepUsage.reasoningTokens,
      durationMs: stepUsage.durationMs,
    });

    // Update local counters
    this.turnsUsed += 1;
    this.inputTokensUsed +=
      stepUsage.inputTokens +
      stepUsage.cacheReadInputTokens +
      stepUsage.cacheCreationInputTokens;
    this.outputTokensUsed += stepUsage.outputTokens;

    // --- Evaluate limits (first breach wins) ---

    // 1. Turn limit
    if (this.turnsUsed >= this.limits.maxTurns) {
      this.lastDecision = "stop_turns";
      return this.lastDecision;
    }

    // 2. USD cost limit (read from the authoritative cost tracker)
    const summary = this.costTracker.getSummary();
    if (summary.totalCostUsd >= this.limits.maxBudgetUsd) {
      this.lastDecision = "stop_cost";
      return this.lastDecision;
    }

    // 3. Input token limit
    if (this.inputTokensUsed >= this.limits.maxInputTokens) {
      this.lastDecision = "stop_tokens";
      return this.lastDecision;
    }

    // 4. Output token limit
    if (this.outputTokensUsed >= this.limits.maxOutputTokens) {
      this.lastDecision = "stop_tokens";
      return this.lastDecision;
    }

    this.lastDecision = "continue";
    return this.lastDecision;
  }

  // -------------------------------------------------------------------------
  // Reporting
  // -------------------------------------------------------------------------

  /**
   * Returns a snapshot of current budget consumption and utilization.
   * Safe to call at any point during or after query execution.
   */
  getBudgetSummary(): BudgetSummary {
    const summary = this.costTracker.getSummary();

    return {
      limits: { ...this.limits },
      turnsUsed: this.turnsUsed,
      costUsedUsd: summary.totalCostUsd,
      inputTokensUsed: this.inputTokensUsed,
      outputTokensUsed: this.outputTokensUsed,
      turnUtilization: safeRatio(this.turnsUsed, this.limits.maxTurns),
      costUtilization: safeRatio(
        summary.totalCostUsd,
        this.limits.maxBudgetUsd,
      ),
      inputTokenUtilization: safeRatio(
        this.inputTokensUsed,
        this.limits.maxInputTokens,
      ),
      outputTokenUtilization: safeRatio(
        this.outputTokensUsed,
        this.limits.maxOutputTokens,
      ),
      lastDecision: this.lastDecision,
    };
  }

  // -------------------------------------------------------------------------
  // Accessors
  // -------------------------------------------------------------------------

  /** Returns the resolved budget limits (defaults merged with overrides). */
  getLimits(): Readonly<Required<BudgetConfig>> {
    return this.limits;
  }

  /** Returns the number of turns consumed so far. */
  getTurnsUsed(): number {
    return this.turnsUsed;
  }

  /** Returns the cumulative USD cost from the cost tracker. */
  getCostUsedUsd(): number {
    return this.costTracker.getSummary().totalCostUsd;
  }

  /** Returns whether the last check resulted in a stop decision. */
  isStopped(): boolean {
    return this.lastDecision !== "continue";
  }

  /** Returns the last decision without re-evaluating. */
  getLastDecision(): BudgetDecision {
    return this.lastDecision;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Computes a ratio clamped to [0, 1], returning 0 when the denominator is zero. */
function safeRatio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.min(numerator / denominator, 1);
}
