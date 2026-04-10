import { registerChatExecutionCancellation } from "@/server/chat/execution-cancellation";

import { logger } from "@/lib/logger";

export type StreamCancellationHandle =
  Awaited<ReturnType<typeof registerChatExecutionCancellation>>;

type StreamCancellationContext = {
  conversationId: string | null;
  userId: string;
};

export async function registerStreamCancellation(
  streamId: string | null,
  context: StreamCancellationContext,
): Promise<StreamCancellationHandle | null> {
  if (!streamId) {
    return null;
  }

  try {
    return await registerChatExecutionCancellation(streamId);
  } catch (error) {
    logger.error("[ChatController] failed to register execution cancellation", {
      error: error instanceof Error ? error.message : String(error),
      conversationId: context.conversationId,
      userId: context.userId,
    });
    return null;
  }
}

export async function releaseStreamCancellation(
  handle: StreamCancellationHandle | null,
  context: StreamCancellationContext,
): Promise<void> {
  if (!handle) {
    return;
  }

  try {
    await handle.release();
  } catch (error) {
    logger.error("[ChatController] failed to release execution cancellation", {
      error: error instanceof Error ? error.message : String(error),
      conversationId: context.conversationId,
      userId: context.userId,
    });
  }
}
