import type { AIEvent } from "@/lib/schema";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coerceNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function ensureSentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function getSourceLabel(url: string, title?: string | null): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return title?.trim() || url;
  }
}

function readApprovalPreviewTitle(preview: unknown): string | null {
  if (!isRecord(preview)) {
    return null;
  }

  return coerceNonEmptyString(preview.title);
}

function describeApprovalRequired(
  event: Extract<AIEvent, { type: "approval_required" }>,
): string {
  const previewTitle = readApprovalPreviewTitle(event.preview);
  if (previewTitle) {
    return ensureSentence(`Awaiting approval for ${previewTitle}`);
  }

  if (event.toolName) {
    return ensureSentence(
      `Awaiting approval for ${humanizeFallbackLabel(event.toolName)}`,
    );
  }

  return "Awaiting approval.";
}

function describeApprovalUpdate(
  event: Extract<AIEvent, { type: "approval_update" }>,
): string | null {
  switch (event.state) {
    case "approved":
    case "auto_approved":
      return "Approval approved.";
    case "rejected":
    case "denied":
      return "Approval rejected.";
    case "expired":
      return "Approval expired.";
    case "cancelled":
      return "Approval cancelled.";
    case "failed":
    case "error":
      return "Approval failed.";
    case "completed":
      return "Approval completed.";
    default:
      return null;
  }
}

function describeConfirmationRequest(
  event: Extract<AIEvent, { type: "confirmation_request" }>,
): string {
  return ensureSentence(`Confirmation required: ${event.summary}`);
}

function describeConfirmationResponse(
  event: Extract<AIEvent, { type: "confirmation_response" }>,
): string {
  if (event.status === "approved") {
    return "Confirmation approved.";
  }

  if (event.error) {
    return ensureSentence(`Confirmation rejected: ${event.error}`);
  }

  return "Confirmation rejected.";
}

export function humanizeFallbackLabel(value: string): string {
  return value
    .replace(/^data-/, "")
    .replace(/^tool-/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function describeFallbackEvent(event: AIEvent): string | null {
  switch (event.type) {
    case "artifact_update":
      return `Artifact shared: ${humanizeFallbackLabel(event.artifactType ?? event.artifactId)}.`;
    case "approval_required":
      return describeApprovalRequired(event);
    case "approval_update":
      return describeApprovalUpdate(event);
    case "agent_handoff":
      return null;
    case "citation":
      return `Source attached: ${getSourceLabel(event.url, event.title)}.`;
    case "confirmation_request":
      return describeConfirmationRequest(event);
    case "confirmation_response":
      return describeConfirmationResponse(event);
    case "image_output":
      return "Image generated.";
    case "jsx_output":
      return "Live component ready.";
    case "message_delta":
      return null;
    case "reasoning_update":
      return null;
    case "sandbox_start":
      return null;
    case "sandbox_stream":
      return null;
    case "sources":
      return `Collected ${event.sources.length} source${event.sources.length === 1 ? "" : "s"}.`;
    case "task_update":
      return null;
    case "terminal_stream":
      return null;
    case "test_result":
      return null;
    case "tool_call":
      return null;
    case "tool_result":
      return null;
    case "transcription_output":
      return "Transcription ready.";
    case "web_preview_output":
      return event.url ? "Web preview available." : "Rendering web preview.";
    case "workflow_update":
      return null;
  }
}
