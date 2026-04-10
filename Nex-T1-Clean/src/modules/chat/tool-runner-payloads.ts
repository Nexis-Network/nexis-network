import { normalizeAIEventPayload } from "@/modules/chat/stream/aievent-contract";

import type {
  ToolEventEmitter,
  ToolPayloadRecord,
  WrappedToolResult,
} from "./tool-runner-types";

type ToolExecutionPayloadStatus =
  | "pending"
  | "executing"
  | "completed"
  | "error"
  | "security_blocked";

type BuildToolExecutionPayloadArgs = {
  id: string;
  toolCallId?: string;
  toolName: string;
  status: ToolExecutionPayloadStatus;
  input: UntypedJson;
  output?: UntypedJson;
  error?: string;
  executionTime?: number;
  securityBlocked?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPayloadRecordArray(
  value: unknown,
): value is Array<Record<string, UntypedJson>> {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
    )
  );
}

function extractPrompt(input: UntypedJson): string {
  return isRecord(input) && typeof input.prompt === "string"
    ? input.prompt
    : "Generated image";
}

function extractRevisedPrompt(resultPayload: UntypedJson): string | undefined {
  return isRecord(resultPayload) && typeof resultPayload.text === "string"
    ? resultPayload.text
    : undefined;
}

export function buildToolExecutionPayload(
  args: BuildToolExecutionPayloadArgs,
): ToolPayloadRecord {
  return {
    type: "tool-execution",
    id: args.id,
    ...(args.toolCallId ? { toolCallId: args.toolCallId } : {}),
    toolName: args.toolName,
    status: args.status,
    input: args.input,
    ...(args.output !== undefined ? { output: args.output } : {}),
    ...(args.error ? { error: args.error } : {}),
    ...(typeof args.executionTime === "number"
      ? { executionTime: args.executionTime }
      : {}),
    ...(args.securityBlocked ? { securityBlocked: true } : {}),
  };
}

export function emitPayloadBatch(
  emitEvent: ToolEventEmitter,
  payloads: ToolPayloadRecord[],
) {
  if (payloads.length > 0) emitEvent("payloads", payloads);
}

export function extractStreamPayloadsFromChunk(
  chunk: UntypedJson,
): ToolPayloadRecord[] {
  if (!chunk || typeof chunk !== "object" || Array.isArray(chunk)) {
    return [];
  }

  const chunkRecord = chunk as Record<string, UntypedJson>;

  if (chunkRecord.type === "payloads" && isPayloadRecordArray(chunkRecord.payloads)) {
    return chunkRecord.payloads;
  }

  const normalizedEvent = normalizeAIEventPayload(chunkRecord);
  if (!normalizedEvent) {
    return [];
  }

  return [normalizedEvent as unknown as ToolPayloadRecord];
}

export function extractWrappedToolResult(
  chunk: UntypedJson,
): WrappedToolResult | null {
  if (!chunk || typeof chunk !== "object" || Array.isArray(chunk)) {
    return null;
  }

  const chunkRecord = chunk as Record<string, UntypedJson>;
  if (!("result" in chunkRecord)) {
    return null;
  }

  if (typeof chunkRecord.state === "string") {
    return { result: chunkRecord.result };
  }

  const keys = Object.keys(chunkRecord);
  return keys.length === 1 && keys[0] === "result"
    ? { result: chunkRecord.result }
    : null;
}

export async function* toAsyncToolResultIterator(
  executionResult: unknown,
): AsyncGenerator<UntypedJson, void, void> {
  const resolvedResult = await Promise.resolve(executionResult);

  if (
    resolvedResult &&
    typeof resolvedResult === "object" &&
    Symbol.asyncIterator in resolvedResult
  ) {
    yield* resolvedResult as AsyncIterable<UntypedJson>;
    return;
  }

  yield resolvedResult as UntypedJson;
}

export function buildImageArtifactPayloads(args: {
  input: UntypedJson;
  resultPayload: UntypedJson;
}): ToolPayloadRecord[] {
  if (!isRecord(args.resultPayload) || !Array.isArray(args.resultPayload.images)) {
    return [];
  }

  const revisedPrompt = extractRevisedPrompt(args.resultPayload);
  const payloads: ToolPayloadRecord[] = [];

  for (const image of args.resultPayload.images) {
    if (!isRecord(image)) {
      continue;
    }

    const url =
      typeof image.url === "string"
        ? image.url
        : typeof image.b64_json === "string"
          ? `data:${typeof image.mime_type === "string" ? image.mime_type : "image/png"};base64,${image.b64_json}`
          : null;

    if (!url) {
      continue;
    }

    payloads.push({
      type: "image-artifact",
      url,
      prompt: extractPrompt(args.input),
      ...(revisedPrompt ? { revisedPrompt } : {}),
    });
  }

  return payloads;
}
