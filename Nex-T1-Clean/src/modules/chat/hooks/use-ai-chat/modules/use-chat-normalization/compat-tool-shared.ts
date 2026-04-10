import { deriveCompatPayloadsFromToolResult } from "./payload-utils";
import type { CompatMessageAccumulator } from "./compat-state";
import type { ToolExecutionPayload } from "./types";

export function setToolName(
  accumulator: CompatMessageAccumulator,
  toolCallId: string,
  toolName: string,
): void {
  accumulator.toolNameByCallId.set(toolCallId, toolName);
}

export function readToolName(
  accumulator: CompatMessageAccumulator,
  toolCallId: string,
  fallback = "tool",
): string {
  return accumulator.toolNameByCallId.get(toolCallId) ?? fallback;
}

export function setPendingToolPayload(
  accumulator: CompatMessageAccumulator,
  toolCallId: string,
  toolName: string,
  input?: UntypedJson,
): void {
  accumulator.toolMap.set(toolCallId, {
    type: "tool-execution",
    toolCallId,
    toolName,
    status: "pending",
    input,
  });
}

export function setErrorToolPayload(
  accumulator: CompatMessageAccumulator,
  toolCallId: string,
  toolName: string,
  input: UntypedJson | undefined,
  error: string,
): void {
  accumulator.toolMap.set(toolCallId, {
    type: "tool-execution",
    toolCallId,
    toolName,
    status: "error",
    input,
    error,
  });
}

export function setCompletedToolPayload(
  accumulator: CompatMessageAccumulator,
  toolCallId: string,
  toolName: string,
  input: UntypedJson | undefined,
  output: UntypedJson,
): void {
  accumulator.toolMap.set(toolCallId, {
    type: "tool-execution",
    toolCallId,
    toolName,
    status: "complete",
    input,
    output,
  });
  accumulator.payloads.push(...deriveCompatPayloadsFromToolResult(output));
}

export function getToolCallId(
  part: {
    type?: string;
    id?: unknown;
    toolName?: unknown;
    toolCallId?: unknown;
  },
  accumulator: CompatMessageAccumulator,
  fallbackPrefix = "tool",
): string {
  return (
    (typeof part.toolCallId === "string" && part.toolCallId) ||
    (typeof part.id === "string" && part.id) ||
    accumulator.createSyntheticId(
      `${fallbackPrefix}-${part.toolName ?? part.type ?? "call"}`,
    )
  );
}

export function readExistingToolPayload(
  accumulator: CompatMessageAccumulator,
  toolCallId: string,
  toolName: string,
): ToolExecutionPayload {
  return (
    accumulator.toolMap.get(toolCallId) ?? {
      type: "tool-execution",
      toolCallId,
      toolName,
      status: "pending",
    }
  );
}
