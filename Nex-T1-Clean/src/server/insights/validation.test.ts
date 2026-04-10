import { describe, expect, it } from "vitest";

import {
  countSentences,
  ensureValidInsightOutput,
  resolveAssetInsightTtlHours,
  validateInsightSentence,
} from "@/server/insights/validation";

describe("AI insight validation", () => {
  it("counts a single sentence correctly", () => {
    expect(countSentences("BTC remains resilient on elevated volume.")).toBe(1);
  });

  it("rejects multi-sentence output", () => {
    expect(() =>
      validateInsightSentence("BTC is firm today. SOL is following higher."),
    ).toThrow("exactly one sentence");
  });

  it("rejects empty output", () => {
    expect(() => validateInsightSentence("   ")).toThrow("cannot be empty");
  });

  it("rejects advice language", () => {
    expect(() =>
      validateInsightSentence("You should buy BTC while momentum is strong."),
    ).toThrow("financial advice");
  });

  it("normalizes valid structured output", () => {
    expect(
      ensureValidInsightOutput({
        sentence: "BTC is up 3.1% in 24h on stronger spot activity.",
        reasonCodes: [" price_strength "],
        confidence: 0.8123,
        category: "asset",
      }),
    ).toEqual({
      sentence: "BTC is up 3.1% in 24h on stronger spot activity.",
      reasonCodes: ["price_strength"],
      confidence: 0.81,
      category: "asset",
    });
  });

  it("clamps the asset TTL into the supported range", () => {
    expect(resolveAssetInsightTtlHours({ AI_INSIGHTS_ASSET_TTL_HOURS: "0" })).toBe(1);
    expect(resolveAssetInsightTtlHours({ AI_INSIGHTS_ASSET_TTL_HOURS: "99" })).toBe(6);
    expect(resolveAssetInsightTtlHours({ AI_INSIGHTS_ASSET_TTL_HOURS: "4" })).toBe(4);
  });
});
