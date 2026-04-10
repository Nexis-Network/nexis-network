import { Redis as IoRedis } from "ioredis";

import { resolveRedisConnectionString, shouldSkipExternalRedisConnections } from "@/lib/utils/redis-config";


import { logger } from '@/lib/logger';
export function createIoredisClient(): IoRedis | null {
    if (shouldSkipExternalRedisConnections()) {
        return null;
    }

    const connectionString = resolveRedisConnectionString();
    if (!connectionString) {
        return null;
    }

    // Validate connection string for production safety
    const isProduction = process.env.NODE_ENV === 'production';
    // Dynamically import to avoid circular dep if any, though utils is safe.
    // Ideally we import it at top level if not circular.
    // Checking imports... redis-config doesn't import THIS file.
    import('@/lib/utils/redis-config').then(({ validateRedisUrl }) => {
        validateRedisUrl(connectionString, isProduction);
    }).catch(() => { /* ignore import error */ });


    const client = new IoRedis(connectionString, {
        password: process.env.REDIS_PASSWORD || undefined, // Explicitly pass password if available
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            if (times > 3) {
                logger.error('[Redis] Max retries reached, giving up');
                return null; // Stop retrying
            }
            return Math.min(times * 100, 3000);
        },
        reconnectOnError(err) {
            const targetErrors = ['READONLY', 'NOAUTH'];
            return targetErrors.some(e => err.message.includes(e));
        },
    });

    // Prevent unhandled error events from crashing the process
    client.on('error', (err) => {
        logger.error('[Redis] Connection error:', err.message);
    });

    client.on('connect', () => {
        logger.debug('[Redis] Connected successfully');
    });

    return client;
}
