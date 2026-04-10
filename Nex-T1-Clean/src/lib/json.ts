import type { JsonArray, JsonObject, JsonValue } from "@/types/json";

export function isJsonObject(value: unknown): value is JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function asJsonObject(value: unknown): JsonObject | null {
  return isJsonObject(value) ? value : null;
}

export function isJsonArray(value: unknown): value is JsonArray {
  return Array.isArray(value);
}

export function asJsonArray(value: unknown): JsonArray | null {
  return isJsonArray(value) ? value : null;
}

export function readJsonString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readJsonNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function readJsonBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export function getJsonValue(record: JsonObject | null | undefined, key: string): JsonValue | undefined {
  return record?.[key];
}

export function getJsonObject(record: JsonObject | null | undefined, key: string): JsonObject | null {
  return asJsonObject(getJsonValue(record, key));
}

export function getJsonArray(record: JsonObject | null | undefined, key: string): JsonArray | null {
  return asJsonArray(getJsonValue(record, key));
}

export function getJsonString(record: JsonObject | null | undefined, key: string): string | null {
  return readJsonString(getJsonValue(record, key));
}

export function getJsonNumber(record: JsonObject | null | undefined, key: string): number | null {
  return readJsonNumber(getJsonValue(record, key));
}

export function getJsonBoolean(record: JsonObject | null | undefined, key: string): boolean | null {
  return readJsonBoolean(getJsonValue(record, key));
}
