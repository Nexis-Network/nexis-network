import type { TokenAssetInfo } from "@/modules/tokens/types";

export const PUBLIC_TOKEN_RESOLVE_CACHE_TTL_MS = 60 * 60 * 1000;
export const PUBLIC_TOKEN_RESOLVE_MAX_ENTRIES = 128;

type CacheEntry = {
  expiresAt: number;
  value: TokenAssetInfo | null;
};

const cache = new Map<string, CacheEntry>();

export function buildTokenResolveCacheKey(chainId: number, address: string): string {
  return `public-token-resolve:v1:${chainId}:${address}`;
}

export async function rememberResolvedToken(
  key: string,
  loader: () => Promise<TokenAssetInfo | null>,
): Promise<TokenAssetInfo | null> {
  const now = Date.now();
  const hit = cache.get(key);

  if (hit && hit.expiresAt > now) {
    return hit.value;
  }

  const value = await loader();
  cache.set(key, { expiresAt: now + PUBLIC_TOKEN_RESOLVE_CACHE_TTL_MS, value });

  if (cache.size > PUBLIC_TOKEN_RESOLVE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) {
      cache.delete(oldest);
    }
  }

  return value;
}
