import { redis, isRedisConfigured } from "@/server/services/redis";
import { logger } from "@/lib/logger";

/**
 * Executes a function protected by a distributed Redis lock, preventing
 * concurrent identical requests from slamming external APIs (Single-Flight).
 * 
 * If another request is currently running for the same key, subsequent requests
 * will poll for completion instead of executing the fetcher themselves.
 * 
 * @param key Unique cache/lock key
 * @param fetcher Async function to execute if lock is acquired
 * @param ttlSeconds How long to cache the result
 * @param lockTimeoutMs How long to wait for a lock before giving up
 */
export async function withSingleFlight<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 60,
    lockTimeoutMs: number = 10000
): Promise<T> {
    if (!isRedisConfigured) {
        return fetcher();
    }

    try {
        // 1. Check if we already have valid cached data
        const cached = await redis.get<T>(key);
        if (cached) {
            return cached;
        }

        // 2. Try to acquire the execution lock
        const lockKey = `${key}:lock`;
        const lockAcquired = await redis.trySetNx(lockKey, "locked", Math.ceil(lockTimeoutMs / 1000));

        if (lockAcquired) {
            try {
                // We got the lock, execute the expensive fetcher
                const data = await fetcher();
                if (data) {
                    await redis.set(key, data, { ex: ttlSeconds });
                }
                return data;
            } finally {
                // Always release the lock
                await redis.del(lockKey);
            }
        } else {
            // 3. We didn't get the lock, wait for the other process to finish computing
            const intervalMs = 250;
            let waited = 0;
            
            while (waited < lockTimeoutMs) {
                await new Promise(r => setTimeout(r, intervalMs));
                waited += intervalMs;
                
                // Has the data been populated by the lock owner?
                const siblingResult = await redis.get<T>(key);
                if (siblingResult) {
                    return siblingResult;
                }
                
                // Did the lock owner fail or crash, clearing the lock?
                const stillLocked = await redis.get(lockKey);
                if (!stillLocked) {
                    break;
                }
            }
            
            // If we fall through here, the lock timed out or crashed without writing data.
            // Fallback to direct execution.
            logger.warn(`Single-flight lock timeout for ${key}, falling back to direct execution`);
            return fetcher();
        }
    } catch (error) {
        logger.error(`[Redis SingleFlight] Error processing key ${key}:`, error);
        // Fallback to direct fetch on Redis error
        return fetcher();
    }
}
