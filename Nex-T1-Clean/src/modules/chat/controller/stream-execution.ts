import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";

import {
  consumeCredits,
} from "@/server/services/credits/credit-service";
import { SecurityViolationError } from "@/server/services/superagent/types";
import {
  calculateWeightedCreditCharge,
  estimateRequestInputTokens,
} from "@/server/services/credits/weighted-credit-cost";
import { getErrorMessage } from "@/lib/utils/error";
import { createQueryEngineStream } from "@/modules/chat/query-engine/integration";

import type { PreparedChatStreamRequest } from "./request-preparation";
import { recordChatStreamAnalytics } from "./analytics";
import { createErrorResponse } from "./error-responses";
import { createImmediateStreamResponse } from "./immediate-stream-response";
import { getChatPreflightShortcut } from "./preflight-shortcuts";
import {
  rollbackReservedCredits,
} from "./stream-credits";
import { ChatUIMessagePartEmitter } from "./ui-part-emitter";
import { stripReasoningUIMessageChunks } from "./ui-stream-filters";
import {
  registerStreamCancellation,
  releaseStreamCancellation,
  type StreamCancellationHandle,
} from "./stream-cancellation";

import { logger } from "@/lib/logger";

export async function executeChatStream(
  context: PreparedChatStreamRequest,
): Promise<Response> {
  try {
    const shortcut = await getChatPreflightShortcut({
      userId: context.authContext.userId ?? null,
      latestUserMessage: context.latestUserText,
      requestedModelAlias: context.requestedModelStr,
      billingModelKey:
        context.analyticsContext.requestedModelKey ?? context.requestedModelStr,
      attachmentCount: context.normalizedRequest.attachmentCount,
    });

    if (shortcut) {
      logger.debug("[ChatController] serving preflight shortcut", {
        conversationId: context.persistence.conversationId,
        model: context.requestedModelStr,
      });

      return createImmediateStreamResponse({
        message: shortcut.message,
        sources: shortcut.sources,
        onFinish: context.persistence.streamFinishHandler,
        consumeSseStream: context.persistence.consumeSseStream,
        headers: context.persistence.responseHeaders,
      });
    }
  } catch (shortcutError) {
    logger.error("[ChatController] Preflight shortcut failed:", shortcutError);
  }

  logger.debug("[ChatController] chat request accepted", {
    conversationId: context.persistence.conversationId,
    messageCount: context.uiMessages.length,
    model: context.requestedModelStr,
  });

  const estimatedReservationCharge = calculateWeightedCreditCharge({
    baseCredits: context.baseCreditCharge,
    inputTokens: estimateRequestInputTokens(context.normalizedRequest),
    modelId: context.analyticsContext.resolvedModelId,
    mevProtection: Boolean(
      context.normalizedRequest.executionPreferences?.mevProtection,
    ),
  }).totalCredits;

  const reservedCredits = await consumeCredits(
    context.userId,
    estimatedReservationCharge,
  );
  if (!reservedCredits.ok) {
    return createErrorResponse(
      reservedCredits.failureReason === "service_unavailable" ? 503 : 402,
      reservedCredits.failureReason === "service_unavailable"
        ? "credits_unavailable"
        : "amount_exceeded",
    );
  }

  const creditsSettled = { current: false };
  let cancellationHandle: StreamCancellationHandle | null =
    await registerStreamCancellation(context.persistence.resumableStreamId, {
      conversationId: context.persistence.conversationId,
      userId: context.userId,
    });

  let failureAnalyticsRecorded = false;
  const recordFailureAnalyticsOnce = (error: unknown) => {
    if (failureAnalyticsRecorded) {
      return;
    }

    failureAnalyticsRecorded = true;
    void recordChatStreamAnalytics({
      context: context.analyticsContext,
      error,
      executionPath: "unified_agent_v6",
      success: false,
    });
  };

  try {
    const stream = createUIMessageStream({
      onError: (error) => {
        recordFailureAnalyticsOnce(error);
        return getErrorMessage(error, "chat_stream_failed");
      },
      onFinish: async (event) => {
        try {
          await context.persistence.streamFinishHandler(event);
        } finally {
          await releaseStreamCancellation(cancellationHandle, {
            conversationId: context.persistence.conversationId,
            userId: context.userId,
          });

          try {
            await rollbackReservedCredits({
              creditsSettled,
              reservedCredits,
              userId: context.userId,
            });
          } catch (refundError) {
            logger.error(
              "[ChatController] failed to rollback unified reservation",
              {
                error:
                  refundError instanceof Error
                    ? refundError.message
                    : String(refundError),
                conversationId: context.persistence.conversationId,
                userId: context.userId,
              },
            );
          }
        }
      },
      execute: async ({ writer }) => {
        const emitter = new ChatUIMessagePartEmitter(writer);

        writer.merge(
          stripReasoningUIMessageChunks(
            await createQueryEngineStream(context, {
              writer,
              emitter,
              cancellationHandle,
              creditsSettled,
              reservedCredits,
            }),
          ),
        );
      },
    });

    return createUIMessageStreamResponse({
      stream,
      consumeSseStream: context.persistence.consumeSseStream,
      headers: context.persistence.responseHeaders,
    });
  } catch (error) {
    await releaseStreamCancellation(cancellationHandle, {
      conversationId: context.persistence.conversationId,
      userId: context.userId,
    });

    try {
      await rollbackReservedCredits({
        creditsSettled,
        reservedCredits,
        userId: context.userId,
      });
    } catch (refundError) {
      logger.error("[ChatController] failed to rollback unified reservation", {
        error:
          refundError instanceof Error ? refundError.message : String(refundError),
        conversationId: context.persistence.conversationId,
        userId: context.userId,
      });
    }

    recordFailureAnalyticsOnce(error);
    if (error instanceof SecurityViolationError) {
      throw error;
    }

    throw error;
  }
}
