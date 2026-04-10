type CacheEntry = {
  data: UntypedJson;
  timestamp: number;
};

const cache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<UntypedJson>>();

interface FetchOptions extends RequestInit {
  ttl?: number; // Time to live in seconds
  skipCache?: boolean;
}

const DEFAULT_TTL = 30; // 30 seconds

export async function cachedFetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { ttl = DEFAULT_TTL, skipCache, ...fetchInit } = options;
  const cacheKey = url;

  // 1. Check Cache
  if (!skipCache && cache.has(cacheKey)) {
    const entry = cache.get(cacheKey)!;
    const now = Date.now();
    if (now - entry.timestamp < ttl * 1000) {
      return entry.data as T;
    } else {
      cache.delete(cacheKey);
    }
  }

  // 2. Deduping
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey) as Promise<T>;
  }

  // 3. Fetch
  const requestPromise = (async () => {
    try {
      const response = await fetch(url, fetchInit);
      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();

      // 4. Save to Cache
      cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return data as T;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

export function clearCache(keyPrefix?: string) {
  if (keyPrefix) {
    for (const key of cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}
