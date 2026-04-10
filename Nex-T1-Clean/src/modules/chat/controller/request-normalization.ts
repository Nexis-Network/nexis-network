import {
  ChatAgentRequestSchema,
  type ChatAgentRequest,
} from "@/modules/chat/types";
import { getErrorMessage } from "@/lib/utils/error";
import { sanitizeExecutionPreferencesForPlan } from "@/lib/billing/feature-access";
import { isUuidString } from "@/lib/utils/uuid";

import { createErrorResponse } from "./error-responses";
import { buildChatRequestFromUI } from "./request-mapper";
import { parseChatUIRequest } from "./request-parser";

import { logger } from "@/lib/logger";

const LEGACY_ORCHESTRATOR_MODEL_ALIASES = new Set([
  "orchestrator",
  "nex-orchestrator",
]);

const parseBooleanFlag = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  if (typeof value !== "string") {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return defaultValue;
};

export const CHAT_PERSISTENCE_ENABLED = parseBooleanFlag(
  process.env.AI_SDK_V6_CHAT_PERSISTENCE_ENABLED,
  true,
);

export type ParsedChatUIRequestValue = Extract<
  Awaited<ReturnType<typeof parseChatUIRequest>>,
  { ok: true }
>["value"];

function normalizeLegacyChatRequest(
  request: ChatAgentRequest,
  originalModel?: string,
): ChatAgentRequest {
  const normalizedOriginalModel = originalModel?.trim().toLowerCase();
  if (
    !normalizedOriginalModel ||
    !LEGACY_ORCHESTRATOR_MODEL_ALIASES.has(normalizedOriginalModel)
  ) {
    return request;
  }

  return {
    ...request,
    model: "nex-t1-pro",
    tierRoute: request.tierRoute ?? "orchestrator",
  };
}

export function applyPlanScopedExecutionPreferences(
  request: ChatAgentRequest,
  plan: string | null | undefined,
): ChatAgentRequest {
  const sanitizedExecutionPreferences = sanitizeExecutionPreferencesForPlan(
    request.executionPreferences,
    plan,
  );

  return sanitizedExecutionPreferences === request.executionPreferences
    ? request
    : { ...request, executionPreferences: sanitizedExecutionPreferences };
}

export function buildValidatedChatRequest(
  requestValue: ParsedChatUIRequestValue,
): ChatAgentRequest | Response {
  try {
    const chatRequest = buildChatRequestFromUI({
      messages: requestValue.body.messages,
      sessionId: requestValue.body.sessionId,
      model: requestValue.body.model,
      systemPromptProfileId: requestValue.body.systemPromptProfileId,
      walletContext: requestValue.body.walletContext,
      executionPreferences: requestValue.body.executionPreferences,
    });

    if (requestValue.body.marketContext?.trim()) {
      chatRequest.marketContext = requestValue.body.marketContext;
    }

    return ChatAgentRequestSchema.parse(chatRequest);
  } catch (error) {
    logger.error("[ChatController] Request validation failed:", error);
    return createErrorResponse(
      400,
      getErrorMessage(error, "Invalid request parameters"),
    );
  }
}

export function normalizePreparedChatRequest(args: {
  originalModel?: string;
  plan: string | null | undefined;
  request: ChatAgentRequest;
}): ChatAgentRequest {
  return applyPlanScopedExecutionPreferences(
    normalizeLegacyChatRequest(args.request, args.originalModel),
    args.plan,
  );
}

export function resolveRequestedConversationId(
  sessionId: string | undefined,
  parsedRequest: ChatAgentRequest,
): string | null {
  return [sessionId, parsedRequest.sessionId]
    .map((value) =>
      typeof value === "string" && value.trim().length > 0 ? value.trim() : null,
    )
    .find((value): value is string => isUuidString(value)) ?? null;
}
