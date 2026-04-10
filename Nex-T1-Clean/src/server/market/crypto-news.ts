import crypto from "crypto";

import { redis } from "@/server/services/redis";
import { createLogger } from "@/server/logging/logging";
import { resolveCoingeckoApiBase, resolveCoingeckoCredentials } from "@/server/market/coingecko-base";
import type { CachedResponse, NewsArticle } from "@/types/market";

const logger = createLogger("crypto-news");

const CACHE_NAMESPACE = "crypto-news";
const CACHE_TTL_SECONDS = 300;
const CRYPTONEWS_API_URL = "https://cryptonews-api.com/api/v1/category";
const CRYPTONEWS_TOKEN = process.env.CRYPTONEWS_API_KEY;
const NEWS_ARTICLE_LIMIT = Number(process.env.MARKET_NEWS_LIMIT ?? "12");
const CRYPTONEWS_DEFAULT_ITEMS = Number(process.env.CRYPTONEWS_ITEMS ?? String(NEWS_ARTICLE_LIMIT));
const CRYPTONEWS_TRIAL_ITEMS = Number(process.env.CRYPTONEWS_TRIAL_ITEMS ?? "3");

const { proApiKey: COINGECKO_API_KEY, demoApiKey: COINGECKO_DEMO_API_KEY } = resolveCoingeckoCredentials({
  apiKey: process.env.COINGECKO_API_KEY,
  proApiKey: process.env.COINGECKO_PRO_API_KEY,
  demoApiKey: process.env.COINGECKO_DEMO_API_KEY,
});
const COINGECKO_API_BASE = resolveCoingeckoApiBase({
  apiKey: COINGECKO_API_KEY,
  envBase: process.env.COINGECKO_API_BASE,
});

type CacheEntry<T> = {
  value: T;
  fetchedAt: string;
};

function buildCacheKey(parts: UntypedJson[]): string {
  const signature = JSON.stringify(parts);
  const digest = crypto.createHash("sha1").update(signature).digest("hex");
  return `${CACHE_NAMESPACE}:${digest}`;
}

async function withCache<T>(key: string, fetcher: () => Promise<T>): Promise<CachedResponse<T>> {
  try {
    const cached = await redis.get<CacheEntry<T>>(key);
    if (cached) {
      return {
        data: cached.value,
        fetchedAt: cached.fetchedAt,
        cache: "hit",
      };
    }
  } catch (error) {
    logger.debugExpectedError(`cache read failed for key ${key}`, error);
  }

  const value = await fetcher();
  const fetchedAt = new Date().toISOString();
  const entry: CacheEntry<T> = { value, fetchedAt };

  try {
    await redis.set(key, entry, { ex: CACHE_TTL_SECONDS });
  } catch (error) {
    logger.debugExpectedError(`cache write failed for key ${key}`, error);
  }

  return {
    data: value,
    fetchedAt,
    cache: "miss",
  };
}

type CryptoNewsApiArticle = {
  news_url: string;
  image_url?: string;
  title: string;
  text?: string;
  source_name?: string;
  date: string;
  id?: string | number;
};

type CryptoNewsApiResponse = {
  data?: CryptoNewsApiArticle[];
};

type CoingeckoNewsItem = {
  id?: number | string;
  title: string;
  description?: string | null;
  url: string;
  news_site?: string;
  thumb_2x?: string | null;
  image?: string | null;
  image_url?: string | null;
  created_at?: number;
  updated_at?: number;
  crawled_at?: number;
};

type CoingeckoNewsResponse = {
  data?: CoingeckoNewsItem[];
};

const resolvedNewsLimit = Number.isFinite(NEWS_ARTICLE_LIMIT) && NEWS_ARTICLE_LIMIT > 0 ? NEWS_ARTICLE_LIMIT : 12;

function mapCryptoNewsArticles(entries: CryptoNewsApiArticle[]): NewsArticle[] {
  return entries.slice(0, resolvedNewsLimit).map((entry) => ({
    id: entry.id ? String(entry.id) : entry.news_url,
    title: entry.title,
    description: entry.text,
    url: entry.news_url,
    imageUrl: entry.image_url ?? null,
    source: entry.source_name ?? "CryptoNews API",
    publishedAt: new Date(entry.date).toISOString(),
  }));
}

function mapCoingeckoNews(entries: CoingeckoNewsItem[]): NewsArticle[] {
  return entries.slice(0, resolvedNewsLimit).map((entry) => ({
    id: entry.id ? String(entry.id) : entry.url,
    title: entry.title,
    description: entry.description,
    url: entry.url,
    imageUrl: entry.thumb_2x ?? entry.image_url ?? entry.image ?? null,
    source: entry.news_site ?? "CoinGecko",
    publishedAt: (() => {
      const pickTimestamp = (value?: number | string | null): number | null => {
        if (value == null) {
          return null;
        }
        if (typeof value === "number" && Number.isFinite(value)) {
          return value > 10_000_000_000 ? value : value * 1000;
        }
        if (typeof value === "string" && value) {
          const numeric = Number(value);
          if (!Number.isNaN(numeric)) {
            return numeric > 10_000_000_000 ? numeric : numeric * 1000;
          }
          const parsed = Date.parse(value);
          return Number.isNaN(parsed) ? null : parsed;
        }
        return null;
      };

      const timestampMs =
        pickTimestamp(entry.created_at) ??
        pickTimestamp(entry.updated_at) ??
        pickTimestamp(entry.crawled_at);

      return timestampMs ? new Date(timestampMs).toISOString() : new Date().toISOString();
    })(),
  }));
}

async function fetchFromCryptoNewsApi(): Promise<NewsArticle[] | null> {
  if (!CRYPTONEWS_TOKEN) {
    return null;
  }

  const preferredItems =
    Number.isFinite(CRYPTONEWS_DEFAULT_ITEMS) && CRYPTONEWS_DEFAULT_ITEMS > 0
      ? CRYPTONEWS_DEFAULT_ITEMS
      : resolvedNewsLimit;
  const fallbackItems = Number.isFinite(CRYPTONEWS_TRIAL_ITEMS) && CRYPTONEWS_TRIAL_ITEMS > 0 ? CRYPTONEWS_TRIAL_ITEMS : 3;
  const attempts = [preferredItems];

  if (!attempts.includes(fallbackItems)) {
    attempts.push(fallbackItems);
  }

  for (const items of attempts) {
    const url = new URL(CRYPTONEWS_API_URL);
    url.searchParams.set("section", "general");
    url.searchParams.set("items", String(items));
    url.searchParams.set("token", CRYPTONEWS_TOKEN);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: CACHE_TTL_SECONDS },
      });

      const bodyText = await response.text();
      if (!response.ok) {
        const isInactiveApi = response.status === 404 ||
          (bodyText && /apiinactive|inactive|not found/i.test(bodyText));

        if (isInactiveApi) {
          logger.warnOnce("api_inactive", "CryptoNews API appears inactive, using fallback provider");
          return null;
        }

        // Log non-OK responses at debug level - these are expected for plan limits
        logger.debug(`API responded with ${response.status} for ${items} items`);

        if (items !== fallbackItems) {
          continue;
        }
        return null;
      }

      let payload: CryptoNewsApiResponse | undefined;
      try {
        payload = bodyText ? (JSON.parse(bodyText) as CryptoNewsApiResponse) : undefined;
      } catch (error) {
        logger.debugExpectedError(`Failed to parse payload for ${items} items`, error);
        if (items !== fallbackItems) {
          continue;
        }
        return null;
      }

      const entries = payload?.data ?? [];

      // Check if entries contain inactive API indicators
      const hasInactiveIndicators = entries.some(
        (entry) => entry.news_url === "https://cryptonews-api.com" ||
          entry.title === "Crypto News API" ||
          /apiinactive|inactive/i.test(entry.title || "")
      );

      if (hasInactiveIndicators) {
        logger.warnOnce("api_inactive_indicators", "CryptoNews API returned inactive indicators, using fallback");
        return null;
      }

      if (!entries.length) {
        logger.debug(`API returned no articles for ${items} items`);
        if (items !== fallbackItems) {
          continue;
        }
        return null;
      }

      if (items !== preferredItems) {
        logger.warnOnce("plan_limited", `Results limited to ${items} items due to plan restrictions`);
      }

      return mapCryptoNewsArticles(entries);
    } catch (error) {
      logger.debugExpectedError(`Request failed for ${items} items`, error);
      if (items !== fallbackItems) {
        continue;
      }
      return null;
    }
  }

  return null;
}

async function fetchFromCoingeckoNews(): Promise<NewsArticle[]> {
  const base = COINGECKO_API_BASE.endsWith("/") ? COINGECKO_API_BASE.slice(0, -1) : COINGECKO_API_BASE;
  const url = new URL(`${base}/news`);
  url.searchParams.set("page", "1");
  url.searchParams.set("per_page", String(resolvedNewsLimit));

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (COINGECKO_API_KEY) {
    headers["x-cg-pro-api-key"] = COINGECKO_API_KEY;
  } else if (COINGECKO_DEMO_API_KEY) {
    headers["x-cg-demo-api-key"] = COINGECKO_DEMO_API_KEY;
  }

  const response = await fetch(url.toString(), {
    headers,
    next: { revalidate: CACHE_TTL_SECONDS },
  });

  const bodyText = await response.text();
  if (!response.ok) {
    const snippet = bodyText ? `: ${bodyText.slice(0, 160)}` : "";
    throw new Error(`CoinGecko news endpoint failed with ${response.status}${snippet}`);
  }

  let payload: CoingeckoNewsResponse | undefined;
  try {
    payload = bodyText ? (JSON.parse(bodyText) as CoingeckoNewsResponse) : undefined;
  } catch (error) {
    throw new Error(`[crypto-news] Unable to parse CoinGecko news payload: ${(error as Error).message}`);
  }

  const updates = payload?.data ?? [];
  return mapCoingeckoNews(updates);
}

export async function getLatestCryptoNews(): Promise<CachedResponse<NewsArticle[]>> {
  const cacheKey = buildCacheKey(["latest"]);
  return withCache(cacheKey, async () => {
    const primary = await fetchFromCryptoNewsApi();
    if (primary && primary.length) {
      return primary;
    }

    try {
      return await fetchFromCoingeckoNews();
    } catch (error) {
      logger.error("[crypto-news] fallback fetch failed", { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  });
}
