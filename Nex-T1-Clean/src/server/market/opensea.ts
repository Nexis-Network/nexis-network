import { redis } from "@/server/services/redis";
import { metrics } from "@/server/instrumentation/metrics";
import type { CachedResponse } from "@/types/market";
import type { OpenSeaCollectionResponse } from "@/types/market/opensea";



import { logger } from '@/lib/logger';
// Actually, OpenSea v2 API is the current standard. 
// Collection stats endpoint: https://api.opensea.io/api/v2/collections/{collection_slug}/stats
const OPENSEA_API_V2_BASE = "https://api.opensea.io/api/v2";
const API_KEY = process.env.OPENSEA_API_KEY;
const CACHE_NAMESPACE = "opensea";
const DEFAULT_TTL_SECONDS = 300; // 5 minutes

type CacheEntry<T> = {
    value: T;
    fetchedAt: string;
};

async function withCache<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<CachedResponse<T>> {
    const namespacedKey = `${CACHE_NAMESPACE}:${key}`;

    try {
        const cached = await redis.get<CacheEntry<T>>(namespacedKey);
        if (cached) {
            metrics.cacheHit(CACHE_NAMESPACE);
            return {
                data: cached.value,
                fetchedAt: cached.fetchedAt,
                cache: "hit",
            };
        }
        metrics.cacheMiss(CACHE_NAMESPACE);
    } catch (error) {
        logger.warn(`[opensea] failed to read cache for key ${namespacedKey}`, error);
    }

    const value = await fetcher();
    const fetchedAt = new Date().toISOString();

    try {
        await redis.set(namespacedKey, { value, fetchedAt }, { ex: ttlSeconds });
        metrics.cacheWrite(CACHE_NAMESPACE);
    } catch (error) {
        logger.warn(`[opensea] failed to write cache for key ${namespacedKey}`, error);
    }

    return {
        data: value,
        fetchedAt,
        cache: "miss",
    };
}

export async function getOpenSeaCollectionStats(slug: string): Promise<CachedResponse<OpenSeaCollectionResponse>> {
    if (!API_KEY) {
        throw new Error("OPENSEA_API_KEY is not configured");
    }

    return withCache(`stats:${slug}`, DEFAULT_TTL_SECONDS, async () => {
        const response = await fetch(`${OPENSEA_API_V2_BASE}/collections/${slug}/stats`, {
            headers: {
                "x-api-key": API_KEY,
                accept: "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`OpenSea API error: ${response.status} ${response.statusText}`);
        }

        return response.json() as Promise<OpenSeaCollectionResponse>;
    });
}
