import crypto from "crypto";

export * from "@/modules/automation/contracts";

function stableSerializeJSON(value: JsonValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerializeJSON(entry)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, JsonValue | undefined>)
    .flatMap(([key, entryValue]) => (entryValue === undefined ? [] : [[key, entryValue] as const]))
    .sort(([a], [b]) => a.localeCompare(b));

  return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableSerializeJSON(val)}`).join(",")}}`;
}

export function computeStrategyHash(parameters: JsonValue): string {
  const serialized = stableSerializeJSON(parameters);
  return crypto.createHash("sha256").update(serialized).digest("hex");
}
