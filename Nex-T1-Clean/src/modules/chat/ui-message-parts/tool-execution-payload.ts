import type { UnknownRecord } from "./types";
import { asRecord, coerceString } from "./utils";

export type ToolExecutionPayloadPart = {
  type: "tool-execution";
  toolName?: string;
  status?: string;
  input?: unknown;
  output?: unknown;
};

const TRANSPORT_TOOL_STATES = new Set([
  "tool-input-start",
  "tool-input-delta",
  "tool-input-available",
  "tool-input-streaming",
  "tool-input-error",
  "tool-output-available",
  "tool-output-error",
  "tool-output-denied",
]);

export function extractToolExecutionPayloadFromPart(
  part: unknown,
): ToolExecutionPayloadPart | null {
  const record = asRecord(part);
  if (typeof record.type !== "string") {
    return null;
  }

  if (record.type === "data-payload") {
    const payload = asRecord(record.data);
    return payload.type === "tool-execution"
      ? (payload as ToolExecutionPayloadPart)
      : null;
  }

  if (!record.type.startsWith("tool-")) {
    return null;
  }

  return {
    type: "tool-execution",
    toolName: resolveToolExecutionName(record),
    status: normalizeToolExecutionStatus(record),
    input: record.input ?? record.args,
    output: record.output ?? record.result,
  };
}

function resolveToolExecutionName(record: UnknownRecord): string | undefined {
  const toolNameFromPayload = coerceString(record.toolName) ?? undefined;
  const inferredToolName = String(record.type).replace(/^tool-/, "");
  const looksLikeTransportState =
    TRANSPORT_TOOL_STATES.has(String(record.type)) ||
    inferredToolName.startsWith("input-") ||
    inferredToolName.startsWith("output-");

  return looksLikeTransportState
    ? toolNameFromPayload
    : inferredToolName || toolNameFromPayload;
}

function normalizeToolExecutionStatus(record: UnknownRecord): string {
  const state =
    coerceString(record.state) ??
    resolveTransportState(String(record.type)) ??
    (record.output !== undefined || record.result !== undefined
      ? "output-available"
      : "input-available");

  if (state === "output-available") return "complete";
  if (
    state === "input-error" ||
    state === "output-error" ||
    state === "output-denied"
  ) {
    return "error";
  }
  return "pending";
}

function resolveTransportState(type: string): string | undefined {
  return TRANSPORT_TOOL_STATES.has(type) ? type.replace(/^tool-/, "") : undefined;
}
