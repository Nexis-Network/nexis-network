import type { CompatMessageAccumulator } from "./compat-state";
import { deriveCompatPayloadsFromToolResult } from "./payload-utils";
import {
  getToolCallId,
  readExistingToolPayload,
  readToolName,
  setCompletedToolPayload,
  setErrorToolPayload,
  setPendingToolPayload,
  setToolName,
} from "./compat-tool-shared";
import { processTransportToolPart } from "./compat-tool-transport";
import type {
  MessagePart,
  ToolExecutionPayload,
  ToolInvocationCompat,
} from "./types";

function processToolCallPart(
  part: MessagePart,
  accumulator: CompatMessageAccumulator,
): void {
  const toolCallId = getToolCallId(part, accumulator);
  const toolName =
    (typeof part.toolName === "string" && part.toolName) || readToolName(accumulator, toolCallId);
  const input = part.args ?? part.input;
  const output = part.result ?? part.output;
  const state = typeof part.state === "string" ? part.state : "";

  setToolName(accumulator, toolCallId, toolName);
  if (state === "result" || output !== undefined) {
    setCompletedToolPayload(accumulator, toolCallId, toolName, input, output);
    return;
  }

  if (state === "error" || state === "output-error") {
    setErrorToolPayload(
      accumulator,
      toolCallId,
      toolName,
      input,
      (typeof part.errorText === "string" && part.errorText) ||
        (typeof part.error === "string" && part.error) ||
        "Tool execution failed",
    );
    return;
  }

  setPendingToolPayload(accumulator, toolCallId, toolName, input);
}

function processToolResultPart(
  part: MessagePart,
  accumulator: CompatMessageAccumulator,
): void {
  const toolCallId = getToolCallId(part, accumulator);
  const toolName =
    (typeof part.toolName === "string" && part.toolName) || readToolName(accumulator, toolCallId);
  const existing = readExistingToolPayload(accumulator, toolCallId, toolName);
  const output = part.result ?? part.output;

  setToolName(accumulator, toolCallId, toolName);
  accumulator.toolMap.set(toolCallId, {
    ...existing,
    toolCallId,
    status: "complete",
    output,
  });
  accumulator.payloads.push(...deriveCompatPayloadsFromToolResult(output));
}

function processLegacyToolStatusPart(
  part: MessagePart,
  accumulator: CompatMessageAccumulator,
): void {
  const data = (part.data ?? {}) as Record<string, UntypedJson>;
  const toolCallId =
    (typeof data.toolCallId === "string" && data.toolCallId) ||
    (typeof part.id === "string" && part.id) ||
    accumulator.createSyntheticId("tool");
  const toolName =
    (typeof data.toolName === "string" && data.toolName) || readToolName(accumulator, toolCallId);

  setToolName(accumulator, toolCallId, toolName);
  if (part.type === "data-tool-call") {
    setPendingToolPayload(accumulator, toolCallId, toolName, data.input);
    return;
  }

  if (part.type === "data-tool-error") {
    setErrorToolPayload(
      accumulator,
      toolCallId,
      toolName,
      accumulator.toolMap.get(toolCallId)?.input,
      (typeof data.errorText === "string" && data.errorText) ||
        (typeof part.errorText === "string" && part.errorText) ||
        (typeof part.error === "string" && part.error) ||
        "Tool error",
    );
    return;
  }

  const output = data.output ?? part.output ?? part.result ?? part.text;
  accumulator.toolMap.set(toolCallId, {
    ...readExistingToolPayload(accumulator, toolCallId, toolName),
    toolCallId,
    status: "complete",
    output,
  });

  if (output && typeof output === "object" && typeof output.type === "string") {
    accumulator.payloads.push(output as ToolExecutionPayload);
  }
}
export function processToolInvocations(
  toolInvocations: ToolInvocationCompat[] | undefined,
  accumulator: CompatMessageAccumulator,
): void {
  if (!Array.isArray(toolInvocations)) {
    return;
  }

  for (const invocation of toolInvocations) {
    const toolName =
      (typeof invocation.toolName === "string" && invocation.toolName) || "tool";
    const toolCallId =
      (typeof invocation.toolCallId === "string" && invocation.toolCallId) ||
      (typeof invocation.id === "string" && invocation.id) ||
      accumulator.createSyntheticId(toolName);

    setToolName(accumulator, toolCallId, toolName);
    if (invocation.state === "result") {
      setCompletedToolPayload(
        accumulator,
        toolCallId,
        toolName,
        invocation.args,
        invocation.result,
      );
      continue;
    }

    setPendingToolPayload(accumulator, toolCallId, toolName, invocation.args);
  }
}

export function processToolPart(
  part: MessagePart,
  accumulator: CompatMessageAccumulator,
): boolean {
  switch (part.type) {
    case "tool-invocation":
    case "tool-call":
      processToolCallPart(part, accumulator);
      return true;
    case "tool-result":
      processToolResultPart(part, accumulator);
      return true;
    case "data-tool-call":
    case "data-tool-result":
    case "data-tool-error":
      processLegacyToolStatusPart(part, accumulator);
      return true;
    default:
      if (!part.type.startsWith("tool-")) {
        return false;
      }

      processTransportToolPart(part, accumulator);
      return true;
  }
}
