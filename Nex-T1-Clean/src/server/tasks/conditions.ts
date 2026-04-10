import "server-only";

import { differenceInMinutes } from "date-fns";

import { searchStoriesByTopic } from "@/lib/hacker-news";
import { getLatestListings, getMarketSentiment } from "@/server/market/coinmarketcap";
import type { CoinMarketCapListing } from "@/types/market";
import type { TaskConditionRow } from "@/server/tasks/types";
import type { TaskScheduleCondition } from "@/modules/tasks";
import type { JsonObject } from "@/types/json";

type ConditionDetail = {
  id: string;
  type: string;
  passed: boolean;
  reason?: string;
  metadata?: JsonObject;
};

export type ConditionEvaluation = {
  passed: boolean;
  details: ConditionDetail[];
};

export async function evaluateTaskConditions(rows: TaskConditionRow[] | null | undefined): Promise<ConditionEvaluation> {
  if (!rows || rows.length === 0) {
    return { passed: true, details: [] };
  }

  const loader = new MarketDataLoader();
  const sentiment = new SentimentCache();
  const details: ConditionDetail[] = [];

  for (const row of rows) {
    const definition = row.definition ?? ({ type: row.condition_type } as TaskScheduleCondition);
    const result = await evaluateCondition(definition, loader, sentiment);
    details.push({
      id: row.id,
      type: definition.type,
      ...result,
    });
  }

  return {
    passed: details.every((detail) => detail.passed),
    details,
  };
}

async function evaluateCondition(
  condition: TaskScheduleCondition,
  loader: MarketDataLoader,
  sentiment: SentimentCache,
): Promise<Omit<ConditionDetail, "id" | "type">> {
  try {
    switch (condition.type) {
      case "market_price_percent":
        return evaluatePricePercent(condition, loader);
      case "market_price_amount":
        return evaluatePriceAmount(condition, loader);
      case "trade_volume":
        return evaluateTradeVolume(condition, loader);
      case "news":
        return evaluateNews(condition);
      case "portfolio_percent":
        return evaluateFearGreed(condition, sentiment);
      default:
        return {
          passed: false,
          reason: `Unsupported condition type "${condition.type}"`,
        };
    }
  } catch (error) {
    return {
      passed: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function evaluatePricePercent(condition: TaskScheduleCondition, loader: MarketDataLoader) {
  const snapshot = await loader.getBySymbol(condition.asset ?? condition.symbol);
  if (!snapshot) {
    return { passed: false, reason: "Asset not found" };
  }
  const percentChange = snapshot.percentChange24h;
  if (percentChange == null) {
    return { passed: false, reason: "Missing percent change data" };
  }
  const threshold = condition.thresholdPercent ?? 0;
  const direction = condition.direction ?? "above";
  const passed = direction === "below" ? percentChange <= -Math.abs(threshold) : percentChange >= threshold;
  return {
    passed,
    metadata: { percentChange, threshold, direction },
    reason: passed ? undefined : `Percent change ${percentChange} did not satisfy ${direction} ${threshold}`,
  };
}

async function evaluatePriceAmount(condition: TaskScheduleCondition, loader: MarketDataLoader) {
  const snapshot = await loader.getBySymbol(condition.asset ?? condition.symbol);
  if (!snapshot) {
    return { passed: false, reason: "Asset not found" };
  }
  const price = snapshot.priceUsd;
  if (price == null) {
    return { passed: false, reason: "Missing price data" };
  }
  const threshold = condition.thresholdValue ?? 0;
  const direction = condition.direction ?? "above";
  const passed = direction === "below" ? price <= threshold : price >= threshold;
  return {
    passed,
    metadata: { price, threshold, direction },
    reason: passed ? undefined : `Price $${price} did not satisfy ${direction} $${threshold}`,
  };
}

async function evaluateTradeVolume(condition: TaskScheduleCondition, loader: MarketDataLoader) {
  const snapshot = await loader.getBySymbol(condition.asset ?? condition.symbol);
  if (!snapshot) {
    return { passed: false, reason: "Asset not found" };
  }
  const volume = snapshot.volume24hUsd;
  if (volume == null) {
    return { passed: false, reason: "Missing volume data" };
  }
  const threshold = condition.thresholdValue ?? 0;
  const direction = condition.direction ?? "above";
  const passed = direction === "below" ? volume <= threshold : volume >= threshold;
  return {
    passed,
    metadata: { volume, threshold, direction },
    reason: passed ? undefined : `Volume ${volume} did not satisfy ${direction} ${threshold}`,
  };
}

async function evaluateNews(condition: TaskScheduleCondition) {
  const keyword = condition.keyword?.trim();
  if (!keyword) {
    return { passed: false, reason: "Keyword is required for news conditions" };
  }
  const stories = await searchStoriesByTopic(keyword, 5);
  const windowMinutes = condition.windowMinutes ?? 360;
  const now = Date.now();
  const match = stories.find((story) => differenceInMinutes(now, story.time * 1000) <= windowMinutes);

  return {
    passed: Boolean(match),
    metadata: match ? { storyId: match.id, title: match.title, score: match.score } : undefined,
    reason: match ? undefined : `No stories within ${windowMinutes} minutes`,
  };
}

async function evaluateFearGreed(condition: TaskScheduleCondition, sentiment: SentimentCache) {
  const snapshot = await sentiment.load();
  const score = snapshot?.score ?? null;
  if (score == null) {
    return { passed: false, reason: "Unable to load market sentiment" };
  }
  const threshold = condition.thresholdPercent ?? 0;
  const direction = condition.direction ?? "above";
  const passed = direction === "below" ? score <= threshold : score >= threshold;
  return {
    passed,
    metadata: { score, classification: snapshot?.classification, threshold, direction },
    reason: passed ? undefined : `Fear & greed score ${score} did not satisfy ${direction} ${threshold}`,
  };
}

class MarketDataLoader {
  private listings: CoinMarketCapListing[] | null = null;
  private lookup = new Map<string, CoinMarketCapListing>();

  async getBySymbol(symbol?: string | null): Promise<AssetSnapshot | null> {
    if (!symbol) return null;
    const normalized = symbol.trim().toLowerCase();
    if (this.lookup.has(normalized)) {
      return buildSnapshot(this.lookup.get(normalized) ?? null);
    }
    if (!this.listings) {
      const response = await getLatestListings(300, 1);
      this.listings = response.data ?? [];
      for (const listing of this.listings) {
        if (listing.symbol) {
          this.lookup.set(listing.symbol.toLowerCase(), listing);
        }
        if (listing.slug) {
          this.lookup.set(listing.slug.toLowerCase(), listing);
        }
        if (listing.name) {
          this.lookup.set(listing.name.toLowerCase(), listing);
        }
      }
    }
    return buildSnapshot(this.lookup.get(normalized) ?? null);
  }
}

class SentimentCache {
  private cache: Awaited<ReturnType<typeof getMarketSentiment>>["data"] | null = null;

  async load() {
    if (this.cache) {
      return this.cache;
    }
    const snapshot = await getMarketSentiment();
    this.cache = snapshot.data ?? null;
    return this.cache;
  }
}

type AssetSnapshot = {
  symbol: string | null;
  priceUsd: number | null;
  percentChange24h: number | null;
  volume24hUsd: number | null;
};

function buildSnapshot(listing: CoinMarketCapListing | null | undefined): AssetSnapshot | null {
  if (!listing) return null;
  return {
    symbol: listing.symbol ?? listing.slug ?? null,
    priceUsd: listing.quote?.priceUsd ?? null,
    percentChange24h: listing.quote?.percentChange24h ?? null,
    volume24hUsd: listing.quote?.volume24hUsd ?? null,
  };
}
