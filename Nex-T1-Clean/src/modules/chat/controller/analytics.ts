import { getErrorMessage } from "@/lib/utils/error";
import { resolveModelKey, NEX_MODELS } from "@/lib/ai/nex-models";
import {
  deriveProviderFromModel,
  recordModelUsage,
} from "@/server/services/analytics/record-model-usage";

export type ChatAnalyticsContext = {
  conversationId: string | null;
  requestedModel: string;
  requestedModelKey: string | null;
  resolvedModelId: string;
  streamStartTime: number;
  userId: string;
};

export function createChatAnalyticsContext(args: {
  conversationId: string | null;
  requestedModel: string;
  streamStartTime: number;
  userId: string;
}): ChatAnalyticsContext {
  const requestedModelKey = resolveModelKey(args.requestedModel);
  const resolvedModelId = requestedModelKey
    ? NEX_MODELS[requestedModelKey].model
    : args.requestedModel;

  return {
    conversationId: args.conversationId,
    requestedModel: args.requestedModel,
    requestedModelKey: requestedModelKey ?? null,
    resolvedModelId,
    streamStartTime: args.streamStartTime,
    userId: args.userId,
  };
}

export function recordChatStreamAnalytics(args: {
  context: ChatAnalyticsContext;
  error?: unknown;
  executionPath?: string;
  success: boolean;
}) {
  const { context, error, executionPath, success } = args;

  return recordModelUsage({
    userId: context.userId,
    conversationId: context.conversationId,
    modelName: context.requestedModel,
    provider: deriveProviderFromModel(context.resolvedModelId),
    operationType: "chat_completion",
    responseTimeMs: Date.now() - context.streamStartTime,
    success,
    errorMessage: success ? null : getErrorMessage(error, "chat_stream_failed"),
    metadata: {
      modelKey: context.requestedModelKey,
      resolvedModelId: context.resolvedModelId,
      ...(executionPath ? { executionPath } : {}),
    },
  }).catch(() => {
    // Never block the chat stream on analytics write failures.
  });
}
