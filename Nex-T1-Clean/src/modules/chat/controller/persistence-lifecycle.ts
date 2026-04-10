import type { UIMessage } from "ai";

import type { ChatAgentRequest } from "@/modules/chat/types";
import {
  createLocalConversationId,
  isLocalConversationId,
} from "@/modules/chat/persistence/local-conversation-id";
import {
  clearActiveChatStreamId,
  createChatResumableStreamId,
  setActiveChatStreamId,
} from "@/server/chat/active-stream-store";
import {
  ensureConversationRecord,
  extractTextFromUIMessage,
  generateConversationTitle,
  persistConversationMessage,
} from "@/server/chat/conversation-store";
import { getChatResumableStreamContext } from "@/server/chat/resumable-stream-context";
import {
  createServiceRoleClient,
  type SupabaseServiceRoleClient,
} from "@/server/services/supabase/service-role";
import { getChatStreamingResponseHeaders } from "@/modules/chat/feature-flags";

import { logger } from "@/lib/logger";

const DEFAULT_NON_PRODUCTION_TEST_MODE_USER_ID =
  "00000000-0000-0000-0000-000000000000";

export type ConversationPersistenceState = {
  authoritativeSessionId: string | undefined;
  consumeSseStream?: ({ stream }: { stream: ReadableStream }) => Promise<void>;
  conversationId: string | null;
  responseHeaders: HeadersInit;
  resumableStreamId: string | null;
  streamFinishHandler: (args: {
    isAborted?: boolean;
    responseMessage: UIMessage;
  }) => Promise<void>;
  supabaseClient: SupabaseServiceRoleClient | null;
};

type PrepareConversationPersistenceArgs = {
  chatPersistenceEnabled: boolean;
  latestUserMessage: UIMessage | null;
  parsedRequest: ChatAgentRequest;
  requestedConversationId: string | null;
  requestedModel: string;
  uiMessages: UIMessage[];
  userId?: string | null;
};

function isSyntheticNonProductionPersistenceUser(
  userId: string | null | undefined,
): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const normalizedUserId = userId?.trim() ?? "";
  if (!normalizedUserId) {
    return false;
  }

  const syntheticUserId =
    process.env.NEXT_PUBLIC_DEV_AUTH_USER_ID?.trim() ||
    DEFAULT_NON_PRODUCTION_TEST_MODE_USER_ID;

  return normalizedUserId === syntheticUserId;
}

export async function prepareConversationPersistence({
  chatPersistenceEnabled,
  latestUserMessage,
  parsedRequest,
  requestedConversationId,
  requestedModel,
  uiMessages,
  userId,
}: PrepareConversationPersistenceArgs): Promise<ConversationPersistenceState> {
  let supabaseClient: SupabaseServiceRoleClient | null = null;
  let conversationId: string | null = requestedConversationId;
  const persistenceUserId = typeof userId === "string" ? userId : null;
  const shouldUseServerPersistence =
    !!persistenceUserId &&
    !isSyntheticNonProductionPersistenceUser(persistenceUserId);

  if (
    chatPersistenceEnabled &&
    latestUserMessage &&
    shouldUseServerPersistence &&
    persistenceUserId
  ) {
    try {
      supabaseClient = createServiceRoleClient();
    } catch (error) {
      logger.error(
        "[ChatController] Failed to create service-role Supabase client for conversation persistence",
        error,
      );
    }

    if (supabaseClient) {
      try {
        const ensuredConversation = await ensureConversationRecord(
          supabaseClient,
          persistenceUserId,
          requestedConversationId,
          {
            title: generateConversationTitle(uiMessages),
            model: requestedModel,
          },
        );
        conversationId = ensuredConversation.id;

        await persistConversationMessage({
          supabase: supabaseClient,
          conversationId,
          message: latestUserMessage,
        });
      } catch (error) {
        logger.error(
          "[ChatController] Failed to persist user conversation message",
          error,
        );
      }
    }
  }

  if (!conversationId && latestUserMessage) {
    conversationId = createLocalConversationId();
  }

  const authoritativeSessionId =
    conversationId ?? parsedRequest.sessionId ?? undefined;
  const resumableStreamId =
    conversationId && !isLocalConversationId(conversationId)
      ? createChatResumableStreamId(conversationId)
      : null;
  const responseHeaders = getChatStreamingResponseHeaders(conversationId);

  const streamFinishHandler = async ({
    isAborted,
    responseMessage,
  }: {
    isAborted?: boolean;
    responseMessage: UIMessage;
  }) => {
    if (conversationId && resumableStreamId) {
      await clearActiveChatStreamId(conversationId, resumableStreamId);
    }

    if (
      isAborted ||
      !supabaseClient ||
      !conversationId ||
      responseMessage.role !== "assistant"
    ) {
      return;
    }

    try {
      await persistConversationMessage({
        supabase: supabaseClient,
        conversationId,
        message: responseMessage,
        fallbackContent: extractTextFromUIMessage(responseMessage),
      });
    } catch (error) {
      logger.error("[ChatController] Failed to persist assistant UI message", error);
    }
  };

  const consumeSseStream =
    conversationId && resumableStreamId
      ? async ({ stream }: { stream: ReadableStream }) => {
          try {
            await setActiveChatStreamId(conversationId, resumableStreamId);
            await getChatResumableStreamContext().createNewResumableStream(
              resumableStreamId,
              () => stream,
            );
          } catch (error) {
            await clearActiveChatStreamId(conversationId, resumableStreamId);
            logger.error(
              "[ChatController] Failed to register resumable chat stream",
              error,
            );
          }
        }
      : undefined;

  return {
    authoritativeSessionId,
    consumeSseStream,
    conversationId,
    responseHeaders,
    resumableStreamId,
    streamFinishHandler,
    supabaseClient,
  };
}
