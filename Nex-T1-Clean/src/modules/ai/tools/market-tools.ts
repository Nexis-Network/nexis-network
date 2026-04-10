import { tool } from "ai";
import { z } from "zod";
import * as Coingecko from "@/server/market/coingecko";

export const getGlobalCryptoMarketSnapshot = tool({
  description: "Get a snapshot of the global crypto market (market cap, volume, dominance, etc.)",
  inputSchema: z.object({}),
  execute: async (_args, _options) => {
    const result = await Coingecko.getGlobalMarketData();
    if (!result || !result.data) {
      return { message: "Global market data unavailable." };
    }
    return result.data;
  },
});

export const searchCoins = tool({
  description: "Search for coins/tokens by name or symbol to get their details (id, symbol, name).",
  inputSchema: z.object({
    query: z.string().describe("The search query (e.g. 'bitcoin', 'pepe', 'ETH')."),
  }),
  execute: async ({ query }, _options) => {
    const result = await Coingecko.searchAssets(query);
    return result.data?.coins?.slice(0, 10).map((c) => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      market_cap_rank: c.marketCapRank,
      thumb: c.thumb,
    })) ?? [];
  },
});

export const getCoinListIdMap = tool({
  description: "Get a map of common coin IDs for resolution. Provide a list of symbols.",
  inputSchema: z.object({
    symbols: z.array(z.string()).describe("List of symbols to resolve (e.g. ['BTC', 'ETH'])"),
  }),
  execute: async ({ symbols }, _options) => {
    const results = await Promise.all(symbols.map(async (symbol) => {
      const search = await Coingecko.searchAssets(symbol);
      const top = search.data?.coins?.[0];
      return top ? { symbol, id: top.id } : null;
    }));
    return results.filter((entry): entry is { symbol: string; id: string } => entry !== null);
  },
});

export const getOnchainTokenPrices = tool({
  description: "Get on-chain token prices for a list of contract addresses on a specific chain.",
  inputSchema: z.object({
    chain: z.enum(["ethereum", "solana", "arbitrum", "base", "optimism", "polygon"]).describe("The chain/network ID (coingecko platform id)."),
    addresses: z.array(z.string()).describe("List of contract addresses."),
  }),
  execute: async ({ chain, addresses }, _options) => {
    return Coingecko.getTokenPricesByContracts(chain, addresses);
  },
});

export const getOnchainTokenData = tool({
  description: "Get detailed on-chain data for a specific token (metadata, attributes).",
  inputSchema: z.object({
    chain: z.enum(["ethereum", "solana", "arbitrum", "base", "optimism", "polygon"]),
    address: z.string().describe("The contract address."),
  }),
  execute: async ({ chain, address }, _options) => {
    const result = await Coingecko.getTokenDataByContract(chain, address);
    return result.data ?? null;
  },
});
