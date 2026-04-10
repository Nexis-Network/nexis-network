import { createHash } from "node:crypto";

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortValue((value as Record<string, unknown>)[key]);
        return accumulator;
      }, {});
  }

  return value;
}

export function canonicalizeInsightInput(input: unknown): string {
  return JSON.stringify(sortValue(input));
}

export function hashNormalizedInsightInput(input: unknown): string {
  return createHash("sha256")
    .update(canonicalizeInsightInput(input))
    .digest("hex");
}
