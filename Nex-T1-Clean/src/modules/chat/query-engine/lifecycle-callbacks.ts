/**
 * QueryEngine Lifecycle Callbacks
 *
 * Factory functions for onAgentFinish and onStepFinish callbacks used by
 * the query engine integration stream.
 */

import { logger } from "@/lib/logger";
import { settleCompletedAgentRun } from "@/modules/chat/controller/stream-credits";
import type { ConsumeCreditsResult } from "@/server/services/credits/credit-service";

import type { PreparedChatStreamRequest } from "@/modules/chat/controller/request-preparation";
import type { BudgetController } from "./budget";
import type { SessionCostTracker } from "@/modules/chat/middleware/cost-tracker";

import { updateSession, getSessionSummary } from "./session";
import { runStopHooks, runSessionEndHooks } from "./lifecycle-hooks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgentFinishEvent = {
  steps: Array<{ toolCalls: Array<{ toolName?: string | null }> }>;
  toolCalls: Array<{ toolName?: string | null }>;
  totalUsage: {
    cachedInputTokens?: number;
    inputTokens?: number;
    outputTokens?: number;
    reasoningTokens?: number;
  };
};

export type AgentFinishDeps = {
  context: PreparedChatStreamRequest;
  sessionId: string;
  userId: string | null;
  modelId: string;
  costTracker: SessionCostTracker;
  creditsSettled: { current: boolean };
  reservedCredits: ConsumeCreditsResult;
  getTurnNumber: () => number;
  getTotalToolCallCount: () => number;
};

export type StepFinishDeps = {
  sessionId: string;
  modelId: string;
  context: PreparedChatStreamRequest;
  budget: BudgetController;
  incrementTurn: () => number;
  addToolCalls: (count: number) => number;
  getTurnNumber: () => number;
  getTotalToolCallCount: () => number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Rough per-step cost estimate for session tracking.
 * Uses conservative rates ($/1M tokens) that approximate a mid-tier model.
 * This is for budget guardrails only — billing uses actual provider usage.
 */
const ESTIMATE_INPUT_COST_PER_M = 3; // $/1M input tokens
const ESTIMATE_OUTPUT_COST_PER_M = 15; // $/1M output tokens

function estimateStepCostUsd(input: number, output: number): number {
  return (
    (input / 1_000_000) * ESTIMATE_INPUT_COST_PER_M +
    (output / 1_000_000) * ESTIMATE_OUTPUT_COST_PER_M
  );
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function createOnAgentFinish(deps: AgentFinishDeps) {
  const {
    context, sessionId, userId, modelId, costTracker,
    creditsSettled, reservedCredits, getTurnNumber, getTotalToolCallCount,
  } = deps;

  return async (event: AgentFinishEvent) => {
    // -- Credit settlement --
    try {
      await settleCompletedAgentRun({
        context, creditsSettled, event, reservedCredits,
      });
    } catch (settlementError) {
      logger.error("[QueryEngine] credit settlement failed", {
        error: errMsg(settlementError),
        conversationId: context.persistence.conversationId,
        userId: context.userId,
      });
    }

    // -- Cost tracker telemetry --
    try {
      const s = costTracker.getSummary();
      logger.debug("[QueryEngine] session cost summary", {
        sessionId, model: modelId, totalTurns: s.turnCount,
        totalCostUsd: s.totalCostUsd, conversationId: context.persistence.conversationId,
      });
    } catch (e) {
      logger.warn("[QueryEngine] failed to read cost summary", {
        error: errMsg(e), conversationId: context.persistence.conversationId,
      });
    }

    // -- Stop hooks --
    const turnNumber = getTurnNumber();
    const totalToolCallCount = getTotalToolCallCount();
    try {
      const stopResult = await runStopHooks(
        sessionId, userId, "",
        { totalTurns: turnNumber, totalToolCalls: totalToolCallCount, turnNumber },
        process.cwd(),
      );
      if (stopResult.blocked) {
        logger.info("[QueryEngine] Stop hooks signaled end", {
          sessionId, systemMessages: stopResult.systemMessages,
        });
      }
    } catch (e) {
      logger.warn("[QueryEngine] Stop hooks failed", { error: errMsg(e), sessionId });
    }

    // -- SessionEnd hooks --
    try {
      await runSessionEndHooks(
        sessionId, userId,
        { totalTurns: turnNumber, totalToolCalls: totalToolCallCount },
        process.cwd(),
      );
    } catch (e) {
      logger.warn("[QueryEngine] SessionEnd hooks failed", { error: errMsg(e), sessionId });
    }

    // -- Finalize session state --
    const sessionSummary = getSessionSummary(sessionId);
    if (sessionSummary) {
      logger.debug("[QueryEngine] session completed", {
        sessionId, turns: sessionSummary.turnCount,
        toolCalls: sessionSummary.toolCallCount,
        costUsd: sessionSummary.totalCostUsd,
        durationMs: sessionSummary.durationMs,
      });
    }

    updateSession(sessionId, (prev) => ({ ...prev, status: "completed" }));
  };
}

export function createOnStepFinish(deps: StepFinishDeps) {
  const {
    sessionId, modelId, context, budget,
    incrementTurn, addToolCalls, getTurnNumber, getTotalToolCallCount,
  } = deps;

  return async ({ finishReason, usage, toolCalls }: {
    finishReason?: string;
    usage?: { inputTokens?: number; outputTokens?: number };
    toolCalls?: Array<{ toolName?: string }>;
  }) => {
    incrementTurn();
    const stepToolCalls = toolCalls?.map((tc) => tc.toolName).filter(Boolean) ?? [];
    addToolCalls(stepToolCalls.length);

    const inputTokens = usage?.inputTokens ?? 0;
    const outputTokens = usage?.outputTokens ?? 0;

    budget.checkBudget({
      model: modelId, inputTokens, outputTokens,
      cacheReadInputTokens: 0, cacheCreationInputTokens: 0,
      reasoningTokens: 0, durationMs: 0,
    });

    const estimatedCost = estimateStepCostUsd(inputTokens, outputTokens);

    updateSession(sessionId, (prev) => ({
      ...prev,
      turnCount: getTurnNumber(),
      toolCallCount: getTotalToolCallCount(),
      totalCostUsd: prev.totalCostUsd + estimatedCost,
    }));

    const snapshot = budget.getBudgetSummary();
    if (budget.isStopped()) {
      logger.warn("[QueryEngine] budget exhausted, stream will conclude", {
        sessionId, reason: snapshot.lastDecision,
        turnsUsed: snapshot.turnsUsed, costUsed: snapshot.costUsedUsd,
        tokensUsed: snapshot.inputTokensUsed + snapshot.outputTokensUsed,
      });
      updateSession(sessionId, (prev) => ({ ...prev, status: "completed" }));
    }

    logger.debug("[QueryEngine] step finished", {
      conversationId: context.persistence.conversationId,
      finishReason, promptTokens: inputTokens, completionTokens: outputTokens,
      toolCalls: stepToolCalls,
      budgetTurnsUsed: snapshot.turnsUsed, budgetCostUsed: snapshot.costUsedUsd,
    });
  };
}
