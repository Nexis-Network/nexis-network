import type { AssistantPayload } from "@/components/dashboard/chat-types";
import { deriveCompatPayloadsFromParts } from "@/lib/chat/native-part-compat";
import type { AIAgentStream, Source } from "@/lib/schema";
import { sanitizeAssistantTranscriptText } from "@/modules/chat/pipeline/response/planning-filter";
import { isTransientProgressAssistantMessage } from "@/modules/chat/transient-progress-message";
import { deriveFallbackText, mergeOverlappingText } from "./fallback";
import { dedupeAssistantPayloads } from "./payload-utils";
import { dedupeSources } from "./sources";
import type {
  AnyUIMessage,
  MessagePart,
  NexChatMessage,
  ToolExecutionPayload,
} from "./types";

export type CompatMessageAccumulator = {
  content: string;
  deltaTextParts: string[];
  fullTextParts: string[];
  parts: MessagePart[];
  payloads: AssistantPayload[];
  sources: Source[];
  thoughts: AIAgentStream[];
  toolInputBufferByCallId: Map<string, string>;
  toolMap: Map<string, ToolExecutionPayload>;
  toolNameByCallId: Map<string, string>;
  createSyntheticId: (prefix: string) => string;
};

export function createCompatMessageAccumulator(
  message: AnyUIMessage,
): CompatMessageAccumulator {
  const parts = Array.isArray(message.parts) ? (message.parts as MessagePart[]) : [];
  let syntheticIndex = 0;

  return {
    content: typeof message.content === "string" ? message.content : "",
    deltaTextParts: [],
    fullTextParts: [],
    parts,
    payloads: [],
    sources: [],
    thoughts: [],
    toolInputBufferByCallId: new Map<string, string>(),
    toolMap: new Map<string, ToolExecutionPayload>(),
    toolNameByCallId: new Map<string, string>(),
    createSyntheticId: (prefix: string) => `${message.id}-${prefix}-${syntheticIndex++}`,
  };
}

function resolveContent(
  message: AnyUIMessage,
  accumulator: CompatMessageAccumulator,
): string {
  if (accumulator.fullTextParts.length > 0) {
    return mergeOverlappingText(accumulator.fullTextParts);
  }

  if (accumulator.deltaTextParts.length > 0) {
    return mergeOverlappingText(accumulator.deltaTextParts);
  }

  if (message.role === "assistant" && !accumulator.content) {
    return deriveFallbackText({
      id: message.id,
      role: "assistant",
      content: "",
      parts: accumulator.parts,
      payloads: accumulator.payloads,
    });
  }

  return accumulator.content;
}

export function finalizeCompatMessage(
  message: AnyUIMessage,
  accumulator: CompatMessageAccumulator,
): NexChatMessage {
  const normalizedRole =
    message.role === "user"
      ? "user"
      : message.role === "system"
        ? "system"
        : "assistant";
  let content = resolveContent(message, accumulator);

  if (normalizedRole === "assistant") {
    content = sanitizeAssistantTranscriptText(content);
  }

  if (!content.trim()) {
    content = deriveFallbackText({
      ...(message as NexChatMessage),
      content,
      parts: accumulator.parts,
      payloads: accumulator.payloads,
    });
  }

  if (
    isTransientProgressAssistantMessage({
      role: message.role,
      content,
      parts: accumulator.parts,
    })
  ) {
    content = "";
  }

  return {
    id: message.id,
    role: normalizedRole,
    content,
    createdAt: message.createdAt ? new Date(message.createdAt) : undefined,
    parts: accumulator.parts,
    thoughts: accumulator.thoughts,
    payloads: dedupeAssistantPayloads([
      ...accumulator.payloads,
      ...deriveCompatPayloadsFromParts(accumulator.parts, {
        includeRightPanelArtifacts: false,
      }),
      ...accumulator.toolMap.values(),
    ]),
    sources: dedupeSources(accumulator.sources),
  };
}
