import { describe, expect, it } from "vitest";

import { watchlistItemInputSchema } from "./validation";

describe("watchlistItemInputSchema", () => {
  it("rejects non-json metadata payloads", () => {
    const result = watchlistItemInputSchema.safeParse({
      assetType: "EVM_ERC20",
      chainName: "ethereum",
      addressOrMint: "0x0000000000000000000000000000000000000001",
      sourceSite: "dexscreener",
      sourceUrl: "https://dexscreener.com/ethereum/0x0000000000000000000000000000000000000001",
      confidence: 0.8,
      metadata: {
        handler: () => "not-json",
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects evidence entries that are not json objects", () => {
    const result = watchlistItemInputSchema.safeParse({
      assetType: "SOL_SPL",
      chainName: "solana",
      addressOrMint: "So11111111111111111111111111111111111111112",
      sourceSite: "birdeye",
      sourceUrl: "https://birdeye.so/token/So11111111111111111111111111111111111111112",
      confidence: 0.95,
      evidence: [
        {
          summary: "ok",
          nested: {
            invalid: Symbol("not-json"),
          },
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
