import { describe, expect, it } from "vitest";

import {
  normalizePortfolioChainKey,
  portfolioChainMatchesFilter,
  toPortfolioRequestChainId,
} from "@/lib/portfolio/chain-filter";
import type { JsonObject } from "@/types/json";

describe("normalizePortfolioChainKey", () => {
  it("normalizes known aliases and numeric forms", () => {
    expect(normalizePortfolioChainKey("ethereum")).toBe("ethereum");
    expect(normalizePortfolioChainKey("0x1")).toBe("ethereum");
    expect(normalizePortfolioChainKey("eip155:8453")).toBe("base");
    expect(normalizePortfolioChainKey(42161)).toBe("arbitrum");
    expect(normalizePortfolioChainKey("101")).toBe("solana");
  });
});

describe("portfolioChainMatchesFilter", () => {
  it("matches numeric wallet chain values against slug filters", () => {
    expect(portfolioChainMatchesFilter(8453, "base")).toBe(true);
    expect(portfolioChainMatchesFilter("0xa", "optimism")).toBe(true);
    expect(portfolioChainMatchesFilter("eip155:1", "ethereum")).toBe(true);
    expect(portfolioChainMatchesFilter(42161, "base")).toBe(false);
  });
});

describe("toPortfolioRequestChainId", () => {
  it("resolves solana hints from wallet context", () => {
    expect(
      toPortfolioRequestChainId(undefined, {
        walletType: "external_solana",
      }),
    ).toBe("solana");
  });

  it("resolves evm chain ids from string metadata", () => {
    expect(
      toPortfolioRequestChainId(undefined, {
        metadata: {
          chainId: "eip155:8453",
        } satisfies JsonObject,
      }),
    ).toBe(8453);
  });

  it("returns null for unsupported stellar wallet context", () => {
    expect(
      toPortfolioRequestChainId(undefined, {
        metadata: {
          kind: "stellar",
        } satisfies JsonObject,
      }),
    ).toBeNull();
  });
});
