import type { CompatMessageAccumulator } from "./compat-state";
import {
  isCanonicalAIEventPart,
  processAgentStatusPayload,
  processAIEventPayload,
  processHandoffPayload,
  processStatusPayload,
} from "./compat-ai-event-parts";
import {
  processArtifactPayload,
  processGenericPayload,
} from "./compat-artifact-payload-parts";
import type { MessagePart } from "./types";

export function processPayloadPart(
  part: MessagePart,
  accumulator: CompatMessageAccumulator,
): boolean {
  if (part.type === "data-status") {
    return processStatusPayload(part, accumulator);
  }

  if (part.type === "data-handoff" || part.type === "data-agent-handoff") {
    return processHandoffPayload(part, accumulator);
  }

  if (part.type === "data-agent-status") {
    return processAgentStatusPayload(part, accumulator);
  }

  if (isCanonicalAIEventPart(part)) {
    return processAIEventPayload(part, accumulator);
  }

  if (part.type === "data-payload" || part.type === "payload") {
    return processGenericPayload(part, accumulator);
  }

  if (part.type.startsWith("data-artifact-")) {
    return processArtifactPayload(part, accumulator);
  }

  return false;
}
