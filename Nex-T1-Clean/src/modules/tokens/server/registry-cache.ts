import type { TokenRegistrySnapshot } from "@/modules/tokens/types";

export const PUBLIC_TOKEN_REGISTRY_CACHE_KEY = "public-token-registry:v2";
export const PUBLIC_TOKEN_REGISTRY_TTL_MS = 15 * 60 * 1000;
export const PUBLIC_TOKEN_REGISTRY_MAX_ENTRIES = 8;

type CacheEntry = {
  expiresAt: number;
  value: TokenRegistrySnapshot;
};

const cache = new Map<string, CacheEntry>();

export async function rememberPublicRegistry(
  key: string,
  loader: () => Promise<TokenRegistrySnapshot>,
): Promise<TokenRegistrySnapshot> {
  const now = Date.now();
  const hit = cache.get(key);

  if (hit && hit.expiresAt > now) {
    return hit.value;
  }

  const value = await loader();
  cache.set(key, { expiresAt: now + PUBLIC_TOKEN_REGISTRY_TTL_MS, value });

  if (cache.size > PUBLIC_TOKEN_REGISTRY_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) {
      cache.delete(oldest);
    }
  }

  return value;
}
