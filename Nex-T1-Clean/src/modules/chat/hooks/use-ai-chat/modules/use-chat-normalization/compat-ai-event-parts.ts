import type { AssistantPayload } from "@/components/dashboard/chat-types";
import { isAIEventType, normalizeAIEventPayload } from "@/modules/chat/stream/aievent-contract";
import type { CompatMessageAccumulator } from "./compat-state";
import { coerceNonEmptyString, isRecord } from "./guards";
import type { MessagePart } from "./types";

function pushCitation(
  accumulator: CompatMessageAccumulator,
  citation: {
    url: string;
    title?: string;
    snippet?: string;
  },
): void {
  accumulator.sources.push({
    id: citation.url,
    title: citation.title ?? citation.url,
    url: citation.url,
    ...(citation.snippet ? { snippet: citation.snippet } : {}),
  });
}

export function processStatusPayload(
  part: MessagePart,
  accumulator: CompatMessageAccumulator,
): boolean {
  if (!isRecord(part.data)) {
    return true;
  }

  const status = coerceNonEmptyString(part.data.status) ?? "running";
  accumulator.payloads.push({
    type: "artifact_update",
    artifactId:
      coerceNonEmptyString(part.data.identifier) ??
      coerceNonEmptyString(part.data.id) ??
      coerceNonEmptyString(part.id) ??
      accumulator.createSyntheticId("artifact"),
    artifactType:
      coerceNonEmptyString(part.data.artifactType) ??
      coerceNonEmptyString(part.data.type) ??
      undefined,
    status:
      status === "pending" ||
      status === "running" ||
      status === "completed" ||
      status === "failed"
        ? status
        : "running",
    progress:
      typeof part.data.progress === "number" ? part.data.progress : undefined,
    error:
      typeof part.data.error === "string" ? part.data.error : undefined,
  });
  return true;
}

export function processHandoffPayload(
  part: MessagePart,
  accumulator: CompatMessageAccumulator,
): boolean {
  const data = isRecord(part.data) ? part.data : {};
  accumulator.payloads.push({
    type: "agent_handoff",
    fromAgent:
      coerceNonEmptyString(data.fromAgent) ??
      coerceNonEmptyString(data.from) ??
      undefined,
    toAgent:
      coerceNonEmptyString(data.toAgent) ??
      coerceNonEmptyString(data.to) ??
      "specialist",
    reason:
      coerceNonEmptyString(data.reason) ??
      coerceNonEmptyString(data.message) ??
      undefined,
    metadata: isRecord(data) ? data : undefined,
  } as AssistantPayload);
  return true;
}

export function processAgentStatusPayload(
  part: MessagePart,
  accumulator: CompatMessageAccumulator,
): boolean {
  const data = isRecord(part.data) ? part.data : {};
  const status =
    data.status === "routing"
      ? "pending"
      : data.status === "completing"
        ? "completed"
        : "running";

  accumulator.payloads.push({
    type: "workflow_update",
    workflowId: "agent-router",
    status,
    stepName: coerceNonEmptyString(data.agent) ?? "router",
    progress: status === "completed" ? 100 : status === "running" ? 50 : 10,
  } as AssistantPayload);
  return true;
}

export function processAIEventPayload(
  part: MessagePart,
  accumulator: CompatMessageAccumulator,
): boolean {
  const fallbackType = part.type.replace(/^data-/, "");
  const rawEvent = part.data ?? part.output ?? part.result ?? part;
  if (!isRecord(rawEvent)) {
    return true;
  }

  const normalizedEvent = normalizeAIEventPayload(
    "type" in rawEvent ? rawEvent : { ...rawEvent, type: fallbackType },
  );
  if (!normalizedEvent) {
    return true;
  }

  accumulator.payloads.push(normalizedEvent as AssistantPayload);
  if (normalizedEvent.type === "reasoning_update") {
    accumulator.thoughts.push({
      thought: normalizedEvent.reasoningChunk,
      ideaFragment: "",
    });
  } else if (normalizedEvent.type === "citation") {
    pushCitation(accumulator, normalizedEvent);
  } else if (normalizedEvent.type === "sources") {
    accumulator.sources.push(
      ...normalizedEvent.sources.map((source) => ({
        id: source.id,
        title: source.title,
        url: source.url,
      })),
    );
  } else if (normalizedEvent.type === "web_preview_output" && normalizedEvent.url) {
    accumulator.payloads.push({
      type: "web-preview",
      url: normalizedEvent.url,
    });
  }

  return true;
}

export function isCanonicalAIEventPart(part: MessagePart): boolean {
  return part.type === "data-aievent" || isAIEventType(part.type.replace(/^data-/, ""));
}
