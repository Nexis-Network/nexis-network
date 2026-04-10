import { logger } from "@/lib/logger";
import { isRedisConfigured, redis } from "@/server/services/redis";

import type { WalletBalanceResult } from "./types";

const BALANCE_CACHE_PREFIX = "cdp_balance:";

// Cache contract:
// key: `cdp_balance:{platform}:{chain}:{address}`
// value: fully-enriched wallet balance response
// layer: Redis
// TTL: 15 seconds
// scope: address + platform + chain
// consistency: short-lived best-effort read cache for on-chain balances
// owner: CDP balance service
// observability: cache hit/miss/write failures logged through shared logger
export const BALANCE_CACHE_TTL_SECONDS = 15;

export function buildCacheKey(
  address: string,
  platform: string,
  chainId?: number | string,
): string {
  const chain = chainId ? String(chainId) : "default";
  return `${BALANCE_CACHE_PREFIX}${platform}:${chain}:${address.toLowerCase()}`;
}

export async function getCachedBalance(
  cacheKey: string,
): Promise<WalletBalanceResult | null> {
  if (!isRedisConfigured) return null;

  try {
    return await redis.get<WalletBalanceResult>(cacheKey);
  } catch (error) {
    logger.warn("cdp_balance_cache_read_failed", {
      key: cacheKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function setCachedBalance(
  cacheKey: string,
  data: WalletBalanceResult,
): Promise<void> {
  if (!isRedisConfigured) return;

  try {
    await redis.set(cacheKey, data as unknown as UntypedJson, {
      ex: BALANCE_CACHE_TTL_SECONDS,
    });
  } catch (error) {
    logger.warn("cdp_balance_cache_write_failed", {
      key: cacheKey,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

