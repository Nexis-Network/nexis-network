import type { AssistantPayload } from "@/components/dashboard/chat-types";
import {
  deriveCompatPayloadFromArtifactData,
  deriveCompatPayloadsFromParts,
} from "@/lib/chat/native-part-compat";
import { coerceNonEmptyString, isRecord } from "./guards";
import type { ToolExecutionPayload, ToolExecutionStatus } from "./types";

const TOOL_EXECUTION_STATUS_RANK: Record<ToolExecutionStatus, number> = {
  pending: 0,
  executing: 1,
  complete: 2,
  error: 2,
};

function getToolExecutionStatusRank(status: ToolExecutionStatus): number {
  return TOOL_EXECUTION_STATUS_RANK[status];
}

function createPayloadSignature(payload: AssistantPayload): string {
  try {
    return `${payload.type}:${JSON.stringify(payload)}`;
  } catch {
    return `${payload.type}:${String(payload)}`;
  }
}

function isToolExecutionPayload(
  payload: AssistantPayload,
): payload is ToolExecutionPayload {
  return payload.type === "tool-execution";
}

function isStructuredPayloadValue(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

function mergeToolExecutionPayloads(
  existing: ToolExecutionPayload,
  incoming: ToolExecutionPayload,
): ToolExecutionPayload {
  const status =
    getToolExecutionStatusRank(incoming.status) >=
    getToolExecutionStatusRank(existing.status)
      ? incoming.status
      : existing.status;
  const output =
    incoming.output === undefined
      ? existing.output
      : existing.output === undefined
        ? incoming.output
        : isStructuredPayloadValue(incoming.output) &&
            !isStructuredPayloadValue(existing.output)
          ? incoming.output
          : !isStructuredPayloadValue(incoming.output) &&
              isStructuredPayloadValue(existing.output)
            ? existing.output
            : incoming.output;

  return {
    ...existing,
    ...incoming,
    status,
    ...(existing.input !== undefined || incoming.input !== undefined
      ? { input: incoming.input ?? existing.input }
      : {}),
    ...(output !== undefined ? { output } : {}),
    ...(incoming.error ?? existing.error
      ? { error: incoming.error ?? existing.error }
      : {}),
    ...(incoming.executionTime ?? existing.executionTime
      ? { executionTime: incoming.executionTime ?? existing.executionTime }
      : {}),
  };
}

export function dedupeAssistantPayloads(
  payloads: AssistantPayload[],
): AssistantPayload[] {
  if (payloads.length < 2) {
    return payloads;
  }

  const seen = new Set<string>();
  const deduped: AssistantPayload[] = [];
  const toolPayloadIndexByKey = new Map<string, number>();

  for (const payload of payloads) {
    if (isToolExecutionPayload(payload) && payload.toolCallId) {
      const key = `tool:${payload.toolCallId}`;
      const existingIndex = toolPayloadIndexByKey.get(key);
      if (existingIndex !== undefined) {
        deduped[existingIndex] = mergeToolExecutionPayloads(
          deduped[existingIndex] as ToolExecutionPayload,
          payload,
        );
        continue;
      }

      toolPayloadIndexByKey.set(key, deduped.length);
      deduped.push(payload);
      continue;
    }

    const signature = createPayloadSignature(payload);
    if (seen.has(signature)) {
      continue;
    }

    seen.add(signature);
    deduped.push(payload);
  }

  return deduped;
}

export function deriveCompatPayloadsFromToolResult(
  result: unknown,
): AssistantPayload[] {
  if (!isRecord(result)) {
    return [];
  }

  const compatPayloads: AssistantPayload[] = [];

  if (Array.isArray(result.parts)) {
    compatPayloads.push(
      ...deriveCompatPayloadsFromParts(result.parts, {
        includeRightPanelArtifacts: false,
      }),
    );
  }

  const artifactContainer = isRecord(result.artifact) ? result.artifact : result;
  const artifactType =
    coerceNonEmptyString(artifactContainer.artifactType) ??
    coerceNonEmptyString(artifactContainer.type);
  const artifactPayload =
    artifactContainer.payload ??
    result.payload ??
    (isRecord(result.result) ? result.result.payload : undefined);

  if (artifactType && artifactPayload !== undefined) {
    const compatPayload = deriveCompatPayloadFromArtifactData(
      artifactType,
      artifactPayload as UntypedJson,
      { includeRightPanelArtifacts: false },
    );
    if (compatPayload) {
      compatPayloads.push(compatPayload);
    }
  }

  if (isRecord(result.result) && result.result !== result) {
    compatPayloads.push(...deriveCompatPayloadsFromToolResult(result.result));
  }

  return compatPayloads;
}
