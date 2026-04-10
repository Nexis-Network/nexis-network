import type { ApiResponse } from "@/lib/api-platform/response";

const MAX_UNWRAP_DEPTH = 3;

type JsonRecord = Record<string, UntypedJson>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isApiEnvelope(value: unknown): value is ApiResponse<UntypedJson> {
  return isRecord(value) && typeof value.success === "boolean" && ("data" in value || "error" in value);
}

export function unwrapApiPayload<T>(payload: unknown): T | null {
  let current: unknown = payload;
  let depth = 0;

  while (depth < MAX_UNWRAP_DEPTH && isApiEnvelope(current)) {
    current = current.data ?? null;
    depth += 1;
  }

  if (current === null || current === undefined) {
    return null;
  }

  return current as T;
}

export function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) {
    return fallback;
  }

  const error = payload.error;
  if (isRecord(error) && typeof error.message === "string" && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof payload.message === "string" && payload.message.trim().length > 0) {
    return payload.message;
  }

  return fallback;
}
