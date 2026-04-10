import { describe, expect, it } from "vitest";

import {
  buildCoinMentionMarkup,
  extractCoinGeckoMentions,
  extractCoinGeckoMentionIds,
  formatCoinMentionContext,
  type CoinMentionContextRecord,
} from "@/components/chat-composer/token-mentions";

describe("buildCoinMentionMarkup", () => {
  it("creates stable custom CoinGecko mention markup", () => {
    expect(
      buildCoinMentionMarkup({
        id: "ethereum",
        label: "Ethereum",
      }),
    ).toBe("[Ethereum](coingecko:ethereum)");
  });
});

describe("extractCoinGeckoMentionIds", () => {
  it("extracts and deduplicates CoinGecko mention identifiers from prompt text", () => {
    const text = [
      "Compare [Ethereum](coingecko:ethereum) and [Solana](coingecko:solana).",
      "Also include [Ethereum](coingecko:ethereum) again.",
    ].join(" ");

    expect(extractCoinGeckoMentionIds(text)).toEqual(["ethereum", "solana"]);
  });
});

describe("extractCoinGeckoMentions", () => {
  it("returns ordered CoinGecko mention spans with labels and ids", () => {
    const text =
      "Track [Ethereum](coingecko:ethereum) and [Base](coingecko:base).";

    expect(extractCoinGeckoMentions(text)).toEqual([
      {
        id: "ethereum",
        label: "Ethereum",
        start: 6,
        end: 36,
      },
      {
        id: "base",
        label: "Base",
        start: 41,
        end: 63,
      },
    ]);
  });
});

describe("formatCoinMentionContext", () => {
  it("formats a structured market-context block with metadata and market data", () => {
    const records: CoinMentionContextRecord[] = [
      {
        id: "ethereum",
        name: "Ethereum",
        symbol: "eth",
        imageUrl: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png",
        description:
          "Ethereum is a programmable blockchain with smart contract support.",
        homepageUrls: ["https://ethereum.org"],
        blockchainSiteUrls: ["https://etherscan.io"],
        twitterScreenName: "ethereum",
        telegramChannelIdentifier: "ethereum",
        githubUrls: ["https://github.com/ethereum/go-ethereum"],
        categories: ["smart-contract-platform"],
        contractAddresses: [],
        marketData: {
          currentPriceUsd: 3200,
          priceChangePercentage24h: 3.2,
          marketCapUsd: 385_000_000_000,
          totalVolumeUsd: 24_000_000_000,
          athUsd: 4891.7,
          athDate: "2021-11-16T00:00:00.000Z",
          high24hUsd: 3225,
          low24hUsd: 3090,
          circulatingSupply: 120_000_000,
          totalSupply: 120_000_000,
          maxSupply: null,
        },
        tickers: [
          {
            marketName: "Binance",
            base: "ETH",
            target: "USDT",
            last: 3201,
            volume: 1_200_000_000,
            tradeUrl: "https://www.binance.com/en/trade/ETH_USDT",
          },
        ],
      },
    ];

    const context = formatCoinMentionContext(records);

    expect(context).toContain("CoinGecko token context:");
    expect(context).toContain("Ethereum (ETH)");
    expect(context).toContain("Current price (USD): 3200");
    expect(context).toContain("Twitter/X: https://x.com/ethereum");
    expect(context).toContain("Top exchange tickers:");
    expect(context).toContain("Binance ETH/USDT");
  });
});
