import "server-only";
import { asJsonObject, readJsonNumber, readJsonString } from "@/lib/json";
import type { JsonObject } from "@/types/json";

export function toNumber(value: unknown): number | null {
  return readJsonNumber(value);
}

export function toStringOrNull(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return readJsonString(value);
}

export function asRecord(value: unknown): JsonObject | null {
  return asJsonObject(value);
}
