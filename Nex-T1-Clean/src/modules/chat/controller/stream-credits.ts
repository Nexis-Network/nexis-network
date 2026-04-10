import {
  settleCredits,
  type ConsumeCreditsResult,
} from "@/server/services/credits/credit-service";
import {
  calculateWeightedCreditCharge,
  type WeightedCreditCharge,
} from "@/server/services/credits/weighted-credit-cost";
import {
  deriveProviderFromModel,
  recordModelUsage,
} from "@/server/services/analytics/record-model-usage";

import type { PreparedChatStreamRequest } from "./request-preparation";

export async function rollbackReservedCredits(args: {
  creditsSettled: { current: boolean };
  reservedCredits: ConsumeCreditsResult | null;
  userId: string;
}) {
  if (!args.reservedCredits || args.creditsSettled.current) {
    return;
  }

  await settleCredits(args.userId, args.reservedCredits, 0);
  args.creditsSettled.current = true;
}

function resolveWeightedCharge(args: {
  context: PreparedChatStreamRequest;
  toolNames: string[];
  usage: {
    cachedInputTokens?: number;
    inputTokens?: number;
    outputTokens?: number;
    reasoningTokens?: number;
  };
}): WeightedCreditCharge {
  return calculateWeightedCreditCharge({
    baseCredits: args.context.baseCreditCharge,
    modelId: args.context.analyticsContext.resolvedModelId,
    inputTokens: args.usage.inputTokens,
    outputTokens: args.usage.outputTokens,
    reasoningTokens: args.usage.reasoningTokens,
    cachedInputTokens: args.usage.cachedInputTokens,
    mevProtection: Boolean(
      args.context.normalizedRequest.executionPreferences?.mevProtection,
    ),
    toolNames: args.toolNames,
  });
}

export async function settleCompletedAgentRun(args: {
  context: PreparedChatStreamRequest;
  creditsSettled: { current: boolean };
  event: {
    steps: Array<{ toolCalls: Array<{ toolName?: string | null }> }>;
    toolCalls: Array<{ toolName?: string | null }>;
    totalUsage: {
      cachedInputTokens?: number;
      inputTokens?: number;
      outputTokens?: number;
      reasoningTokens?: number;
    };
  };
  reservedCredits: ConsumeCreditsResult;
}) {
  const toolNames = Array.from(
    new Set(
      [...args.event.toolCalls, ...args.event.steps.flatMap((step) => step.toolCalls)]
        .map((toolCall) => toolCall.toolName)
        .filter(
          (toolName): toolName is string =>
            typeof toolName === "string" && toolName.length > 0,
        ),
    ),
  );
  const weightedCharge = resolveWeightedCharge({
    context: args.context,
    toolNames,
    usage: args.event.totalUsage,
  });
  const settlement = await settleCredits(
    args.context.userId,
    args.reservedCredits,
    weightedCharge.totalCredits,
  );
  args.creditsSettled.current = true;

  void recordModelUsage({
    userId: args.context.userId,
    conversationId: args.context.analyticsContext.conversationId,
    modelName: args.context.analyticsContext.requestedModel,
    provider: deriveProviderFromModel(
      args.context.analyticsContext.resolvedModelId,
    ),
    inputTokens: args.event.totalUsage.inputTokens ?? 0,
    outputTokens: args.event.totalUsage.outputTokens ?? 0,
    responseTimeMs: Date.now() - args.context.streamStartTime,
    success: true,
    toolCalls: toolNames.map((name) => ({ name })),
    metadata: {
      executionPath: "unified_agent_v6",
      modelKey: args.context.analyticsContext.requestedModelKey,
      resolvedModelId: args.context.analyticsContext.resolvedModelId,
      reservedCharge: settlement.reservedCharge,
      finalCharge: settlement.finalCharge,
      refundedCredits: settlement.refunded,
      additionalCredits: settlement.additionalConsumed,
      remainingCredits: settlement.remaining,
      monthlyRemaining: settlement.monthlyRemaining,
      overageCredits: settlement.overageCredits,
      tokenCredits: weightedCharge.tokenCredits,
      featureCredits: weightedCharge.featureCredits,
      creditBreakdown: weightedCharge.breakdown,
    },
  });
}
