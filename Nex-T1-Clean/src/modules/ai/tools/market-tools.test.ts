import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ToolExecutionOptions } from "ai";
import type { AssetSearchCollection, CachedResponse, GlobalMarketData, OnchainTokenData } from "@/types/market";
import { getGlobalCryptoMarketSnapshot, searchCoins, getCoinListIdMap, getOnchainTokenPrices, getOnchainTokenData } from "./market-tools";
import * as Coingecko from "@/server/market/coingecko";

// Mock the Coingecko dependency
vi.mock("@/server/market/coingecko", () => ({
  getGlobalMarketData: vi.fn(),
  searchAssets: vi.fn(),
  getTokenPricesByContracts: vi.fn(),
  getTokenDataByContract: vi.fn(),
}));

const toolExecutionOptions: ToolExecutionOptions = {
  toolCallId: "test-tool-call",
  messages: [],
};

function asCached<T>(data: T): CachedResponse<T> {
  return {
    data,
    fetchedAt: "2024-01-01T00:00:00.000Z",
    cache: "miss",
  };
}

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    Symbol.asyncIterator in value
  );
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
  if (!target.execute) {
    throw new Error("Tool execute handler is missing");
  }

  const result = target.execute(input, toolExecutionOptions);
  if (isAsyncIterable<TOutput>(result)) {
    for await (const chunk of result) {
      return chunk;
    }
    throw new Error("Tool returned an empty async iterable");
  }

  return await Promise.resolve(result);
}

describe("Market Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getGlobalCryptoMarketSnapshot", () => {
    it("should return global market data when available", async () => {
      const mockData: GlobalMarketData = {
        active_cryptocurrencies: 10000,
        upcoming_icos: 0,
        ongoing_icos: 0,
        ended_icos: 0,
        markets: 1200,
        total_market_cap: { usd: 2000000000000 },
        total_volume: { usd: 100000000000 },
        market_cap_percentage: { btc: 50 },
        market_cap_change_percentage_24h_usd: 1.2,
        updated_at: 1_706_000_000,
      };
      vi.mocked(Coingecko.getGlobalMarketData).mockResolvedValue(asCached(mockData));

      const result = await runTool(getGlobalCryptoMarketSnapshot, {});
      expect(result).toEqual(mockData);
      expect(Coingecko.getGlobalMarketData).toHaveBeenCalled();
    });

    it("should return error message when data is unavailable", async () => {
      const unavailable = asCached(undefined as unknown as GlobalMarketData);
      vi.mocked(Coingecko.getGlobalMarketData).mockResolvedValue({
        ...unavailable,
        data: undefined as unknown as GlobalMarketData,
        error: "Failed",
      });

      const result = await runTool(getGlobalCryptoMarketSnapshot, {});
      expect(result).toEqual({ message: "Global market data unavailable." });
    });
  });

  describe("searchCoins", () => {
    it("should return formatted coin results", async () => {
      const mockSearchData: AssetSearchCollection = {
        coins: [
          { id: "bitcoin", name: "Bitcoin", symbol: "btc", marketCapRank: 1, thumb: "url" },
          { id: "ethereum", name: "Ethereum", symbol: "eth", marketCapRank: 2, thumb: "url" },
        ],
        nfts: [],
      };

      vi.mocked(Coingecko.searchAssets).mockResolvedValue(asCached(mockSearchData));

      const result = await runTool(searchCoins, { query: "bit" });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "bitcoin",
        name: "Bitcoin",
        symbol: "btc",
        market_cap_rank: 1,
        thumb: "url",
      });
      expect(Coingecko.searchAssets).toHaveBeenCalledWith("bit");
    });

    it("should return empty array on no results", async () => {
      vi.mocked(Coingecko.searchAssets).mockResolvedValue(
        asCached<AssetSearchCollection>({
          coins: [],
          nfts: [],
        }),
      );

      const result = await runTool(searchCoins, { query: "empty" });
      expect(result).toEqual([]);
    });
  });

  describe("getCoinListIdMap", () => {
    it("should map symbols to IDs correctly", async () => {
      vi.mocked(Coingecko.searchAssets)
        .mockResolvedValueOnce(
          asCached<AssetSearchCollection>({
            coins: [{ id: "bitcoin", name: "Bitcoin", symbol: "btc", marketCapRank: 1, thumb: "btc.png" }],
            nfts: [],
          }),
        )
        .mockResolvedValueOnce(
          asCached<AssetSearchCollection>({
            coins: [{ id: "ethereum", name: "Ethereum", symbol: "eth", marketCapRank: 2, thumb: "eth.png" }],
            nfts: [],
          }),
        );

      const result = await runTool(getCoinListIdMap, { symbols: ["BTC", "ETH"] });
      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { symbol: "BTC", id: "bitcoin" },
        { symbol: "ETH", id: "ethereum" },
      ]);
    });
  });

  describe("getOnchainTokenPrices", () => {
    it("should return prices for given addresses", async () => {
      const mockPrices = { "0x123": { usd: 100 } };
      vi.mocked(Coingecko.getTokenPricesByContracts).mockResolvedValue(mockPrices);

      const result = await runTool(getOnchainTokenPrices, {
        chain: "ethereum",
        addresses: ["0x123"],
      });
      expect(result).toEqual(mockPrices);
      expect(Coingecko.getTokenPricesByContracts).toHaveBeenCalledWith("ethereum", ["0x123"]);
    });
  });

  describe("getOnchainTokenData", () => {
    it("should return token data", async () => {
      const mockData: OnchainTokenData = {
        id: "token-1",
        type: "token",
        attributes: {
          address: "0x123",
          name: "Token",
          symbol: "TKN",
          image_url: "https://example.com/token.png",
          coingecko_coin_id: "token",
          decimals: 18,
          total_supply: "1000000",
          price_usd: "1.25",
          fdv_usd: "1250000",
          total_reserve_in_usd: "250000",
          volume_usd: { h24: "100000" },
          market_cap_usd: "800000",
        },
      };
      vi.mocked(Coingecko.getTokenDataByContract).mockResolvedValue(asCached(mockData));

      const result = await runTool(getOnchainTokenData, {
        chain: "ethereum",
        address: "0x123",
      });
      expect(result).toEqual(mockData);
      expect(Coingecko.getTokenDataByContract).toHaveBeenCalledWith("ethereum", "0x123");
    });

    it("should return null if not found", async () => {
      vi.mocked(Coingecko.getTokenDataByContract).mockResolvedValue(asCached<OnchainTokenData | null>(null));

      const result = await runTool(getOnchainTokenData, {
        chain: "ethereum",
        address: "0x123",
      });
      expect(result).toBeNull();
    });
  });
});
