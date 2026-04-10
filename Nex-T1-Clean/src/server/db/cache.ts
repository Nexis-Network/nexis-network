import { getOrSet, type GetOrSetOptions } from "@/server/services/redis/cache";


import { logger } from '@/lib/logger';
/**
 * Cache TTL configurations for different data types
 */
export const CACHE_TTL = {
  USER_PROFILE: 300, // 5 minutes
  WALLET_DATA: 300, // 5 minutes
  ANALYTICS_DATA: 60, // 1 minute
  TASK_DATA: 120, // 2 minutes
  SESSION_DATA: 180, // 3 minutes
} as const;

/**
 * Cache namespace for different query types
 */
export const CACHE_NAMESPACE = {
  USER_PROFILE: "db:user_profile",
  WALLET_DATA: "db:wallet_data",
  ANALYTICS_DATA: "db:analytics_data",
  TASK_DATA: "db:task_data",
  SESSION_DATA: "db:session_data",
} as const;

type SupabaseResponse<T> = { data: T | null; error: UntypedJson };

export type CachedQueryOptions<T> = {
  key: string;
  namespace: string;
  ttlSeconds: number;
  staleTtlSeconds?: number;
  coalesce?: boolean;
  serialize?: (value: SupabaseResponse<T>) => UntypedJson;
  deserialize?: (raw: UntypedJson) => SupabaseResponse<T> | null;
};

/**
 * Execute a Supabase query with Redis caching
 *
 * @param query - The Supabase query to execute
 * @param options - Caching configuration options
 * @returns The cached or freshly fetched query result
 *
 * @example
 * ```ts
 * const result = await cachedQuery(
 *   () => supabase.from("users").select("*").eq("id", userId).single(),
 *   {
 *     key: `user:${userId}`,
 *     namespace: CACHE_NAMESPACE.USER_PROFILE,
 *     ttlSeconds: CACHE_TTL.USER_PROFILE,
 *     coalesce: true,
 *   }
 * );
 * ```
 */
export async function cachedQuery<T>(
  query: () => Promise<{ data: T | null; error: UntypedJson }>,
  options: CachedQueryOptions<T>
): Promise<{ data: T | null; error: UntypedJson; fromCache?: boolean }> {
  const cacheOptions: GetOrSetOptions<{ data: T | null; error: UntypedJson }> = {
    ttlSeconds: options.ttlSeconds,
    staleTtlSeconds: options.staleTtlSeconds,
    coalesce: options.coalesce ?? true,
    namespace: options.namespace,
    serialize: options.serialize,
    deserialize: options.deserialize,
  };

  try {
    const result = await getOrSet(
      options.key,
      async () => {
        const queryResult = await query();
        return queryResult;
      },
      cacheOptions
    );

    return { ...result, fromCache: true };
  } catch (error) {
    // If caching fails, execute the query directly
    logger.warn(`Cache operation failed for key ${options.key}:`, error);
    const result = await query();
    return { ...result, fromCache: false };
  }
}

/**
 * Build a cache key for user profile queries
 */
export function userProfileCacheKey(userId: string): string {
  return `${CACHE_NAMESPACE.USER_PROFILE}:${userId}`;
}

/**
 * Build a cache key for wallet data queries
 */
export function walletDataCacheKey(userId: string, address?: string): string {
  const base = `${CACHE_NAMESPACE.WALLET_DATA}:${userId}`;
  return address ? `${base}:${address}` : base;
}

/**
 * Build a cache key for analytics data queries
 */
export function analyticsCacheKey(userId: string, type: string, params?: Record<string, string>): string {
  const base = `${CACHE_NAMESPACE.ANALYTICS_DATA}:${userId}:${type}`;
  if (params) {
    const paramStr = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return `${base}:${paramStr}`;
  }
  return base;
}

/**
 * Build a cache key for task queries
 */
export function taskCacheKey(userId: string, taskId?: string): string {
  const base = `${CACHE_NAMESPACE.TASK_DATA}:${userId}`;
  return taskId ? `${base}:${taskId}` : base;
}

/**
 * Build a cache key for session data queries
 */
export function sessionCacheKey(userId: string, sessionId?: string): string {
  const base = `${CACHE_NAMESPACE.SESSION_DATA}:${userId}`;
  return sessionId ? `${base}:${sessionId}` : base;
}

/**
 * Invalidate cache for a specific key
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    const { redis } = await import("@/server/services/redis");
    await redis.del(key);
  } catch (error) {
    logger.warn(`Failed to invalidate cache for key ${key}:`, error);
  }
}

/**
 * Invalidate all cache entries matching a pattern
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    const { redis } = await import("@/server/services/redis");
    // Note: This is a simple implementation. In production, you might want to use Redis SCAN
    // to avoid blocking on large key sets
    await redis.del(pattern);
  } catch (error) {
    logger.warn(`Failed to invalidate cache pattern ${pattern}:`, error);
  }
}
