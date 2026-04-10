import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolExecutionOptions } from "ai";
import type { AssetSearchCollection, CoinDetails, CoinMarketChart, CachedResponse } from "@/types/market/coingecko";
import { showPriceChartTool } from "./market-charts";
import * as Coingecko from "@/server/market/coingecko";
import { coingeckoWS } from "@/server/market/coingecko-ws";

vi.mock("@/server/market/coingecko", () => ({
  searchAssets: vi.fn(),
  getCoinDetails: vi.fn(),
  getCoinMarketChart: vi.fn(),
}));

vi.mock("@/server/market/coingecko-ws", () => ({
  coingeckoWS: {
    getLatestPrices: vi.fn(),
  },
}));

const toolExecutionOptions: ToolExecutionOptions = {
  toolCallId: "test-tool-call",
  messages: [],
};

function asCached<T>(data: T): CachedResponse<T> {
  return {
    data,
    fetchedAt: "2026-03-03T00:00:00.000Z",
    cache: "miss",
  };
}

async function runTool<TInput, TOutput>(
  target: {
    execute?: (
      input: TInput,
      options: ToolExecutionOptions,
    ) => PromiseLike<TOutput> | TOutput | AsyncIterable<TOutput>;
  },
  input: TInput,
): Promise<TOutput> {
  if (!target.execute) throw new Error("Tool execute handler is missing");
  const result = target.execute(input, toolExecutionOptions);
  return await Promise.resolve(result as PromiseLike<TOutput>);
}

describe("showPriceChartTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a CoinGecko chart payload when symbol resolves", async () => {
    const searchData: AssetSearchCollection = {
      coins: [
        { id: "ethereum", name: "Ethereum", symbol: "eth", marketCapRank: 2, thumb: "https://example.com/eth.png" },
      ],
      nfts: [],
    };

    const details: CoinDetails = {
      id: "ethereum",
      name: "Ethereum",
      symbol: "eth",
      categories: [],
      networks: [],
      homepageUrls: [],
      blockchainSiteUrls: [],
      marketData: {
        currentPriceUsd: 2450,
        marketCapUsd: 1000,
        totalVolumeUsd: 500,
        priceChangePercentage24h: 1.2,
        lastUpdated: "2026-03-03T00:00:00.000Z",
      },
    };

    const chart: CoinMarketChart = {
      prices: [
        [1_700_000_000_000, 2400],
        [1_700_003_600_000, 2460],
      ],
      marketCaps: [],
      totalVolumes: [],
    };

    vi.mocked(Coingecko.searchAssets).mockResolvedValue(asCached(searchData));
    vi.mocked(Coingecko.getCoinDetails).mockResolvedValue(asCached(details));
    vi.mocked(Coingecko.getCoinMarketChart).mockResolvedValue(asCached(chart));
    vi.mocked(coingeckoWS.getLatestPrices).mockReturnValue({
      ethereum: {
        price: 2475,
        change24hPct: 2.5,
        marketCapUsd: 1100,
        volume24hUsd: 650,
        lastUpdatedAt: 1_700_003_600_000,
      },
    });

    const result = await runTool(showPriceChartTool, {
      symbol: "ETH",
      currency: "usd",
      days: 7,
    });

    expect(result).toMatchObject({
      type: "coingecko-chart",
      id: "ethereum",
      name: "Ethereum",
      symbol: "ETH",
      currentPriceUsd: 2475,
      priceChange24hPct: 2.5,
      source: "coingecko",
      vsCurrency: "usd",
    });
  });

  it("returns a typed error payload when symbol cannot be resolved", async () => {
    vi.mocked(Coingecko.searchAssets).mockResolvedValue(
      asCached<AssetSearchCollection>({ coins: [], nfts: [] }),
    );

    const result = await runTool(showPriceChartTool, {
      symbol: "UNKNOWN",
      currency: "usd",
      days: 30,
    });

    expect(result).toMatchObject({
      type: "coingecko-chart",
      symbol: "UNKNOWN",
    });
    expect((result as { error?: string }).error).toContain("Unable to resolve");
  });
});

