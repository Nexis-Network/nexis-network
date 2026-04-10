import { z } from "zod";
import { logger } from "@/lib/logger";
import { defineTool } from "@/modules/ai/tools/define-tool";
import {
  EscalationReason,
  HandoffSeverity,
  isHandoffEnabled,
} from "@/modules/chat/workflow/handoff-contract";
import { persistHandoffSummary } from "@/modules/chat/workflow/handoff-persistence";

export const escalateToHumanTool = defineTool({
  name: "escalate_to_human",
  description:
    "Escalate the current task to a human operator when the agent cannot safely proceed. " +
    "Use when confidence is low, monetary thresholds are exceeded, security violations occur, " +
    "or the user explicitly requests human help.",
  parameters: z.object({
    reason: EscalationReason,
    detail: z.string().describe("Detailed explanation of why escalation is needed"),
    severity: HandoffSeverity,
    recommendedAction: z.string().describe("What the human operator should do next"),
    confidenceNotes: z.string().optional().describe("Notes on confidence level"),
    requestCategory: z.string().optional().describe("Category of the user request"),
  }),
  execute: async (input) => {
    if (!isHandoffEnabled()) {
      return {
        status: "disabled" as const,
        message: "Human handoff is not enabled in this environment.",
      };
    }

    logger.info("[escalate-to-human] Escalation requested", {
      reason: input.reason,
      severity: input.severity,
    });

    // Persist the handoff summary to Supabase (best-effort — fail open).
    const handoffSummary = {
      handoffId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      sessionId: null,
      userId: "unknown",
      userIdentifier: null,
      requestSummary: input.detail.slice(0, 500),
      requestCategory: input.requestCategory ?? "general",
      escalationReason: input.reason,
      escalationDetail: input.detail,
      severity: input.severity,
      attemptedActions: [],
      verifiedPrerequisites: [],
      monetaryImpact: null,
      recommendedAction: input.recommendedAction,
      confidenceNotes: input.confidenceNotes ?? null,
      workingMemorySnapshot: {
        activeTaskId: null,
        todoSummary: "N/A",
        blockerSummary: null,
      },
      relevantArtifactIds: [],
    };

    const persistResult = await persistHandoffSummary(handoffSummary);
    if (!persistResult.success) {
      logger.warn("[escalate-to-human] Handoff persistence failed (non-blocking)", {
        error: persistResult.error,
      });
    }

    return {
      status: "escalated" as const,
      handoffId: handoffSummary.handoffId,
      escalationReason: input.reason,
      escalationDetail: input.detail,
      severity: input.severity,
      recommendedAction: input.recommendedAction,
      confidenceNotes: input.confidenceNotes ?? null,
      message: `Task escalated to human operator. Reason: ${input.reason}. A support agent will review this request.`,
    };
  },
});
