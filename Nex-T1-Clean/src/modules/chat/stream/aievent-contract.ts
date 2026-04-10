import type { AIEvent } from "@/lib/schema";

export const AI_EVENT_TYPES = [
  "message_delta",
  "reasoning_update",
  "citation",
  "sources",
  "tool_call",
  "tool_result",
  "artifact_update",
  "agent_handoff",
  "approval_required",
  "approval_update",
  "sandbox_start",
  "sandbox_stream",
  "terminal_stream",
  "workflow_update",
  "task_update",
  "test_result",
  "confirmation_request",
  "confirmation_response",
  "image_output",
  "transcription_output",
  "jsx_output",
  "web_preview_output",
] as const;

type AIEventType = (typeof AI_EVENT_TYPES)[number];

const AI_EVENT_TYPE_SET = new Set<string>(AI_EVENT_TYPES);

const ARTIFACT_STATUSES = new Set(["pending", "running", "completed", "failed"]);
const WORKFLOW_STATUSES = new Set(["pending", "running", "completed", "failed"]);
const TASK_STATUSES = new Set(["pending", "in_progress", "done", "error"]);
const TEST_STATUSES = new Set(["pass", "fail", "warn", "info"]);
const CONFIRMATION_STATUSES = new Set(["approved", "rejected"]);
const SANDBOX_STREAM_TYPES = new Set(["stdout", "stderr"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toOptionalString = (value: unknown): string | undefined => {
  const normalized = toString(value);
  return normalized ?? undefined;
};

const toOptionalNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const toBoolean = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => toString(entry))
    .filter((entry): entry is string => Boolean(entry));
};

const coerceStatus = <T extends string>(
  value: unknown,
  allowed: Set<string>,
  fallback: T,
): T => {
  const normalized = toString(value)?.toLowerCase();
  if (normalized && allowed.has(normalized)) {
    return normalized as T;
  }
  return fallback;
};

const normalizeSources = (value: unknown): Array<{ id: string; url: string; title: string }> => {
  if (!Array.isArray(value)) return [];

  return value
    .map((source, index) => {
      if (!isRecord(source)) return null;
      const id = toString(source.id) ?? `source-${index}`;
      const url = toString(source.url);
      const title = toString(source.title) ?? "Source";
      if (!url) return null;
      return { id, url, title };
    })
    .filter((entry): entry is { id: string; url: string; title: string } => Boolean(entry));
};

export function isAIEventType(type: string): type is AIEventType {
  return AI_EVENT_TYPE_SET.has(type);
}

export function normalizeAIEventPayload(payload: unknown): AIEvent | null {
  if (!isRecord(payload)) return null;

  const eventType = toString(payload.type);
  if (!eventType || !isAIEventType(eventType)) {
    return null;
  }

  switch (eventType) {
    case "message_delta": {
      const textChunk = toString(payload.textChunk ?? payload.text ?? payload.delta);
      if (!textChunk) return null;
      return { type: "message_delta", textChunk };
    }
    case "reasoning_update": {
      const reasoningChunk = toString(payload.reasoningChunk ?? payload.text ?? payload.delta);
      const isComplete = toBoolean(payload.isComplete);
      if (!reasoningChunk || isComplete === null) return null;
      return { type: "reasoning_update", reasoningChunk, isComplete };
    }
    case "citation": {
      const url = toString(payload.url);
      if (!url) return null;
      return {
        type: "citation",
        url,
        title: toOptionalString(payload.title),
        snippet: toOptionalString(payload.snippet),
      };
    }
    case "sources": {
      const sources = normalizeSources(payload.sources);
      if (sources.length === 0) return null;
      return { type: "sources", sources };
    }
    case "tool_call": {
      const toolCallId = toString(payload.toolCallId ?? payload.id);
      const toolName = toString(payload.toolName ?? payload.name);
      if (!toolCallId || !toolName) return null;
      const args: Record<string, unknown> = isRecord(payload.args ?? payload.input)
        ? ((payload.args ?? payload.input) as Record<string, unknown>)
        : {};
      return { type: "tool_call", toolCallId, toolName, args };
    }
    case "tool_result": {
      const toolCallId = toString(payload.toolCallId ?? payload.id);
      const toolName = toString(payload.toolName ?? payload.name);
      if (!toolCallId || !toolName) return null;
      return {
        type: "tool_result",
        toolCallId,
        toolName,
        result: payload.result ?? payload.output ?? null,
        isError: toBoolean(payload.isError) ?? false,
      };
    }
    case "artifact_update": {
      const artifactId = toString(payload.artifactId ?? payload.identifier ?? payload.id);
      if (!artifactId) return null;
      const status = coerceStatus<
        "pending" | "running" | "completed" | "failed"
      >(payload.status, ARTIFACT_STATUSES, "running");
      return {
        type: "artifact_update",
        artifactId,
        artifactType: toOptionalString(payload.artifactType),
        status,
        progress: toOptionalNumber(payload.progress),
        error: toOptionalString(payload.error),
      };
    }
    case "agent_handoff": {
      const toAgent = toString(payload.toAgent ?? payload.to);
      if (!toAgent) return null;
      return {
        type: "agent_handoff",
        fromAgent: toOptionalString(payload.fromAgent ?? payload.from),
        toAgent,
        reason: toOptionalString(payload.reason ?? payload.message),
        metadata: isRecord(payload.metadata)
          ? payload.metadata
          : isRecord(payload)
            ? payload
            : undefined,
      };
    }
    case "approval_required":
      return {
        type: "approval_required",
        approvalId: toOptionalString(payload.approvalId),
        preview: isRecord(payload.preview) ? payload.preview : undefined,
        expiresAt: toOptionalString(payload.expiresAt),
        toolName: toOptionalString(payload.toolName),
      };
    case "approval_update":
      return {
        type: "approval_update",
        approvalId: toOptionalString(payload.approvalId),
        state: toOptionalString(payload.state),
      };
    case "sandbox_start": {
      const sandboxId = toString(payload.sandboxId ?? payload.id);
      const template = toString(payload.template);
      if (!sandboxId || !template) return null;
      return { type: "sandbox_start", sandboxId, template };
    }
    case "sandbox_stream": {
      const sandboxId = toString(payload.sandboxId ?? payload.id);
      if (!sandboxId) return null;
      const streamType = coerceStatus<"stdout" | "stderr">(
        payload.streamType,
        SANDBOX_STREAM_TYPES,
        "stdout",
      );
      const data = toString(payload.data ?? payload.output ?? payload.text);
      if (!data) return null;
      return { type: "sandbox_stream", sandboxId, streamType, data };
    }
    case "terminal_stream": {
      const command = toString(payload.command);
      const output = toString(payload.output ?? payload.data ?? payload.text);
      const isComplete = toBoolean(payload.isComplete);
      if (!command || output === null || isComplete === null) return null;
      return { type: "terminal_stream", command, output, isComplete };
    }
    case "workflow_update": {
      const workflowId = toString(payload.workflowId ?? payload.id);
      const stepName = toString(payload.stepName ?? payload.step ?? payload.agent);
      if (!workflowId || !stepName) return null;
      const status = coerceStatus<
        "pending" | "running" | "completed" | "failed"
      >(payload.status, WORKFLOW_STATUSES, "running");
      return {
        type: "workflow_update",
        workflowId,
        status,
        stepName,
        progress: toOptionalNumber(payload.progress),
      };
    }
    case "task_update": {
      const taskId = toString(payload.taskId ?? payload.id);
      const title = toString(payload.title ?? payload.taskName ?? payload.stepName);
      if (!taskId || !title) return null;
      const blockers = toStringArray(payload.blockers);
      const verification = toStringArray(payload.verification);
      const completedVerification = toStringArray(payload.completedVerification);
      const verificationSummary =
        verification.length > 0
          ? `Verification ${completedVerification.length}/${verification.length} complete`
          : null;
      const blockerSummary =
        blockers.length > 0
          ? `${blockers.length} blocker${blockers.length === 1 ? "" : "s"}`
          : null;
      const derivedDescription = [verificationSummary, blockerSummary]
        .filter(Boolean)
        .join(" • ");
      const description =
        toOptionalString(payload.description ?? payload.summary) ??
        (derivedDescription || undefined);
      const status = coerceStatus<
        "pending" | "in_progress" | "done" | "error"
      >(payload.status, TASK_STATUSES, "in_progress");
      return { type: "task_update", taskId, title, status, description };
    }
    case "test_result": {
      const testId = toString(payload.testId ?? payload.id);
      const name = toString(payload.name ?? payload.testName ?? payload.title);
      if (!testId || !name) return null;
      const status = coerceStatus<"pass" | "fail" | "warn" | "info">(
        payload.status,
        TEST_STATUSES,
        "info",
      );
      return {
        type: "test_result",
        testId,
        name,
        status,
        metadata: isRecord(payload.metadata) ? payload.metadata : undefined,
      };
    }
    case "confirmation_request": {
      const confirmationId = toString(payload.confirmationId ?? payload.id);
      const action = toString(payload.action);
      const summary = toString(payload.summary);
      if (!confirmationId || !action || !summary) return null;
      const rawPayload = isRecord(payload.payload) ? payload.payload : {};
      const riskLevel = toOptionalString(payload.riskLevel) as
        | "low"
        | "medium"
        | "high"
        | undefined;
      return {
        type: "confirmation_request",
        confirmationId,
        action,
        summary,
        payload: rawPayload,
        riskLevel,
      };
    }
    case "confirmation_response": {
      const confirmationId = toString(payload.confirmationId ?? payload.id);
      if (!confirmationId) return null;
      const status = coerceStatus<"approved" | "rejected">(
        payload.status,
        CONFIRMATION_STATUSES,
        "rejected",
      );
      return {
        type: "confirmation_response",
        confirmationId,
        status,
        txHash: toOptionalString(payload.txHash),
        error: toOptionalString(payload.error),
      };
    }
    case "image_output": {
      const url = toString(payload.url);
      if (!url) return null;
      return {
        type: "image_output",
        url,
        alt: toOptionalString(payload.alt),
        width: toOptionalNumber(payload.width),
        height: toOptionalNumber(payload.height),
      };
    }
    case "transcription_output": {
      const text = toString(payload.text);
      const isFinal = toBoolean(payload.isFinal);
      if (!text || isFinal === null) return null;
      return {
        type: "transcription_output",
        text,
        isFinal,
        sourceId: toOptionalString(payload.sourceId),
      };
    }
    case "jsx_output": {
      const code = toString(payload.code);
      const isComplete = toBoolean(payload.isComplete);
      if (!code || isComplete === null) return null;
      return { type: "jsx_output", code, isComplete };
    }
    case "web_preview_output": {
      const html = toString(payload.html ?? payload.code);
      const isComplete = toBoolean(payload.isComplete);
      if (!html || isComplete === null) return null;
      return {
        type: "web_preview_output",
        html,
        url: toOptionalString(payload.url),
        isComplete,
      };
    }
    default:
      return null;
  }
}
