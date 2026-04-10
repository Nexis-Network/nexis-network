import { randomUUID } from "crypto";
import type { ContextEnvelope } from "@/modules/chat/context-envelope";
import {
  readWorkingMemoryState,
  resolveWorkingMemoryScope,
} from "@/modules/chat/state/working-memory-store";
import type {
  HandoffSummary,
  HandoffSeverity,
  EscalationReason,
  AttemptedAction,
  MonetaryImpact,
} from "./handoff-contract";

export type BuildHandoffParams = {
  envelope: ContextEnvelope;
  escalationReason: EscalationReason;
  escalationDetail: string;
  severity: HandoffSeverity;
  attemptedActions: AttemptedAction[];
  monetaryImpact?: MonetaryImpact | null;
  recommendedAction: string;
  confidenceNotes?: string | null;
  requestCategory?: string;
};

export async function buildHandoffSummary(
  params: BuildHandoffParams,
): Promise<HandoffSummary> {
  const { envelope } = params;

  // Read working memory for snapshot
  const scope = resolveWorkingMemoryScope({
    userId: envelope.userId ?? undefined,
    sessionId: envelope.sessionId ?? undefined,
  });
  const memoryState = await readWorkingMemoryState(scope);

  // Build todo summary
  const todoSummary = memoryState.todos.length === 0
    ? "No active tasks."
    : memoryState.todos
        .map((t) => `[${t.status}] ${t.title}`)
        .join("; ");

  // Build blocker summary
  const blockerSummary = envelope.memory.blockerGraph.length === 0
    ? null
    : envelope.memory.blockerGraph
        .filter((entry) => entry.blockedBy.length > 0)
        .map((entry) => `${entry.taskId} blocked by: ${entry.blockedBy.join(", ")}`)
        .join("; ") || null;

  // Extract verified prerequisites from verification receipts
  const verifiedPrerequisites = envelope.memory.verificationReceipts.flatMap(
    (receipt) =>
      receipt.completed.map((check) => ({
        check,
        result: "pass" as const,
        detail: `Verified for task ${receipt.taskId}`,
      })),
  );

  // Build request summary from memory facts
  const requestSummary = envelope.memory.facts.length > 0
    ? envelope.memory.facts
        .slice(0, 3)
        .map((f) => f.summary)
        .join(". ")
        .slice(0, 500)
    : "No request context available.";

  return {
    handoffId: randomUUID(),
    createdAt: new Date().toISOString(),
    sessionId: envelope.sessionId,
    userId: envelope.userId ?? "unknown",
    userIdentifier: null,
    requestSummary,
    requestCategory: params.requestCategory ?? "general",
    escalationReason: params.escalationReason,
    escalationDetail: params.escalationDetail,
    severity: params.severity,
    attemptedActions: params.attemptedActions,
    verifiedPrerequisites,
    monetaryImpact: params.monetaryImpact ?? null,
    recommendedAction: params.recommendedAction,
    confidenceNotes: params.confidenceNotes ?? null,
    workingMemorySnapshot: {
      activeTaskId: envelope.memory.activeTaskId,
      todoSummary,
      blockerSummary,
    },
    relevantArtifactIds: envelope.artifacts.refs.map((ref) => ref.artifactId),
  };
}
