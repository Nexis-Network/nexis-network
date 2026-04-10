"use client";

import { asRecord, coerceString } from "@/components/artifacts/sandbox-workbench-utils";

const MAX_DEPTH = 3;
const MAX_OBJECT_KEYS = 12;
const MAX_ARRAY_ITEMS = 6;
const MAX_STRING_INLINE_LENGTH = 48;
const MAX_STRING_EDGE_LENGTH = 24;
const MAX_HASH_SAMPLES = 128;

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sampleStringHash(value: string): string {
  if (value.length === 0) {
    return "0";
  }

  const step = Math.max(1, Math.floor(value.length / MAX_HASH_SAMPLES));
  let hash = 0;

  for (let index = 0; index < value.length; index += step) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16);
}

function sampleStringEdges(value: string): string {
  if (value.length <= MAX_STRING_INLINE_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_EDGE_LENGTH)}...${value.slice(-MAX_STRING_EDGE_LENGTH)}`;
}

export function summarizeValueForFingerprint(
  value: unknown,
  depth = 0,
): unknown {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }

  if (typeof value === "string") {
    if (value.length <= MAX_STRING_INLINE_LENGTH) {
      return value;
    }

    return {
      type: "string",
      length: value.length,
      hash: sampleStringHash(value),
      sample: sampleStringEdges(value),
    };
  }

  if (depth >= MAX_DEPTH) {
    if (Array.isArray(value)) {
      return {
        type: "array",
        length: value.length,
      };
    }

    if (isObjectLike(value)) {
      const keys = Object.keys(value).sort();
      return {
        type: "object",
        keyCount: keys.length,
        keys: keys.slice(0, MAX_OBJECT_KEYS),
      };
    }

    return String(value);
  }

  if (Array.isArray(value)) {
    const headCount = Math.ceil(MAX_ARRAY_ITEMS / 2);
    const tailCount = Math.floor(MAX_ARRAY_ITEMS / 2);
    const head = value.slice(0, headCount);
    const tail =
      value.length > MAX_ARRAY_ITEMS ? value.slice(-tailCount) : [];

    return {
      type: "array",
      length: value.length,
      items: [...head, ...tail].map((entry) =>
        summarizeValueForFingerprint(entry, depth + 1),
      ),
    };
  }

  if (isObjectLike(value)) {
    const keys = Object.keys(value).sort();
    const headCount = Math.ceil(MAX_OBJECT_KEYS / 2);
    const tailCount = Math.floor(MAX_OBJECT_KEYS / 2);
    const sampledKeys = Array.from(
      new Set([
        ...keys.slice(0, headCount),
        ...(keys.length > MAX_OBJECT_KEYS ? keys.slice(-tailCount) : []),
      ]),
    );

    return {
      type: "object",
      keyCount: keys.length,
      entries: sampledKeys.map((key) => [
        key,
        summarizeValueForFingerprint(value[key], depth + 1),
      ]),
    };
  }

  return String(value);
}

export function buildCompactFingerprint(value: unknown): string {
  return JSON.stringify(summarizeValueForFingerprint(value));
}

export function buildWorkbenchToolFingerprint(
  activeTool?: UntypedJson | null,
): string {
  const record = asRecord(activeTool ?? null);

  return buildCompactFingerprint({
    toolCallId: coerceString(record.toolCallId) ?? coerceString(record.id) ?? "",
    toolName: coerceString(record.toolName) ?? "",
    state: coerceString(record.state) ?? "",
    args: record.args ?? null,
    result: record.result ?? null,
  });
}

export function buildWorkbenchEventFingerprint(
  activeEvent?: UntypedJson | null,
): string {
  const record = asRecord(activeEvent ?? null);
  const completionState =
    record.isComplete === true
      ? "complete"
      : record.isComplete === false
        ? "incomplete"
        : "";

  return buildCompactFingerprint({
    type: coerceString(record.type) ?? "",
    id:
      coerceString(record.workflowId) ??
      coerceString(record.taskId) ??
      coerceString(record.confirmationId) ??
      coerceString(record.sandboxId) ??
      "",
    status:
      coerceString(record.status) ??
      coerceString(record.state) ??
      completionState ??
      "",
    payload: record,
  });
}
