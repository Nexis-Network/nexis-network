import { describe, expect, it } from "vitest";

import { buildTokenAssetInfo } from "@/modules/tokens/server/metadata-enrichment-service";
import type { TokenRegistrySnapshot } from "@/modules/tokens/types";
import {
  buildPortfolioTokenItems,
  getPortfolioDefaultAssetIds,
} from "@/modules/tokens/portfolio/token-items";

describe("portfolio token items", () => {
  it("prefers wallet balances, injects defaults, and preserves custom tokens", () => {
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
    const custom = {
      ...buildTokenAssetInfo({
        chainId: 1,
        address: "0x1234000000000000000000000000000000000000",
        symbol: "CSTM",
        name: "Custom Token",
        decimals: 18,
        sources: ["custom"],
      }),
      isCustom: true,
    };

    const items = buildPortfolioTokenItems({
      fetchedTokens: [
        {
          chainId: 1,
          token_address: usdc.address,
          symbol: usdc.symbol,
          name: usdc.name,
          decimals: usdc.decimals,
          balance: "25",
          usd_price: 1,
          usd_value: 25,
        },
      ],
      registryTokens: [eth, usdc, custom],
      defaultAssetIds: [eth.assetId, usdc.assetId],
    });

    expect(items).toHaveLength(3);
    expect(items.filter((item) => item.symbol === "USDC")).toHaveLength(1);
    expect(items.find((item) => item.symbol === "USDC")?.balance).toBe("25");
    expect(items.find((item) => item.symbol === "ETH")?.isDefault).toBe(true);
    expect(items.find((item) => item.symbol === "CSTM")?.isCustom).toBe(true);
    expect(items.find((item) => item.symbol === "USDC")?.asset.symbol).toBe("USDC");
  });

  it("derives default asset ids from chain-scoped common bases and default pairs", () => {
    const snapshot: TokenRegistrySnapshot = {
      version: "test",
      tokens: [],
      chains: [],
      commonBases: {
        "1": [
          "1-native",
          "1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        ],
      },
      defaultPairs: [
        {
          chainId: 1,
          sellAssetId: "1-native",
          buyAssetId: "1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          source: "registry" as const,
        },
      ],
    };

    expect(getPortfolioDefaultAssetIds(snapshot, 1)).toEqual(snapshot.commonBases["1"]);
    expect(getPortfolioDefaultAssetIds(snapshot)).toEqual([
      "1-native",
      "1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    ]);
  });
});
