import type { ChatAgentRequest } from "@/modules/chat/types";
import { recordSecurityEvent } from "@/modules/security/audit-logger";
import { isSuperagentEnabled } from "@/server/services/superagent/config";
import { guardPrompt } from "@/server/services/superagent/guard";

import { extractLatestUserMessageText } from "./request-mapper";

export type PromptGuardOutcome = {
  blocked: boolean;
  violations: UntypedJson[];
  message?: string;
};

export async function evaluatePromptGuard(params: {
  request: ChatAgentRequest;
  userId?: string | null;
  sessionId?: string;
}): Promise<PromptGuardOutcome> {
  const latestUserMessage = extractLatestUserMessageText(params.request.messages).trim();

  if (!latestUserMessage || !isSuperagentEnabled()) {
    return { blocked: false, violations: [] };
  }

  const guardResult = await guardPrompt(latestUserMessage, {
    userId: params.userId,
    sessionId: params.sessionId ?? params.request.sessionId,
    attachmentContext: params.request.attachmentContext,
  });

  if (guardResult.violations.length > 0) {
    await recordSecurityEvent({
      type: guardResult.blocked ? "prompt_blocked" : "guard_violation",
      action: guardResult.blocked ? "blocked" : "warned",
      severity: guardResult.violations[0]?.severity ?? "medium",
      violations: guardResult.violations,
      userId: params.userId,
      sessionId: params.sessionId ?? params.request.sessionId,
      reasoning: guardResult.reasoning,
    });
  }

  if (guardResult.blocked) {
    return {
      blocked: true,
      violations: guardResult.violations,
      message: "Your message was blocked due to security concerns. Please rephrase your request.",
    };
  }

  return { blocked: false, violations: guardResult.violations };
}
