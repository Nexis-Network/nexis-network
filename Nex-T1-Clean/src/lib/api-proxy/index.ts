/**
 * API Proxy Utilities
 * Shared utilities for proxy routes - rate limiting, caching, response handling
 */

import { redis } from "@/server/services/redis";
import { NextResponse, type NextRequest } from "next/server";

import { logger } from '@/lib/logger';
// ============================================================================
// Rate Limiting
// ============================================================================

interface RateLimitConfig {
  maxRequests: number;      // Max requests per window
  windowSeconds: number;    // Time window in seconds
  prefix: string;           // Cache key prefix
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// In-memory fallback for rate limiting when Redis sorted sets unavailable
const rateLimitCounters = new Map<string, { count: number; resetAt: number }>();
const REDIS_ERROR_LOG_COOLDOWN_MS = Number(
  process.env.PROXY_REDIS_ERROR_LOG_COOLDOWN_MS ?? 60_000,
);
const redisErrorLogLastSeenAt = new Map<string, number>();

function maybeLogRedisFallback(scope: string, error: unknown) {
  const now = Date.now();
  const lastLoggedAt = redisErrorLogLastSeenAt.get(scope) ?? 0;
  if (now - lastLoggedAt < REDIS_ERROR_LOG_COOLDOWN_MS) {
    return;
  }
  redisErrorLogLastSeenAt.set(scope, now);
  logger.warn(
    { error: error instanceof Error ? error.message : String(error) },
    `[Proxy Redis Fallback] ${scope}. Using degraded mode.`,
  );
}

function applyInMemoryRateLimit(
  key: string,
  now: number,
  config: RateLimitConfig,
): RateLimitResult {
  // Avoid unbounded growth if Redis is down in production.
  // This is a best-effort safety net; Redis-backed rate limiting remains the primary mechanism.
  const MAX_KEYS = 10_000;
  if (rateLimitCounters.size > MAX_KEYS) {
    for (const [counterKey, entry] of rateLimitCounters) {
      if (entry.resetAt <= now) {
        rateLimitCounters.delete(counterKey);
      }
    }

    while (rateLimitCounters.size > MAX_KEYS) {
      const oldest = rateLimitCounters.keys().next().value as string | undefined;
      if (!oldest) break;
      rateLimitCounters.delete(oldest);
    }
  }

  const existing = rateLimitCounters.get(key);
  if (existing && existing.resetAt > now) {
    existing.count += 1;
    const allowed = existing.count <= config.maxRequests;
    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - existing.count),
      resetAt: existing.resetAt,
    };
  }

  const resetAt = now + config.windowSeconds;
  rateLimitCounters.set(key, { count: 1, resetAt });
  return { allowed: true, remaining: config.maxRequests - 1, resetAt };
}

/**
 * Redis-based rate limiter using sliding window algorithm
 * Falls back to in-memory when Redis sorted set operations unavailable
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `ratelimit:${config.prefix}:${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.windowSeconds;

  // Check if Redis sorted set operations are available
  const hasZsetOps = typeof redis.zremrangebyscore === 'function' && 
                     typeof redis.zcard === 'function' && 
                     typeof redis.zadd === 'function';

  if (!hasZsetOps) {
    return applyInMemoryRateLimit(key, now, config);
  }

  try {
    // Use individual Redis calls for sliding window rate limiting
    await redis.zremrangebyscore!(key, 0, windowStart);
    const currentCount = await redis.zcard!(key);
    await redis.zadd!(key, now, `${now}:${Math.random()}`);
    if (typeof redis.expire === "function") {
      await redis.expire(key, config.windowSeconds);
    }

    const allowed = currentCount < config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - currentCount - 1);
    const resetAt = now + config.windowSeconds;

    return { allowed, remaining, resetAt };
  } catch (error) {
    maybeLogRedisFallback(`rate-limit:${config.prefix}`, error);
    return applyInMemoryRateLimit(key, now, config);
  }
}



// ============================================================================
// Cache Utilities
// ============================================================================

interface CacheConfig {
  ttlSeconds: number;
  staleTtlSeconds?: number;
  prefix: string;
}

interface CachedData<T> {
  data: T;
  fetchedAt: number;
}

/**
 * Get cached response or fetch fresh
 */
export async function withProxyCache<T>(
  key: string,
  config: CacheConfig,
  fetcher: () => Promise<T>
): Promise<{ data: T; fromCache: boolean; stale: boolean }> {
  const cacheKey = `proxy:${config.prefix}:${key}`;
  const staleKey = `${cacheKey}:stale`;
  const staleTtl = config.staleTtlSeconds ?? config.ttlSeconds * 6;

  let cacheAvailable = true;

  try {
    const cached = await redis.get<CachedData<T>>(cacheKey);
    if (cached) {
      return { data: cached.data, fromCache: true, stale: false };
    }
  } catch (error) {
    cacheAvailable = false;
    maybeLogRedisFallback(`cache-read:${config.prefix}`, error);
  }

  try {
    const data = await fetcher();
    const entry: CachedData<T> = { data, fetchedAt: Date.now() };

    if (cacheAvailable) {
      try {
        await Promise.all([
          redis.set(cacheKey, entry, { ex: config.ttlSeconds }),
          redis.set(staleKey, entry, { ex: staleTtl }),
        ]);
      } catch (error) {
        maybeLogRedisFallback(`cache-write:${config.prefix}`, error);
      }
    }

    return { data, fromCache: false, stale: false };
  } catch (fetchError) {
    if (cacheAvailable) {
      try {
        const stale = await redis.get<CachedData<T>>(staleKey);
        if (stale) {
          logger.warn(`[Proxy Cache] Serving stale for ${cacheKey}`);
          return { data: stale.data, fromCache: true, stale: true };
        }
      } catch (error) {
        maybeLogRedisFallback(`cache-stale-read:${config.prefix}`, error);
      }
    }

    throw fetchError;
  }
}

// ============================================================================
// Response Helpers
// ============================================================================

export interface ProxyResponseOptions {
  cacheTtl?: number;
  corsOrigin?: string;
  rateLimitRemaining?: number;
  rateLimitResetAt?: number;
  fromCache?: boolean;
  stale?: boolean;
}

/**
 * Create a JSON response with proper headers
 */
export function createProxyResponse<T>(
  data: T,
  status = 200,
  options: ProxyResponseOptions = {}
): NextResponse {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": options.corsOrigin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (options.cacheTtl) {
    headers["Cache-Control"] = `public, max-age=${options.cacheTtl}, stale-while-revalidate=${options.cacheTtl * 2}`;
  }

  if (options.rateLimitRemaining !== undefined) {
    headers["X-RateLimit-Remaining"] = String(options.rateLimitRemaining);
  }

  if (options.rateLimitResetAt !== undefined) {
    headers["X-RateLimit-Reset"] = String(options.rateLimitResetAt);
  }

  if (options.fromCache) {
    headers["X-Cache"] = options.stale ? "STALE" : "HIT";
  } else {
    headers["X-Cache"] = "MISS";
  }

  return NextResponse.json(data, { status, headers });
}

/**
 * Create error response
 */
export function createErrorResponse(
  message: string,
  status = 500,
  options: Pick<ProxyResponseOptions, "rateLimitRemaining" | "rateLimitResetAt"> = {}
): NextResponse {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.rateLimitRemaining !== undefined) {
    headers["X-RateLimit-Remaining"] = String(options.rateLimitRemaining);
    if (typeof options.rateLimitResetAt === "number") {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const retryAfter = Math.max(0, options.rateLimitResetAt - nowSeconds);
      headers["Retry-After"] = String(retryAfter);
    } else {
      headers["Retry-After"] = "60";
    }
  }

  return NextResponse.json({ error: message }, { status, headers });
}

/**
 * Get client identifier for rate limiting
 */
export function getClientIdentifier(request: NextRequest): string {
  // Prefer X-Forwarded-For for proxied requests
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  // Fall back to IP from request
  const ip = request.headers.get("x-real-ip") ?? "unknown";
  return ip;
}

// ============================================================================
// Default Rate Limit Configs
// ============================================================================

export const RATE_LIMITS = {
  birdeye: {
    maxRequests: 100,
    windowSeconds: 60,
    prefix: "birdeye",
  },
  coingecko: {
    maxRequests: 50,
    windowSeconds: 60,
    prefix: "coingecko",
  },
  jupiter: {
    maxRequests: 200,
    windowSeconds: 60,
    prefix: "jupiter",
  },
} satisfies Record<string, RateLimitConfig>;

// ============================================================================
// Default Cache Configs
// ============================================================================

export const CACHE_CONFIGS = {
  tokenList: { ttlSeconds: 300, prefix: "token-list" },           // 5 min
  prices: { ttlSeconds: 30, prefix: "prices" },                    // 30 sec
  trending: { ttlSeconds: 900, prefix: "trending" },               // 15 min
  marketData: { ttlSeconds: 60, prefix: "market-data" },           // 1 min
  swapQuote: { ttlSeconds: 10, prefix: "swap-quote" },             // 10 sec
} satisfies Record<string, CacheConfig>;
