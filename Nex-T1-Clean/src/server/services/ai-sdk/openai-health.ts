type OpenAIHealthCacheEntry = {
  healthy: boolean;
  expiresAt: number;
};

const DEFAULT_CACHE_TTL = 60_000; // 1 minute
const HEALTH_ENDPOINT = "https://api.openai.com/v1/models?limit=1";

const openAIHealthCache: OpenAIHealthCacheEntry = {
  healthy: true,
  expiresAt: 0,
};

export async function ensureOpenAIHealth(options: {
  apiKey: string;
  cacheTtlMs?: number;
  fetchFn?: typeof fetch;
}): Promise<void> {
  const { apiKey, cacheTtlMs = DEFAULT_CACHE_TTL, fetchFn = fetch } = options;

  if (!apiKey) {
    throw new Error("OpenAI API key is required for health checking");
  }

  const now = Date.now();

  if (openAIHealthCache.expiresAt > now && openAIHealthCache.healthy) {
    return;
  }

  try {
    const response = await fetchFn(HEALTH_ENDPOINT, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAI health check failed with status ${response.status}`);
    }

    openAIHealthCache.healthy = true;
    openAIHealthCache.expiresAt = now + cacheTtlMs;
  } catch (error) {
    openAIHealthCache.healthy = false;
    openAIHealthCache.expiresAt = now + cacheTtlMs;
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export function resetOpenAIHealthCache() {
  openAIHealthCache.healthy = true;
  openAIHealthCache.expiresAt = 0;
}
