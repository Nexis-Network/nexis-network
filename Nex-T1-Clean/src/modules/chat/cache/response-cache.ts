/**
 * Response Cache
 * Redis-based caching for chat responses, market data, and artifacts
 */

import { redis, isRedisConfigured } from "@/server/services/redis";


import { logger } from '@/lib/logger';
function hashQuery(query: string): string {
  // Simple hash for cache keys
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export const CACHE_STRATEGIES = {
  chatResponse: {
    ttl: 3600, // 1 hour
    keyPrefix: "chat:response",
    shouldCache: (query: string) => query.length > 10 && !query.startsWith("/"),
  },
  marketData: {
    ttl: 300, // 5 minutes (market data changes frequently)
    keyPrefix: "market:snapshot",
    shouldCache: () => true,
  },
  agentIdea: {
    ttl: 1800, // 30 minutes
    keyPrefix: "agent:idea",
    shouldCache: (topic: string) => topic.length > 5,
  },
} as const;

type CacheStrategyName = keyof typeof CACHE_STRATEGIES;

const hasRedis = isRedisConfigured;

export async function getCachedResponse<T = UntypedJson>(
  strategyName: CacheStrategyName,
  params: Record<string, string>
): Promise<T | null> {
  if (!hasRedis) return null;

  try {
    const strategy = CACHE_STRATEGIES[strategyName];
    const key = `${strategy.keyPrefix}:${hashQuery(JSON.stringify(params))}`;
    const cached = await redis.get<string>(key);

    if (cached) {
      return JSON.parse(cached) as T;
    }

    return null;
  } catch (error) {
    logger.error("Cache read error:", error);
    return null;
  }
}

export async function setCachedResponse<T = UntypedJson>(
  strategyName: CacheStrategyName,
  params: Record<string, string>,
  data: T
): Promise<void> {
  if (!hasRedis) return;

  try {
    const strategy = CACHE_STRATEGIES[strategyName];
    const key = `${strategy.keyPrefix}:${hashQuery(JSON.stringify(params))}`;
    await redis.setex(key, strategy.ttl, JSON.stringify(data));
  } catch (error) {
    logger.error("Cache write error:", error);
  }
}

export async function invalidateCache(
  strategyName: CacheStrategyName,
  params: Record<string, string>
): Promise<void> {
  if (!hasRedis) return;

  try {
    const strategy = CACHE_STRATEGIES[strategyName];
    const key = `${strategy.keyPrefix}:${hashQuery(JSON.stringify(params))}`;
    await redis.del(key);
  } catch (error) {
    logger.error("Cache invalidation error:", error);
  }
}

/**
 * Cache wrapper for chat responses
 */
export async function withChatCache<T>(
  query: string,
  model: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const params = { query, model };

  // Try cache first
  const cached = await getCachedResponse<T>("chatResponse", params);
  if (cached) {
    logger.debug("[Cache HIT]", query.slice(0, 50));
    return cached;
  }

  // Fetch fresh
  logger.debug("[Cache MISS]", query.slice(0, 50));
  const result = await fetcher();

  // Cache for next time
  await setCachedResponse("chatResponse", params, result);

  return result;
}

/**
 * Cache wrapper for market data
 */
export async function withMarketCache<T>(
  ticker: string,
  lookbackDays: number,
  resolutionMinutes: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const params = {
    ticker,
    lookbackDays: lookbackDays.toString(),
    resolutionMinutes: resolutionMinutes.toString(),
  };

  const cached = await getCachedResponse<T>("marketData", params);
  if (cached) {
    logger.debug("[Market Cache HIT]", ticker);
    return cached;
  }

  logger.debug("[Market Cache MISS]", ticker);
  const result = await fetcher();
  await setCachedResponse("marketData", params, result);

  return result;
}
