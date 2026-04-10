import { describe, expect, it } from "vitest";

import { SOLANA_CHAIN_ID } from "@/modules/tokens/chains";
import { normalizeExternalTokenListPayload } from "@/modules/tokens/server/external-token-list-normalizer";

describe("external token list normalizer", () => {
  it("normalizes standard token-list payloads into unsupported registry entries", () => {
    const entries = normalizeExternalTokenListPayload(
      {
        id: "uniswap",
        name: "Uniswap",
        url: "https://tokens.uniswap.org",
      },
      {
        tokens: [
          {
            chainId: 1,
            address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            symbol: "USDC",
            name: "USD Coin",
            decimals: 6,
            logoURI: "https://example.com/usdc.png",
          },
        ],
      },
    );

    expect(entries).toEqual([
      expect.objectContaining({
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        chainId: 1,
        supportStatus: "unsupported",
        safetyStatus: "non_default",
        symbol: "USDC",
      }),
    ]);
  });

  it("normalizes source-specific payloads like Jupiter arrays and 1inch maps", () => {
    const jupiter = normalizeExternalTokenListPayload(
      {
        id: "jupiter",
        name: "Jupiter",
        url: "https://lite-api.jup.ag/tokens/v2/toporganicscore/24h",
        defaultChainId: SOLANA_CHAIN_ID,
      },
      [
        {
          id: "So11111111111111111111111111111111111111112",
          symbol: "SOL",
          name: "Wrapped SOL",
          decimals: 9,
          icon: "https://example.com/sol.png",
        },
      ],
    );
    const oneInch = normalizeExternalTokenListPayload(
      {
        id: "oneinch",
        name: "1inch",
        url: "https://tokens.1inch.io/v1.1/1",
      },
      {
        "0x111111111117dc0aa78b770fa6a738034120c302": {
          chainId: 1,
          address: "0x111111111117dC0aa78b770fA6A738034120C302",
          symbol: "1INCH",
          name: "1inch",
          decimals: 18,
        },
      },
    );

    expect(jupiter[0]).toEqual(
      expect.objectContaining({
        address: "So11111111111111111111111111111111111111112",
        chainId: SOLANA_CHAIN_ID,
        symbol: "SOL",
      }),
    );
    expect(oneInch[0]).toEqual(
      expect.objectContaining({
        address: "0x111111111117dC0aa78b770fA6A738034120C302",
        chainId: 1,
        symbol: "1INCH",
      }),
    );
  });
});
