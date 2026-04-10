type RemoteHealthCacheEntry = {
  healthy: boolean;
  expiresAt: number;
};

const DEFAULT_ENDPOINT = "/api/v1/health";
const DEFAULT_CACHE_TTL = 30_000; // 30 seconds

const remoteHealthCache = new Map<string, RemoteHealthCacheEntry>();

type EnsureRemoteHealthOptions = {
  baseUrl: string;
  bearer?: string;
  endpoint?: string;
  cacheTtlMs?: number;
  fetchFn?: typeof fetch;
};

export async function ensureRemoteHealth(options: EnsureRemoteHealthOptions): Promise<void> {
  const {
    baseUrl,
    bearer,
    endpoint = DEFAULT_ENDPOINT,
    cacheTtlMs = DEFAULT_CACHE_TTL,
    fetchFn = fetch,
  } = options;

  if (!baseUrl) {
    throw new Error("Remote health check requires a base URL");
  }

  const now = Date.now();
  const cacheKey = `${baseUrl}${endpoint}`;
  const cached = remoteHealthCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    if (cached.healthy) {
      return;
    }
    throw new Error("Remote service recently reported unhealthy status");
  }

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (bearer) {
      headers.Authorization = `Bearer ${bearer}`;
    }

    const response = await fetchFn(`${baseUrl}${endpoint}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Remote health check failed with status ${response.status}`);
    }

    remoteHealthCache.set(cacheKey, {
      healthy: true,
      expiresAt: now + cacheTtlMs,
    });
  } catch (error) {
    remoteHealthCache.set(cacheKey, {
      healthy: false,
      expiresAt: now + cacheTtlMs,
    });
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export function clearRemoteHealthCache() {
  remoteHealthCache.clear();
}
