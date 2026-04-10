import { describe, expect, it } from "vitest";

import type { AggregatedPortfolio } from "@/server/services/portfolio-service";
import { normalizeAggregatedPortfolioPayload } from "@/lib/hooks/use-aggregated-portfolio";

const samplePortfolio: AggregatedPortfolio = {
  totalNetWorthUsd: 1250.5,
  wallets: [],
  assets: [],
  transactions: [],
  lastRefreshed: "2026-01-01T00:00:00.000Z",
};

describe("normalizeAggregatedPortfolioPayload", () => {
  it("unwraps apiResponse.success payloads", () => {
    const result = normalizeAggregatedPortfolioPayload({
      success: true,
      data: samplePortfolio,
    });

    expect(result).toEqual(samplePortfolio);
  });

  it("supports raw portfolio payloads", () => {
    const result = normalizeAggregatedPortfolioPayload(samplePortfolio);

    expect(result).toEqual(samplePortfolio);
  });

  it("supports nested apiResponse.success payloads", () => {
    const result = normalizeAggregatedPortfolioPayload({
      success: true,
      data: {
        success: true,
        data: samplePortfolio,
      },
    });

    expect(result).toEqual(samplePortfolio);
  });

  it("returns a safe empty portfolio for malformed payloads", () => {
    const result = normalizeAggregatedPortfolioPayload({ success: true, data: { foo: "bar" } });

    expect(result.totalNetWorthUsd).toBe(0);
    expect(result.wallets).toEqual([]);
    expect(result.assets).toEqual([]);
    expect(result.transactions).toEqual([]);
    expect(typeof result.lastRefreshed).toBe("string");
  });
});
