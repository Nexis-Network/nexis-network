import { isRightPanelOnlyArtifactType } from "@/modules/chat/artifact-surfaces";
import { normalizeAIEventPayload } from "@/modules/chat/stream/aievent-contract";
import { describeFallbackEvent, humanizeFallbackLabel } from "@/modules/chat/ui-fallback-event-text";

export type BasicMessagePart = {
  type?: unknown;
  toolName?: unknown;
  data?: unknown;
  input?: unknown;
  output?: unknown;
  result?: unknown;
  args?: unknown;
  state?: unknown;
};

type BasicPayload = {
  type?: unknown;
  toolName?: unknown;
  status?: unknown;
  data?: unknown;
  input?: unknown;
  output?: unknown;
  result?: unknown;
  filename?: unknown;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function coerceNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readArtifactDescriptor(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const title = coerceNonEmptyString(value.title);
  if (title) return title;
  if (isRecord(value.payload)) {
    const payloadTitle = coerceNonEmptyString(value.payload.title);
    if (payloadTitle) return payloadTitle;
  }
  return (
    coerceNonEmptyString(value.artifactType) ??
    coerceNonEmptyString(value.type)
  );
}

export function describeDataPayload(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const type = coerceNonEmptyString(value.type);
  if (!type) return null;
  if (type === "web-preview") return "Web preview available.";
  if (type === "market-terminal") {
    const nestedTitle = isRecord(value.data)
      ? coerceNonEmptyString(value.data.title)
      : null;
    const descriptor =
      nestedTitle ??
      readArtifactDescriptor(value.data) ??
      readArtifactDescriptor(value) ??
      "Market Terminal";
    return `Artifact shared: ${descriptor}.`;
  }

  return `Structured result ready: ${humanizeFallbackLabel(type)}.`;
}

export function describeApprovalRequest(part: BasicMessagePart): string | null {
  if (coerceNonEmptyString(part.state) !== "approval-requested") return null;
  const toolName =
    coerceNonEmptyString(part.toolName) ??
    (coerceNonEmptyString(part.type)?.startsWith("tool-")
      ? coerceNonEmptyString(part.type)?.replace(/^tool-/, "") ?? null
      : null);
  if (!toolName) return "Awaiting approval.";
  return `Awaiting approval for ${humanizeFallbackLabel(toolName)}.`;
}

function describeToolExecutionPayload(payload: BasicPayload): string | null {
  const toolName = coerceNonEmptyString(payload.toolName);
  const status = coerceNonEmptyString(payload.status);

  if (toolName === "emit_artifact") {
    const descriptor =
      readArtifactDescriptor(payload.output) ??
      readArtifactDescriptor(payload.result) ??
      readArtifactDescriptor(payload.input) ??
      "generated artifact";
    return `Artifact shared: ${descriptor}.`;
  }

  if (status === "error") {
    return toolName
      ? `Tool failed: ${humanizeFallbackLabel(toolName)}.`
      : "Tool failed.";
  }

  if (status === "complete") {
    return toolName
      ? `Completed ${humanizeFallbackLabel(toolName)}.`
      : "Tool completed.";
  }

  return null;
}

export function describePayload(rawPayload: unknown): string | null {
  if (!isRecord(rawPayload)) return null;
  const normalizedEvent = normalizeAIEventPayload(rawPayload);
  if (normalizedEvent) return describeFallbackEvent(normalizedEvent);
  const payload = rawPayload as BasicPayload;
  const type = coerceNonEmptyString(payload.type);
  if (!type) return null;
  if (type === "tool-execution") return describeToolExecutionPayload(payload);
  if (type === "image-artifact") return "Image generated.";

  if (type === "file-analysis") {
    const descriptor =
      coerceNonEmptyString(payload.filename) ??
      readArtifactDescriptor(payload.data) ??
      "Attachment";
    return `Artifact shared: ${descriptor}.`;
  }
  if (type === "web-preview") return "Web preview available.";

  if (isRightPanelOnlyArtifactType(type)) {
    const descriptor =
      readArtifactDescriptor(payload.data) ??
      readArtifactDescriptor(payload) ??
      humanizeFallbackLabel(type);
    return `Artifact shared: ${descriptor}.`;
  }

  return (
    describeDataPayload(payload) ??
    describeDataPayload(payload.data) ??
    describeDataPayload(payload.output) ??
    describeDataPayload(payload.result)
  );
}
