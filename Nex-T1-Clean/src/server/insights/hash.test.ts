import { describe, expect, it } from "vitest";

import {
  canonicalizeInsightInput,
  hashNormalizedInsightInput,
} from "@/server/insights/hash";

describe("AI insight hashing", () => {
  it("canonicalizes object keys before hashing", () => {
    const left = {
      scope: "asset",
      features: {
        priceUsd: 100,
        change24hPercent: 4.2,
      },
      subjectKey: "bitcoin",
    };
    const right = {
      subjectKey: "bitcoin",
      features: {
        change24hPercent: 4.2,
        priceUsd: 100,
      },
      scope: "asset",
    };

    expect(canonicalizeInsightInput(left)).toBe(canonicalizeInsightInput(right));
    expect(hashNormalizedInsightInput(left)).toBe(hashNormalizedInsightInput(right));
  });
});
