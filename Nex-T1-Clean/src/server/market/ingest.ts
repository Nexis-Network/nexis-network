import { redis, isRedisConfigured } from "@/server/services/redis";
import { getCoinMarketChart } from "@/server/market/coingecko";


import { logger } from '@/lib/logger';
const TRACKED_COINS = [
    "bitcoin",
    "ethereum",
    "solana",
    "nexis-network",
    "ripple",
    "cardano",
    "avalanche-2",
    "polkadot",
    "chainlink",
    "dogecoin",
];

const CHART_CACHE_TTL_SECONDS = 5 * 60; // 5 minutes

export async function ingestMarketData() {
    if (!isRedisConfigured) {
        logger.warn("[market-ingest] Redis not configured, skipping ingestion");
        return { success: false, error: "Redis not configured" };
    }

    logger.debug("[market-ingest] Starting market data ingestion...");
    const results = await Promise.allSettled(
        TRACKED_COINS.map(async (coinId) => {
            try {
                // Fetch 30 days of data with daily interval for the sparkline/chart
                const data = await getCoinMarketChart(coinId, {
                    vsCurrency: "usd",
                    days: 30,
                    interval: "daily",
                });

                const key = `market:chart:${coinId}`;
                await redis.set(key, data, { ex: CHART_CACHE_TTL_SECONDS });
                return { coinId, status: "success" };
            } catch (error) {
                logger.error(`[market-ingest] Failed to ingest ${coinId}`, error);
                throw error;
            }
        })
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failureCount = results.filter((r) => r.status === "rejected").length;

    logger.debug(
        `[market-ingest] Ingestion complete. Success: ${successCount}, Failed: ${failureCount}`
    );

    return {
        success: true,
        stats: {
            total: TRACKED_COINS.length,
            success: successCount,
            failed: failureCount,
        },
    };
}
