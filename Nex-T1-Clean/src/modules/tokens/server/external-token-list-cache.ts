import type { ExternalTokenListSnapshot } from "@/modules/tokens/server/external-token-list-service";

export const EXTERNAL_TOKEN_LIST_CACHE_KEY = "external-token-lists:v1";
export const EXTERNAL_TOKEN_LIST_TTL_MS = 60 * 60 * 1000;
export const EXTERNAL_TOKEN_LIST_MAX_ENTRIES = 2;

type CacheEntry = {
  expiresAt: number;
  value: ExternalTokenListSnapshot;
};

const cache = new Map<string, CacheEntry>();

export async function rememberExternalTokenLists(
  key: string,
  loader: () => Promise<ExternalTokenListSnapshot>,
): Promise<ExternalTokenListSnapshot> {
  const now = Date.now();
  const hit = cache.get(key);

  if (hit && hit.expiresAt > now) {
    return hit.value;
  }

  const value = await loader();
  cache.set(key, { expiresAt: now + EXTERNAL_TOKEN_LIST_TTL_MS, value });

  if (cache.size > EXTERNAL_TOKEN_LIST_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) {
      cache.delete(oldest);
    }
  }

  return value;
}
