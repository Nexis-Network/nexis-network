/**
 * Query Engine Orchestrator
 *
 * Coordinates budget tracking, session state, and lifecycle hooks
 * into a single entry point for executing multi-turn query sessions.
 *
 * This is the top-level module that wires budget enforcement
 * (BudgetController), session tracking (session store functions),
 * and lifecycle hooks together.
 */

import type { QueryConfig, QueryResult, StepUsage, BudgetDecision } from "./types";
import { BudgetController } from "./budget";
import {
  createSession,
  updateSession,
  getSession,
  removeSession,
} from "./session";
import {
  runSessionStartHooks,
  runSessionEndHooks,
  runStopHooks,
} from "./lifecycle-hooks";
import {
  SessionCostTracker,
} from "../middleware/cost-tracker";

// ---------------------------------------------------------------------------
// QueryEngine
// ---------------------------------------------------------------------------

export class QueryEngine {
  readonly sessionId: string;
  readonly budget: BudgetController;
  private readonly costTracker: SessionCostTracker;
  private turnsExecuted = 0;

  constructor(config: QueryConfig) {
    this.sessionId = config.sessionId;
    this.costTracker = new SessionCostTracker(config.sessionId);
    this.budget = new BudgetController(this.costTracker, config.budget);

    createSession(config.sessionId);
  }

  /** Transition the session to running and fire start hooks. */
  async start(userId?: string | null): Promise<void> {
    updateSession(this.sessionId, (prev) => ({
      ...prev,
      status: "running" as const,
    }));
    await runSessionStartHooks(this.sessionId, userId ?? null);
  }

  /**
   * Record a completed step and return the budget decision.
   * The engine loop should call this after each LLM round-trip.
   */
  recordStep(usage: StepUsage): BudgetDecision {
    this.turnsExecuted += 1;
    updateSession(this.sessionId, (prev) => ({
      ...prev,
      turnCount: prev.turnCount + 1,
      totalCostUsd: this.costTracker.getSummary().totalCostUsd,
    }));
    return this.budget.checkBudget(usage);
  }

  /** Complete the session and fire end hooks. */
  async complete(userId?: string | null): Promise<QueryResult> {
    updateSession(this.sessionId, (prev) => ({
      ...prev,
      status: "completed" as const,
    }));
    await runSessionEndHooks(this.sessionId, userId ?? null, {
      totalTurns: this.turnsExecuted,
      totalToolCalls: 0,
    });
    return this.buildResult("completed");
  }

  /** Cancel the session. */
  async cancel(userId?: string | null): Promise<QueryResult> {
    updateSession(this.sessionId, (prev) => ({
      ...prev,
      status: "cancelled" as const,
    }));
    await runSessionEndHooks(this.sessionId, userId ?? null, {
      totalTurns: this.turnsExecuted,
      totalToolCalls: 0,
    });
    return this.buildResult("aborted");
  }

  /** Clean up session state. */
  destroy(): void {
    removeSession(this.sessionId);
  }

  /** Build the result object. */
  private buildResult(
    stopReason: QueryResult["stopReason"],
  ): QueryResult {
    const budgetSummary = this.budget.getBudgetSummary();
    const session = getSession(this.sessionId);
    return {
      success: stopReason === "completed",
      stopReason,
      responseText: "",
      budgetSummary,
      durationMs: session
        ? Date.now() - session.startTime
        : 0,
    };
  }
}
