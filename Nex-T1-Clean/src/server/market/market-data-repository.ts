import crypto from "crypto";

import { redis } from "@/server/services/redis";
import type { MarketDataOverviewResponse } from "@/types/market";

const MARKET_OVERVIEW_PREFIX = "market:overview";
const DEFAULT_CACHE_TTL = 60; // seconds

type CachePayload = MarketDataOverviewResponse & { cachedAt: string };

function normalizeAssets(assets: string[]): string[] {
  return Array.from(new Set(assets.map((asset) => asset.toLowerCase()))).sort();
}

function cacheKey(assets: string[]): string {
  const normalized = normalizeAssets(assets);
  const signature = crypto.createHash("sha1").update(normalized.join(",")).digest("hex");
  return `${MARKET_OVERVIEW_PREFIX}:${signature}`;
}

export async function getCachedMarketOverview(assets: string[]): Promise<MarketDataOverviewResponse | null> {
  const key = cacheKey(assets);
  const cached = await redis.get<CachePayload>(key);
  if (!cached) {
    return null;
  }
  return {
    data: cached.data,
    marketSnapshot: cached.marketSnapshot,
    fetchedAt: cached.fetchedAt,
    errors: cached.errors ?? [],
  };
}

export async function setCachedMarketOverview(
  assets: string[],
  payload: MarketDataOverviewResponse,
  ttlSeconds: number = DEFAULT_CACHE_TTL,
): Promise<void> {
  const key = cacheKey(assets);
  const cacheValue: CachePayload = {
    ...payload,
    cachedAt: new Date().toISOString(),
  };
  await redis.set(key, cacheValue, { ex: ttlSeconds });
}
