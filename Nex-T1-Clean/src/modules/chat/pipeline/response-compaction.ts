import type { StructuredChatPayload } from "@/modules/chat/types";
import type { PipelineContext } from "@/modules/chat/pipeline/context-builder";
import {
  mergeStructuredCompactionState,
  readStructuredCompactionState,
  writeStructuredCompactionState,
  type StructuredCompactionDelta,
  type StructuredCompactionState,
} from "@/modules/chat/state/compaction-store";
import { getResponseContextEnvelope } from "@/modules/chat/pipeline/response-artifacts";

const trimSummary = (value: string, max = 200): string => {
  const normalized = value.trim();
  return normalized.length > max
    ? `${normalized.slice(0, Math.max(0, max - 1))}…`
    : normalized;
};

export function buildResponseCompactionDelta(
  aggregated: StructuredChatPayload,
  context: PipelineContext,
): StructuredCompactionDelta {
  const contextEnvelope = getResponseContextEnvelope(
    context as Partial<PipelineContext>,
  );
  const toolOutcomes = (aggregated.toolCalls ?? [])
    .filter((tool) => tool.status === "complete" || tool.status === "error")
    .map((tool) =>
      tool.summary ? `${tool.name}: ${tool.summary}` : `${tool.name}: ${tool.status}`,
    )
    .slice(0, 12);
  const artifactRefs = (aggregated.artifactRefs ?? [])
    .map((artifact) => `${artifact.artifactType}:${artifact.artifactId}`)
    .slice(0, 12);
  const blockerGraph = contextEnvelope.memory.blockerGraph
    .map((entry) => `${entry.taskId}<-[${entry.blockedBy.join(", ")}]`)
    .slice(0, 12);

  const decisionLog: string[] = [];
  const verifiedFacts: string[] = [];
  const unresolvedQuestions: string[] = [];
  const message = aggregated.message.trim();
  if (message.length > 0) {
    const firstSentence = trimSummary(message.split(/[.!?]\s/, 1)[0] ?? message);
    if (firstSentence) {
      decisionLog.push(firstSentence);
    }
    if (/verified|confirmed|based on|checked/i.test(message)) {
      verifiedFacts.push(firstSentence);
    }
    if (/\?$/.test(message)) {
      unresolvedQuestions.push(trimSummary(message, 160));
    }
  }

  return {
    decisionLog,
    verifiedFacts,
    unresolvedQuestions,
    toolOutcomes,
    artifactRefs,
    blockerGraph,
  };
}

export async function persistStructuredCompaction(args: {
  aggregated: StructuredChatPayload;
  context: PipelineContext;
}): Promise<StructuredCompactionState | null> {
  const sessionId = args.context.request.sessionId ?? null;
  if (!sessionId) return null;

  const previous = await readStructuredCompactionState(sessionId);
  const next = mergeStructuredCompactionState(
    previous,
    buildResponseCompactionDelta(args.aggregated, args.context),
    sessionId,
  );
  await writeStructuredCompactionState(next);
  return next;
}
