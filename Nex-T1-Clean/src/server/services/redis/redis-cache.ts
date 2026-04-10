import { redis, isRedisConfigured } from "@/server/services/redis";


import { logger } from '@/lib/logger';
export async function withRedisCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 60
): Promise<T> {
    if (!isRedisConfigured) {
        return fetcher();
    }

    try {
        const cached = await redis.get<T>(key);
        if (cached) {
            return cached;
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isTimeoutLike = message.toLowerCase().includes("timed out") || message.toLowerCase().includes("suppressed");
        const logFn = isTimeoutLike ? logger.debug : logger.warn;
        logFn(`[Redis] Failed to get cache for key ${key}:`, error);
    }

    const data = await fetcher();

    try {
        if (data) {
            await redis.set(key, data, { ex: ttlSeconds });
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isTimeoutLike = message.toLowerCase().includes("timed out") || message.toLowerCase().includes("suppressed");
        const logFn = isTimeoutLike ? logger.debug : logger.warn;
        logFn(`[Redis] Failed to set cache for key ${key}:`, error);
    }

    return data;
}
