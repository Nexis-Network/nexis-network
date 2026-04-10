
/**
 * Market Trending Tool (Prioritized)
 *
 * Domain: AI Tools - Market Data
 * Responsibility: Fetches trending tokens using Moralis (primary) and CoinGecko (fallback).
 * Logic:
 * 1. Try Moralis Discovery API (filtered/ranked tokens).
 * 2. If Moralis fails or returns no data, fallback to CoinGecko Trending Search.
 */

import {
  createTool,
  createToolSchema,
  enumProp,
  integerProp,
  stringProp,
  resolveToolExecutionResult,
} from "./create-tool";
import { moralisMarketTrendingTool } from "./moralis";
import { coingeckoTrendingTool } from "./coingecko-trending";


import { logger } from '@/lib/logger';
// ============================================================================
// SCHEMA
// ============================================================================

const TRENDING_TYPES = ["coins", "nfts", "categories"] as const;

const prioritizedTrendingSchema = createToolSchema({
  chain: stringProp("Chain filter for Moralis (e.g. '0x1', 'solana'). Defaults to 0x1 (Ethereum)."),
  type: enumProp("Trending type (fallback to Coingecko if not coins)", TRENDING_TYPES, "coins"),
  limit: integerProp("Max items to return", { minimum: 1, maximum: 50, default: 20 }),
});

// ============================================================================
// TOOL
// ============================================================================

export const marketTrendingPrioritizedTool = createTool<
  { chain?: string; type?: (typeof TRENDING_TYPES)[number]; limit?: number },
  UntypedJson
>({
  description:
    "Get trending market data (tokens, NFTs). Prioritizes Moralis (on-chain activity) over CoinGecko (search trends).",
  schema: prioritizedTrendingSchema,
  execute: async ({ chain, type = "coins", limit = 20 }) => {
    // 1. Try Moralis First (Only for 'coins' type)
    if (type === "coins") {
      try {
        const toolOptions = { toolCallId: "internal-call", messages: [] };
        const moralisResult = await resolveToolExecutionResult(
          moralisMarketTrendingTool.execute!(
            {
              chain: chain ?? "0x1",
              limit,
            },
            toolOptions,
          ),
        );

        // If we got results, return them wrapped
        if (moralisResult.items && moralisResult.items.length > 0) {
          return {
            source: "moralis",
            type: "coins",
            chain: moralisResult.chain,
            items: moralisResult.items,
          };
        }
      } catch (error) {
        logger.warn("[market-trending] Moralis failed, falling back to CoinGecko", error);
        // Continue to fallback
      }
    }

    // 2. Fallback to CoinGecko
    try {
      const toolOptions = { toolCallId: "internal-call", messages: [] };
      const coingeckoResult = await resolveToolExecutionResult(
        coingeckoTrendingTool.execute!(
          { type: type as UntypedJson },
          toolOptions,
        ),
      );
      return {
        source: "coingecko",
        type: coingeckoResult.type,
        items: coingeckoResult.results.slice(0, limit),
        fetchedAt: coingeckoResult.fetchedAt,
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch trending data from both Moralis and CoinGecko: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});
