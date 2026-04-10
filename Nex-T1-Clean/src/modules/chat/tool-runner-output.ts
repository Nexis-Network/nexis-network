import { formatToolNameForUser, summarizeResultForUser } from "./tool-planning";
import type { ToolModelOutput } from "./tool-runner-types";

import { logger } from "@/lib/logger";

const MAX_MODEL_TOOL_OUTPUT_CHARS = 12_000;

export function sanitizeToolOutputForModel(
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
): unknown {
  if (value == null) {
    return value;
  }

  if (depth > 12) {
    return "[Truncated]";
  }

  const valueType = typeof value;
  if (
    valueType === "string" ||
    valueType === "number" ||
    valueType === "boolean"
  ) {
    return value;
  }

  if (valueType === "bigint") {
    return value.toString();
  }

  if (valueType === "symbol") {
    return String(value);
  }

  if (valueType === "function") {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (ArrayBuffer.isView(value)) {
    return Array.from(value as Uint8Array);
  }

  if (value instanceof Map) {
    return Object.fromEntries(
      Array.from(value.entries()).map(([entryKey, entryValue]) => [
        String(entryKey),
        sanitizeToolOutputForModel(entryValue, seen, depth + 1),
      ]),
    );
  }

  if (value instanceof Set) {
    return Array.from(value.values()).map((entry) =>
      sanitizeToolOutputForModel(entry, seen, depth + 1),
    );
  }

  if (Array.isArray(value)) {
    return value.map((entry) =>
      sanitizeToolOutputForModel(entry, seen, depth + 1),
    );
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([entryKey, entryValue]) => [
          entryKey,
          sanitizeToolOutputForModel(entryValue, seen, depth + 1),
        ])
        .filter(([, entryValue]) => entryValue !== undefined),
    );
  }

  return String(value);
}

export function serializeToolOutputForModel(
  toolName: string,
  output: unknown,
): string {
  if (typeof output === "string") {
    return output.length > MAX_MODEL_TOOL_OUTPUT_CHARS
      ? `${output.slice(0, MAX_MODEL_TOOL_OUTPUT_CHARS - 1)}…`
      : output;
  }

  const summary = summarizeResultForUser(toolName, output as UntypedJson);

  try {
    const sanitized = sanitizeToolOutputForModel(output);
    const serialized = JSON.stringify(sanitized);
    if (!serialized || serialized === "null") {
      return summary;
    }

    if (serialized.length <= MAX_MODEL_TOOL_OUTPUT_CHARS) {
      return summary === `Completed ${formatToolNameForUser(toolName)}`
        ? serialized
        : `${summary}\n\n${serialized}`;
    }

    const remaining =
      MAX_MODEL_TOOL_OUTPUT_CHARS - Math.min(summary.length + 2, 2048);
    const truncated =
      remaining > 16 ? `${serialized.slice(0, remaining - 1)}…` : serialized;
    return `${summary}\n\n${truncated}`;
  } catch (error) {
    logger.warn(
      `[ToolController] Failed to serialize model output for "${toolName}":`,
      error,
    );
    return summary;
  }
}

export function createDefaultToolModelOutput(
  toolName: string,
  options: {
    toolCallId: string;
    input: UntypedJson;
    output: UntypedJson;
  },
): ToolModelOutput {
  return {
    type: "text",
    value: serializeToolOutputForModel(toolName, options.output),
  };
}
