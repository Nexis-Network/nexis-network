import { describe, expect, it } from "vitest";

import { buildTokenAssetInfo } from "@/modules/tokens/server/metadata-enrichment-service";
import { buildWalletDisplayTokens } from "@/modules/tokens/portfolio/wallet-display";

describe("wallet display tokens", () => {
  it("injects common bases from the canonical registry and enriches held tokens", () => {
    const eth = buildTokenAssetInfo({
      chainId: 1,
      address: "native",
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      sources: ["registry"],
    });
    const usdc = buildTokenAssetInfo({
      chainId: 1,
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      sources: ["registry"],
    });

    const result = buildWalletDisplayTokens({
      currentTokens: [
        {
          id: usdc.address,
          contract: usdc.address,
          platform: "evm",
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
          balance: 50,
          uiAmount: 50,
          uiAmountString: "50",
          chainId: 1,
          logoURI: null,
          priceUsd: 1,
          valueUsd: 50,
          change24hPercent: 0,
          isNative: false,
        },
      ],
      registryTokens: [eth, usdc],
      commonBaseIds: [eth.assetId, usdc.assetId],
      fallbackChainId: 1,
    });

    expect(result).toHaveLength(2);
    expect(result[0]?.symbol).toBe("USDC");
    expect(result.find((token) => token.symbol === "ETH")?.isNative).toBe(true);
    expect(result.find((token) => token.symbol === "ETH")?.balance).toBe(0);
  });
});
