import type { AIEvent } from "@/lib/schema";
import {
  extractAIEventFromPart,
  extractNativeMessageState,
} from "@/modules/chat/ui-message-parts";
import {
  describeFallbackEvent,
  humanizeFallbackLabel,
} from "@/modules/chat/ui-fallback-event-text";
import {
  coerceNonEmptyString,
  describeApprovalRequest,
  describeDataPayload,
  describePayload,
  readArtifactDescriptor,
  type BasicMessagePart,
} from "@/modules/chat/ui-fallback-descriptors";

type DeriveStructuredFallbackTextArgs = {
  role: "assistant" | "user" | "system" | string;
  content?: string | null;
  parts?: Array<unknown> | null;
  payloads?: Array<unknown> | null;
};

function describeEvent(event: AIEvent): string | null {
  return describeFallbackEvent(event);
}

export function deriveStructuredFallbackText({
  role: _role,
  content,
  parts,
  payloads,
}: DeriveStructuredFallbackTextArgs): string {
  const trimmedContent =
    typeof content === "string" ? content.trim() : "";
  if (trimmedContent) {
    return trimmedContent;
  }

  const safeParts = Array.isArray(parts) ? parts : [];
  const nativeState = extractNativeMessageState(safeParts);
  const firstArtifact =
    nativeState.ideArtifacts[0] ?? nativeState.artifactCards[0] ?? null;

  if (firstArtifact) {
    const descriptor =
      readArtifactDescriptor(firstArtifact.data) ??
      coerceNonEmptyString(firstArtifact.title) ??
      humanizeFallbackLabel(firstArtifact.artifactType);
    return `Artifact shared: ${descriptor}.`;
  }

  if (nativeState.ideSession?.title) {
    return `Artifact shared: ${nativeState.ideSession.title}.`;
  }

  if (nativeState.latestEvent) {
    const describedEvent = describeEvent(nativeState.latestEvent);
    if (describedEvent) {
      return describedEvent;
    }
  }

  for (const rawPart of safeParts as BasicMessagePart[]) {
    const type = coerceNonEmptyString(rawPart.type) ?? "";
    if (!type) {
      continue;
    }

    const approvalDescription = describeApprovalRequest(rawPart);
    if (approvalDescription) {
      return approvalDescription;
    }

    if (
      type === "tool-call" ||
      type === "tool-invocation" ||
      type === "dynamic-tool" ||
      type.startsWith("tool-")
    ) {
      const toolName =
        coerceNonEmptyString(rawPart.toolName) ??
        (type.startsWith("tool-") ? type.replace(/^tool-/, "") : "tool");

      if (toolName === "emit_artifact") {
        const descriptor =
          readArtifactDescriptor(rawPart.output) ??
          readArtifactDescriptor(rawPart.result) ??
          readArtifactDescriptor(rawPart.input) ??
          readArtifactDescriptor(rawPart.args) ??
          "generated artifact";
        return `Artifact shared: ${descriptor}.`;
      }

      continue;
    }

    const aiEvent = extractAIEventFromPart(rawPart);
    if (aiEvent) {
      const describedEvent = describeEvent(aiEvent);
      if (describedEvent) {
        return describedEvent;
      }
    }

    if (type === "data-payload" || type === "payload") {
      const payloadDescription =
        describeDataPayload(rawPart.data) ??
        describeDataPayload(rawPart.output) ??
        describeDataPayload(rawPart.result);
      if (payloadDescription) {
        return payloadDescription;
      }
    }

    if (type.startsWith("data-")) {
      continue;
    }
  }

  const safePayloads = Array.isArray(payloads) ? payloads : [];
  for (const rawPayload of safePayloads) {
    const payloadDescription = describePayload(rawPayload);
    if (payloadDescription) {
      return payloadDescription;
    }
  }

  return "";
}
