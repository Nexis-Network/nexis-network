import {
  getToolName,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  type UIDataTypes,
  type UIMessagePart,
  type UITools,
} from "ai";

import type { AIEvent } from "@/lib/schema";
import {
  isAIEventType,
  normalizeAIEventPayload,
} from "@/modules/chat/stream/aievent-contract";

import {
  NATIVE_CHECKPOINT_PART,
  NATIVE_IDE_PART,
  NATIVE_QUEUE_PART,
  NATIVE_TASK_PART,
  NATIVE_TEST_RESULTS_PART,
  NATIVE_WORKFLOW_PART,
} from "./constants";
import type {
  ChatFileUIPart,
  LegacyImageUIPart,
  ChatReasoningUIPart,
  ChatTextUIPart,
  ChatToolUIPart,
  NativeArtifactCardPart,
  NativeCheckpointPart,
  NativeIdeSessionPart,
  NativeQueuePart,
  NativeTaskPart,
  NativeTestResultsPart,
  NativeWorkflowCanvasPart,
} from "./types";
import type { JsonValue } from "@/types/json";
import { asRecord, isRecord } from "./utils";

export function isChatTextUIPart(part: unknown): part is ChatTextUIPart {
  return isRecord(part) && isTextUIPart(part as UIMessagePart<UIDataTypes, UITools>);
}

export function isChatReasoningUIPart(part: unknown): part is ChatReasoningUIPart {
  return isRecord(part) && isReasoningUIPart(part as UIMessagePart<UIDataTypes, UITools>);
}

export function isChatImageUIPart(
  part: unknown,
): part is LegacyImageUIPart {
  return isRecord(part) && part.type === "image";
}

export function isChatFileUIPart(part: unknown): part is ChatFileUIPart {
  return isRecord(part) && part.type === "file";
}

export function isLegacyToolCallUIPart(
  part: unknown,
): part is Extract<ChatToolUIPart, { type: "tool-call" | "tool-invocation" }> {
  return isRecord(part) && (part.type === "tool-call" || part.type === "tool-invocation");
}

export function isChatToolUIPart(part: unknown): part is ChatToolUIPart {
  return (
    isLegacyToolCallUIPart(part) ||
    (isRecord(part) && isToolUIPart(part as UIMessagePart<UIDataTypes, UITools>))
  );
}

export function getChatToolPartName(part: ChatToolUIPart): string {
  if (isLegacyToolCallUIPart(part)) {
    return typeof part.toolName === "string" && part.toolName.length > 0
      ? part.toolName
      : part.type.replace(/^tool-/, "");
  }

  return getToolName(part);
}

export function getChatToolPartCallId(part: ChatToolUIPart): string | undefined {
  if (typeof part.toolCallId === "string" && part.toolCallId.length > 0) {
    return part.toolCallId;
  }

  return "id" in part && typeof part.id === "string" && part.id.length > 0
    ? part.id
    : undefined;
}

export function getChatToolPartInput(part: ChatToolUIPart): JsonValue {
  if ("args" in part && part.args !== undefined) return part.args as JsonValue;
  if ("input" in part && part.input !== undefined) return part.input as JsonValue;
  return null;
}

export function getChatToolPartOutput(part: ChatToolUIPart): JsonValue {
  if ("result" in part && part.result !== undefined) return part.result as JsonValue;
  if ("output" in part && part.output !== undefined) return part.output as JsonValue;
  return null;
}

export function getChatToolPartState(part: ChatToolUIPart): string | null {
  return typeof part.state === "string" && part.state.length > 0 ? part.state : null;
}

export function isNativeIdeSessionPart(part: unknown): part is NativeIdeSessionPart {
  return isRecord(part) && part.type === NATIVE_IDE_PART && isRecord(part.data);
}

export function isNativeWorkflowCanvasPart(
  part: unknown,
): part is NativeWorkflowCanvasPart {
  return isRecord(part) && part.type === NATIVE_WORKFLOW_PART && isRecord(part.data);
}

export function isNativeArtifactCardPart(
  part: unknown,
): part is NativeArtifactCardPart {
  return isRecord(part) && part.type === "data-artifact-card" && isRecord(part.data);
}

export function isNativeTaskPart(part: unknown): part is NativeTaskPart {
  return isRecord(part) && part.type === NATIVE_TASK_PART && isRecord(part.data);
}

export function isNativeQueuePart(part: unknown): part is NativeQueuePart {
  return isRecord(part) && part.type === NATIVE_QUEUE_PART && isRecord(part.data);
}

export function isNativeCheckpointPart(part: unknown): part is NativeCheckpointPart {
  return isRecord(part) && part.type === NATIVE_CHECKPOINT_PART && isRecord(part.data);
}

export function isNativeTestResultsPart(
  part: unknown,
): part is NativeTestResultsPart {
  return isRecord(part) && part.type === NATIVE_TEST_RESULTS_PART && isRecord(part.data);
}

export function extractAIEventFromPart(part: unknown): AIEvent | null {
  const record = asRecord(part);
  if (typeof record.type !== "string") {
    return null;
  }

  const directPayload = "data" in record ? record.data : record;
  if (record.type === "data-aievent" || record.type === "data-payload") {
    return normalizeAIEventPayload(directPayload) as AIEvent | null;
  }

  return isAIEventType(record.type)
    ? (normalizeAIEventPayload(directPayload) as AIEvent | null)
    : null;
}
