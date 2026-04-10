import type { ApiResponse } from "@/lib/api-platform";
import type { CoinMarketRow } from "@/types/market";

const MAX_UNWRAP_DEPTH = 2;

function isRecord(value: UntypedJson): value is Record<string, UntypedJson> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isApiEnvelope(value: UntypedJson): value is ApiResponse<UntypedJson> {
  return isRecord(value) && typeof value.success === "boolean" && "data" in value;
}

export function unwrapApiPayload<T>(payload: UntypedJson): T | null {
  let current: UntypedJson = payload;
  let depth = 0;

  while (depth < MAX_UNWRAP_DEPTH && isApiEnvelope(current)) {
    current = (current.data ?? null) as UntypedJson;
    depth += 1;
  }

  return (current as T | null) ?? null;
}

export function normalizeAssetRowsPayload(payload: UntypedJson): CoinMarketRow[] {
  const data = unwrapApiPayload<UntypedJson>(payload);
  return Array.isArray(data) ? (data as CoinMarketRow[]) : [];
}

export function normalizeRecordPayload<T extends Record<string, UntypedJson>>(payload: UntypedJson): T {
  const data = unwrapApiPayload<UntypedJson>(payload);
  if (!isRecord(data)) {
    return {} as T;
  }
  return data as T;
}
