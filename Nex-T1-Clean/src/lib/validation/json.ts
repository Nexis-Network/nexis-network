import { z } from "zod";
import type { JsonObject, JsonValue } from "@/types/json";

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const jsonRecordSchema = z.record(z.string(), jsonValueSchema);

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;

  switch (typeof value) {
    case "string":
    case "number":
    case "boolean":
      return true;
    case "object":
      if (Array.isArray(value)) {
        return value.every((entry) => isJsonValue(entry));
      }

      return Object.values(value).every((entry) => entry === undefined || isJsonValue(entry));
    default:
      return false;
  }
}

export function isJsonRecord(value: unknown): value is JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value) && isJsonValue(value);
}
