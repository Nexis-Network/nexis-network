/**
 * CoinGecko Trending Tool
 *
 * Domain: AI Tools - Market Data
 * Responsibility: Fetches trending tokens, NFTs, or categories from CoinGecko
 * Depends on: createTool, server/market/coingecko
 * Notes: Modernized to use AI SDK 5.0 native tool pattern with JSON Schema.
 */

import { createTool, createToolSchema, enumProp } from "./create-tool";
import { getTrendingCollection } from "@/server/market/coingecko";
import type { TrendingEntity } from "@/types/market/coingecko";

// ============================================================================
// SCHEMA (JSON Schema)
// ============================================================================

const TRENDING_TYPES = ["coins", "nfts", "categories", "combined"] as const;
type TrendingType = (typeof TRENDING_TYPES)[number];

const coingeckoTrendingSchema = createToolSchema({
  type: enumProp(
    "Which trending list to return. Defaults to 'coins'.",
    TRENDING_TYPES,
    "coins"
  ),
});

// ============================================================================
// TYPES
// ============================================================================

interface TrendingInput {
  type?: TrendingType;
}

interface FormattedTrendingResult {
  id: string;
  name: string;
  symbol?: string;
  type: string;
  score?: number;
  marketCapRank?: number;
  priceBtc?: number;
  quickStats?: Record<string, UntypedJson>;
  rank: number;
  list: TrendingType;
}

interface TrendingOutput {
  type: TrendingType;
  results: FormattedTrendingResult[];
  fetchedAt: string;
  cacheState?: string;
  source: "coingecko";
}

// ============================================================================
// HELPERS
// ============================================================================

const formatResults = (
  entries: TrendingEntity[] = [],
  list: TrendingType
): FormattedTrendingResult[] =>
  entries.map((entry, index) => ({
    id: entry.id,
    name: entry.name,
    symbol: entry.symbol,
    type: entry.type,
    score: entry.score ?? undefined,
    marketCapRank: entry.marketCapRank ?? undefined,
    priceBtc: entry.priceBtc ?? undefined,
    quickStats: entry.quickStats ?? undefined,
    rank: index + 1,
    list,
  }));

// ============================================================================
// TOOL
// ============================================================================

export const coingeckoTrendingTool = createTool<TrendingInput, TrendingOutput>({
  description:
    "Fetch trending tokens, NFTs, or categories from CoinGecko's public trending feed (coins by default).",
  schema: coingeckoTrendingSchema,
  execute: async ({ type = "coins" }): Promise<TrendingOutput> => {
    const trending = await getTrendingCollection();

    const buckets: Record<string, TrendingEntity[]> = {
      coins: trending?.data?.coins ?? [],
      nfts: trending?.data?.nfts ?? [],
      categories: trending?.data?.categories ?? [],
      combined: trending?.data?.combined ?? [],
    };

    const results = formatResults(buckets[type], type);

    return {
      type,
      results,
      fetchedAt: trending?.fetchedAt ?? new Date().toISOString(),
      cacheState: trending?.cache,
      source: "coingecko",
    };
  },
});

export type CoingeckoTrendingToolInvocation = TrendingInput;
