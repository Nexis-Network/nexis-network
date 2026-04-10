import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

import type { ChatAgentRequest } from "@/modules/chat/types";
import {
  createCompositeRateLimitKey,
  createRateLimitResponse,
  extractClientIP,
  handleRequestRateLimitWithKey,
} from "@/lib/request-utils";
import { getCreditBalance } from "@/server/services/credits/credit-service";
import {
  sanitizeUiMessagesForNativeChatRoute,
} from "@/modules/chat/app-chat-agent";
import { resolveCreditCost } from "@/lib/constants/billing-limits";
import { extractTextFromUIMessage } from "@/server/chat/conversation-store";

import {
  type CookieContainer,
  readCookieValue,
  resolveControllerAuthContext,
} from "./auth-context";
import { createErrorResponse } from "./error-responses";
import {
  ModelAccessRestrictedError,
  RateLimitExceededError,
} from "./errors";
import { createChatAnalyticsContext } from "./analytics";
import {
  enforceChatRateLimit,
  enforceCreditGuardrails,
  enforceModelAccess,
  resolveModelKeyFromInput,
  resolveRequestedModel,
} from "./guardrails";
import { prepareConversationPersistence } from "./persistence-lifecycle";
import { evaluatePromptGuard } from "./prompt-guard";
import {
  buildValidatedChatRequest,
  CHAT_PERSISTENCE_ENABLED,
  normalizePreparedChatRequest,
  resolveRequestedConversationId,
  type ParsedChatUIRequestValue,
} from "./request-normalization";

import { logger } from "@/lib/logger";

const RATE_LIMIT_PREFIX = "chatbot";

type AuthContext = NonNullable<
  Awaited<ReturnType<typeof resolveControllerAuthContext>>
>;

export type PreparedChatStreamRequest = {
  analyticsContext: ReturnType<typeof createChatAnalyticsContext>;
  authContext: AuthContext;
  baseCreditCharge: number;
  balance: Awaited<ReturnType<typeof getCreditBalance>>;
  latestUserText: string;
  normalizedRequest: ChatAgentRequest;
  persistence: Awaited<ReturnType<typeof prepareConversationPersistence>>;
  requestedModelStr: string;
  sanitizedUiMessages: ReturnType<typeof sanitizeUiMessagesForNativeChatRoute>;
  streamStartTime: number;
  uiMessages: ParsedChatUIRequestValue["body"]["messages"];
  userId: string;
};

export async function prepareChatStreamRequest(args: {
  cookies: ReadonlyRequestCookies;
  parsedUiRequest: ParsedChatUIRequestValue;
  request: Request;
}): Promise<PreparedChatStreamRequest | Response> {
  const parsedRequest = buildValidatedChatRequest(args.parsedUiRequest);
  if (parsedRequest instanceof Response) {
    return parsedRequest;
  }

  const authContext = await resolveControllerAuthContext(
    args.cookies as CookieContainer,
    args.request,
  );
  if (!authContext) {
    return createErrorResponse(401, "authentication_required");
  }

  const orgId = readCookieValue(
    args.cookies as CookieContainer,
    "org_active_account",
  );
  const balance = await getCreditBalance(authContext.userId ?? "");
  const rateKey = createCompositeRateLimitKey({
    clientIP: extractClientIP(args.request),
    route: RATE_LIMIT_PREFIX,
    orgId: orgId ?? undefined,
    userId: authContext.userId,
  });

  try {
    enforceChatRateLimit(rateKey, balance.plan);
    const rlResult = await handleRequestRateLimitWithKey(rateKey, balance.plan);
    if (!rlResult.success) {
      return createRateLimitResponse(rlResult.errorResponse);
    }
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return createErrorResponse(error.status, "rate_limited");
    }
    throw error;
  }

  const requestedModelStr = resolveRequestedModel(parsedRequest.model, balance.plan);
  const requestedConversationId = resolveRequestedConversationId(
    args.parsedUiRequest.body.sessionId,
    parsedRequest,
  );
  const persistence = await prepareConversationPersistence({
    chatPersistenceEnabled: CHAT_PERSISTENCE_ENABLED,
    latestUserMessage: args.parsedUiRequest.latestUserMessage,
    parsedRequest,
    requestedConversationId,
    requestedModel: requestedModelStr,
    uiMessages: args.parsedUiRequest.body.messages,
    userId: authContext.userId,
  });

  const requestWithResolvedModel =
    parsedRequest.model === requestedModelStr &&
    parsedRequest.sessionId === persistence.authoritativeSessionId
      ? parsedRequest
      : {
          ...parsedRequest,
          model: requestedModelStr,
          sessionId: persistence.authoritativeSessionId,
        };
  const normalizedRequest = normalizePreparedChatRequest({
    originalModel: args.parsedUiRequest.body.model ?? parsedRequest.model,
    plan: balance.plan,
    request: requestWithResolvedModel,
  });

  try {
    await enforceModelAccess(authContext.userId ?? "", requestedModelStr, balance);
    await enforceCreditGuardrails(
      authContext.userId ?? "",
      requestedModelStr,
      balance,
    );
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return createErrorResponse(
        error.status === 402 ? 402 : 429,
        error.status === 402 ? "amount_exceeded" : "rate_limited",
      );
    }
    if (error instanceof ModelAccessRestrictedError) {
      return createErrorResponse(403, error.message);
    }
    throw error;
  }

  try {
    const guardOutcome = await evaluatePromptGuard({
      request: parsedRequest,
      userId: authContext.userId,
      sessionId: args.parsedUiRequest.body.sessionId,
    });
    if (guardOutcome.blocked) {
      return createErrorResponse(
        422,
        guardOutcome.message ??
          "Your message was blocked due to security concerns. Please rephrase your request.",
      );
    }
  } catch (guardError) {
    logger.error("[ChatController] Guard check failed:", guardError);
  }

  const streamStartTime = Date.now();
  const userId = authContext.userId ?? "";
  const latestUserText = args.parsedUiRequest.latestUserMessage
    ? extractTextFromUIMessage(args.parsedUiRequest.latestUserMessage)
    : "";
  const sanitizedUiMessages = sanitizeUiMessagesForNativeChatRoute(
    args.parsedUiRequest.body.messages,
  );

  return {
    analyticsContext: createChatAnalyticsContext({
      conversationId: persistence.authoritativeSessionId ?? null,
      requestedModel: requestedModelStr,
      streamStartTime,
      userId,
    }),
    authContext,
    baseCreditCharge: resolveCreditCost(
      resolveModelKeyFromInput(requestedModelStr),
    ),
    balance,
    latestUserText,
    normalizedRequest,
    persistence,
    requestedModelStr,
    sanitizedUiMessages,
    streamStartTime,
    uiMessages: args.parsedUiRequest.body.messages,
    userId,
  };
}
