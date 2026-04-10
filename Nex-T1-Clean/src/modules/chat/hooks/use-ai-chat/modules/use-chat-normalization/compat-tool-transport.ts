import type { CompatMessageAccumulator } from "./compat-state";
import { getToolCallId, setCompletedToolPayload, setErrorToolPayload, setPendingToolPayload, setToolName } from "./compat-tool-shared";
import type { MessagePart } from "./types";

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

function resolveTransportToolState(part: MessagePart): string {
  if (typeof part.state === "string" && part.state.length > 0) {
    return part.state;
  }

  if (TRANSPORT_TOOL_STATES.has(part.type)) {
    return part.type.slice("tool-".length);
  }

  return part.output !== undefined || part.result !== undefined
    ? "output-available"
    : "input-available";
}

function resolveTransportToolName(
  part: MessagePart,
  accumulator: CompatMessageAccumulator,
  toolCallId: string,
): string {
  if (typeof part.toolName === "string" && part.toolName.length > 0) {
    return part.toolName;
  }

  const knownName = accumulator.toolNameByCallId.get(toolCallId);
  if (knownName) {
    return knownName;
  }

  const inferred = part.type.slice("tool-".length);
  return inferred.startsWith("input-") || inferred.startsWith("output-")
    ? "tool"
    : inferred || "tool";
}

function resolveTransportInput(
  part: MessagePart,
  accumulator: CompatMessageAccumulator,
  toolCallId: string,
): UntypedJson | undefined {
  let input = part.input ?? part.args ?? accumulator.toolMap.get(toolCallId)?.input;
  if (
    resolveTransportToolState(part) === "input-delta" &&
    typeof part.inputTextDelta === "string" &&
    part.inputTextDelta.length > 0
  ) {
    const bufferedInput = `${accumulator.toolInputBufferByCallId.get(toolCallId) ?? ""}${part.inputTextDelta}`;
    accumulator.toolInputBufferByCallId.set(toolCallId, bufferedInput);
    try {
      const parsed = JSON.parse(bufferedInput) as UntypedJson;
      if (parsed && typeof parsed === "object") {
        input = parsed;
      }
    } catch {
      return input;
    }
  } else if (part.input !== undefined) {
    if (typeof part.input === "string") {
      accumulator.toolInputBufferByCallId.set(toolCallId, part.input);
    } else {
      accumulator.toolInputBufferByCallId.delete(toolCallId);
    }
  }

  return input;
}

export function processTransportToolPart(
  part: MessagePart,
  accumulator: CompatMessageAccumulator,
): void {
  const toolCallId = getToolCallId(part, accumulator, part.type);
  const toolName = resolveTransportToolName(part, accumulator, toolCallId);
  const toolState = resolveTransportToolState(part);
  const input = resolveTransportInput(part, accumulator, toolCallId);

  setToolName(accumulator, toolCallId, toolName);
  if (toolState === "output-available") {
    setCompletedToolPayload(
      accumulator,
      toolCallId,
      toolName,
      input,
      part.output ?? part.result,
    );
    return;
  }

  if (
    toolState === "input-error" ||
    toolState === "output-error" ||
    toolState === "output-denied"
  ) {
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
