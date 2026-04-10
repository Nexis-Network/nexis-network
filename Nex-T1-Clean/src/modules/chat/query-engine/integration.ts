/**
 * QueryEngine Integration Layer
 *
 * Wraps the existing `createAgentUIStream` call with QueryEngine lifecycle
 * hooks, budget enforcement, and session tracking. Drop-in replacement for
 * the inner `createAgentUIStream` call in stream-execution.ts.
 */

import { createAgentUIStream } from "ai";

import { appChatAgent } from "@/modules/chat/app-chat-agent";
import { logger } from "@/lib/logger";
import { getOrCreateSessionTracker } from "@/modules/chat/middleware/cost-tracker";

import type { PreparedChatStreamRequest } from "@/modules/chat/controller/request-preparation";
import type { ChatUIMessagePartEmitter } from "@/modules/chat/controller/ui-part-emitter";
import type { StreamCancellationHandle } from "@/modules/chat/controller/stream-cancellation";
import type { ConsumeCreditsResult } from "@/server/services/credits/credit-service";

import { BudgetController } from "./budget";
import { createSession, updateSession } from "./session";
import { runSessionStartHooks } from "./lifecycle-hooks";
import { createOnAgentFinish, createOnStepFinish } from "./lifecycle-callbacks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Handles from the outer stream envelope for constructing the agent call. */
export type QueryEngineStreamHandles = {
  writer: unknown;
  emitter: ChatUIMessagePartEmitter;
  cancellationHandle: StreamCancellationHandle | null;
  creditsSettled: { current: boolean };
  reservedCredits: ConsumeCreditsResult;
};

/** Budget override options. Field names align with BudgetConfig. */
export type QueryEngineBudgetOverrides = {
  maxTurns?: number;
  maxBudgetUsd?: number;
  maxInputTokens?: number;
  maxOutputTokens?: number;
};

// ---------------------------------------------------------------------------
// Core integration
// ---------------------------------------------------------------------------

/**
 * Creates an agent UI stream wrapped with QueryEngine lifecycle management.
 *
 * Lifecycle: SessionStart hooks -> BudgetController -> session registration ->
 * agent stream with onStepFinish/onAgentFinish callbacks -> Stop/SessionEnd hooks.
 */
export async function createQueryEngineStream(
  context: PreparedChatStreamRequest,
  handles: QueryEngineStreamHandles,
  budgetOverrides?: QueryEngineBudgetOverrides,
) {
  const { emitter, cancellationHandle, creditsSettled, reservedCredits } = handles;

  const sessionId =
    context.normalizedRequest.sessionId ??
    context.normalizedRequest.submissionId ??
    context.persistence.conversationId ??
    "unknown";

  const userId = context.authContext.userId ?? null;
  const modelId = context.analyticsContext.resolvedModelId;

  // 1. Session initialization
  createSession(sessionId);
  updateSession(sessionId, (prev) => ({ ...prev, status: "running" }));

  // 2. Budget controller
  const costTracker = getOrCreateSessionTracker(sessionId);
  const budget = new BudgetController(costTracker, budgetOverrides);

  // 3. SessionStart hooks
  const startHookResult = await runSessionStartHooks(sessionId, userId, process.cwd());

  if (startHookResult.blocked) {
    logger.warn("[QueryEngine] SessionStart hooks blocked execution", {
      sessionId, systemMessages: startHookResult.systemMessages,
    });
    updateSession(sessionId, (prev) => ({ ...prev, status: "cancelled" }));
  }

  if (startHookResult.additionalContext) {
    logger.debug("[QueryEngine] SessionStart hook injected context", {
      sessionId, contextLength: startHookResult.additionalContext.length,
    });
  }

  // 4. Cumulative step tracking
  let totalToolCallCount = 0;
  let turnNumber = 0;

  const getTurnNumber = () => turnNumber;
  const getTotalToolCallCount = () => totalToolCallCount;
  const incrementTurn = () => { turnNumber += 1; return turnNumber; };
  const addToolCalls = (count: number) => { totalToolCallCount += count; return totalToolCallCount; };

  // 5. Create the agent stream with lifecycle wrappers
  const onAgentFinish = createOnAgentFinish({
    context, sessionId, userId, modelId, costTracker,
    creditsSettled, reservedCredits, getTurnNumber, getTotalToolCallCount,
  });

  const onStepFinish = createOnStepFinish({
    sessionId, modelId, context, budget,
    incrementTurn, addToolCalls, getTurnNumber, getTotalToolCallCount,
  });

  const agentStream = await createAgentUIStream({
    agent: appChatAgent,
    uiMessages: context.sanitizedUiMessages,
    sendReasoning: false,
    ...(cancellationHandle ? { abortSignal: cancellationHandle.abortSignal } : {}),
    options: {
      request: context.normalizedRequest,
      auth: {
        userId: context.authContext.userId ?? null,
        accessToken: context.authContext.accessToken ?? null,
      },
      emitEvent: emitter.emitEvent.bind(emitter),
      onAgentFinish,
    },
    onStepFinish,
  });

  return agentStream;
}
