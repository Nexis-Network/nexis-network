import crypto from "crypto";

import pRetry, { AbortError } from "p-retry";

import { getCoinDirectory, searchCoins } from "@/server/market/coingecko";
import { redis } from "@/server/services/redis";
import { metrics, timeVendor } from "@/server/instrumentation/metrics";
import { createLogger } from "@/server/logging/logging";
import type {

  CachedResponse,
  CoinDirectoryEntry,
  CoinMarketCapListing,
  CoinMarketCapSpotPair,
  CoinMarketCapTopMover,
  CoinMarketCapTopMovers,
  CoinMarketCapTrendingAsset,
  CoinSearchResult,
  Coinbase50Index,
  Coinbase50IndexPoint,
  CoinbaseLeaderboardRow,
  MarketSentiment,
} from "@/types/market";

const logger = createLogger("coinmarketcap");

const API_KEY = process.env.GOAT_COINMARKETCAP_API_KEY ?? process.env.COINMARKETCAP_API_KEY;
const API_BASE_URL = process.env.COINMARKETCAP_API_BASE ?? "https://pro-api.coinmarketcap.com";
const CACHE_NAMESPACE = "coinmarketcap";
const DEFAULT_TIMEOUT_MS = 12_000;
const RETRY_ATTEMPTS = 2;
const LISTINGS_LIMIT = 200;
const INDEX_DIVISOR = 4_000_000_000;
const IDENTIFIER_CACHE_PREFIX = `${CACHE_NAMESPACE}:resolver`;
const IDENTIFIER_CACHE_TTL_SECONDS = Number(process.env.COINMARKETCAP_ID_CACHE_TTL ?? 7 * 24 * 60 * 60);
const DIRECTORY_REFRESH_INTERVAL_MS = Number(process.env.COINMARKETCAP_DIRECTORY_REFRESH_MS ?? 2 * 60 * 60 * 1000);

const TOKEN_ID_BY_CMC = new Map<number, string | null>();
const TOKEN_ID_BY_SLUG = new Map<string, string | null>();
const TOKEN_ID_BY_SYMBOL = new Map<string, string | null>();

type CacheEntry<T> = {
  value: T;
  fetchedAt: string;
};

function ensureApiKey(): string {
  if (!API_KEY) {
    throw new Error("CoinMarketCap API key is not configured");
  }
  return API_KEY;
}

function stableStringify(value: UntypedJson): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, UntypedJson>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    .join(",")}}`;
}

function buildCacheKey(parts: UntypedJson[]): string {
  const signature = stableStringify(parts);
  const digest = crypto.createHash("sha1").update(signature).digest("hex");
  return `${CACHE_NAMESPACE}:${digest}`;
}

function fallbackErrorMessage(context: string, error: UntypedJson): string {
  if (error instanceof Error && error.message) {
    return `${context}: ${error.message}`;
  }
  if (typeof error === "string" && error.trim().length) {
    return `${context}: ${error}`;
  }
  return `${context}: Unknown error`;
}

async function withCache<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<CachedResponse<T>> {
  try {
    const cached = await redis.get<CacheEntry<T>>(key);
    if (cached) {
      metrics.cacheHit("coinmarketcap");
      return {
        data: cached.value,
        fetchedAt: cached.fetchedAt,
        cache: "hit",
      };
    }
    metrics.cacheMiss("coinmarketcap");
  } catch (error) {
    logger.warn(`[coinmarketcap] Failed to read cache key ${key}`, { error: error instanceof Error ? error.message : String(error) });
  }

  const value = await fetcher();
  const fetchedAt = new Date().toISOString();

  try {
    await redis.set(key, { value, fetchedAt } satisfies CacheEntry<T>, { ex: ttlSeconds });
    metrics.cacheWrite("coinmarketcap");
  } catch (error) {
    logger.warn(`[coinmarketcap] Failed to write cache key ${key}`, { error: error instanceof Error ? error.message : String(error) });
  }

  return {
    data: value,
    fetchedAt,
    cache: "miss",
  };
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;

  const seconds = Number(header);
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const absolute = Date.parse(header);
  if (!Number.isNaN(absolute)) {
    const diff = absolute - Date.now();
    return diff > 0 ? diff : undefined;
  }

  return undefined;
}

type CoinIdentifier = {
  id?: number | null;
  slug?: string | null;
  symbol?: string | null;
  name?: string | null;
};

type NormalizedIdentifier = {
  cmcId: number | null;
  slug?: string | null;
  normalizedSlug?: string | null;
  name?: string | null;
  normalizedNameSlug?: string | null;
  symbol?: string | null;
  normalizedSymbol?: string | null;
};

type CoinDirectoryIndex = {
  slugToId: Map<string, string>;
  symbolToIds: Map<string, Set<string>>;
};

let coinDirectoryIndexCache: { index: CoinDirectoryIndex; expiresAt: number } | null = null;
let coinDirectoryIndexPromise: Promise<CoinDirectoryIndex> | null = null;

function slugify(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized.length ? normalized : null;
}

function normalizeSymbol(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length ? normalized : null;
}

function normalizeIdentifier(identifier: CoinIdentifier): NormalizedIdentifier {
  const cmcId = typeof identifier.id === "number" ? identifier.id : null;
  const slug = typeof identifier.slug === "string" ? identifier.slug.trim() : "";
  const name = typeof identifier.name === "string" ? identifier.name.trim() : "";
  const symbol = typeof identifier.symbol === "string" ? identifier.symbol.trim() : "";
  const normalizedSlug = slugify(slug);
  const normalizedNameSlug = slugify(name);
  const normalizedSymbol = normalizeSymbol(symbol);

  return {
    cmcId,
    slug: slug || null,
    normalizedSlug,
    name: name || null,
    normalizedNameSlug,
    symbol: symbol || null,
    normalizedSymbol,
  };
}

function buildSlugCandidates(identifier: NormalizedIdentifier): string[] {
  const candidates = new Set<string>();
  if (identifier.slug) {
    const raw = identifier.slug.trim().toLowerCase();
    if (raw) {
      candidates.add(raw);
    }
  }
  if (identifier.normalizedSlug) {
    candidates.add(identifier.normalizedSlug);
  }
  if (identifier.normalizedNameSlug) {
    candidates.add(identifier.normalizedNameSlug);
  }
  return Array.from(candidates).filter(Boolean);
}

function buildDirectoryIndex(entries: CoinDirectoryEntry[]): CoinDirectoryIndex {
  const slugToId = new Map<string, string>();
  const symbolToIds = new Map<string, Set<string>>();

  for (const entry of entries) {
    const normalizedId = slugify(entry.id) ?? entry.id?.trim().toLowerCase() ?? "";
    if (!normalizedId) {
      continue;
    }

    const aliasCandidates = new Set<string>();
    aliasCandidates.add(normalizedId);
    const normalizedName = slugify(entry.name);
    if (normalizedName) {
      aliasCandidates.add(normalizedName);
    }

    for (const alias of aliasCandidates) {
      if (alias && !slugToId.has(alias)) {
        slugToId.set(alias, entry.id);
      }
    }

    const normalizedSymbol = normalizeSymbol(entry.symbol);
    if (normalizedSymbol) {
      if (!symbolToIds.has(normalizedSymbol)) {
        symbolToIds.set(normalizedSymbol, new Set());
      }
      symbolToIds.get(normalizedSymbol)!.add(entry.id);
    }
  }

  return { slugToId, symbolToIds };
}

async function loadDirectoryIndex(): Promise<CoinDirectoryIndex> {
  if (coinDirectoryIndexCache && coinDirectoryIndexCache.expiresAt > Date.now()) {
    return coinDirectoryIndexCache.index;
  }
  if (coinDirectoryIndexPromise) {
    return coinDirectoryIndexPromise;
  }

  coinDirectoryIndexPromise = (async () => {
    try {
      const response = await getCoinDirectory();
      const index = buildDirectoryIndex(response.data);
      coinDirectoryIndexCache = {
        index,
        expiresAt: Date.now() + DIRECTORY_REFRESH_INTERVAL_MS,
      };
      return index;
    } catch (error) {
      logger.warn("[coinmarketcap] Failed to refresh CoinGecko directory", { error: error instanceof Error ? error.message : String(error) });
      if (coinDirectoryIndexCache) {
        return coinDirectoryIndexCache.index;
      }
      throw error;
    } finally {
      coinDirectoryIndexPromise = null;
    }
  })();

  return coinDirectoryIndexPromise;
}

function buildIdentifierRedisKey(type: "cmc" | "slug" | "symbol", key: string): string {
  return `${IDENTIFIER_CACHE_PREFIX}:${type}:${key}`;
}

async function getCachedByCmcId(cmcId: number): Promise<string | null | undefined> {
  if (!Number.isFinite(cmcId)) {
    return undefined;
  }
  if (TOKEN_ID_BY_CMC.has(cmcId)) {
    return TOKEN_ID_BY_CMC.get(cmcId) ?? null;
  }
  try {
    const cached = await redis.get<string>(buildIdentifierRedisKey("cmc", String(cmcId)));
    if (typeof cached === "string" && cached.length) {
      TOKEN_ID_BY_CMC.set(cmcId, cached);
      return cached;
    }
  } catch (error) {
    logger.warn(`[coinmarketcap] Failed to read cached CoinGecko id for cmc:${cmcId}`, { error: error instanceof Error ? error.message : String(error) });
  }
  return undefined;
}

async function getCachedBySlug(slug: string): Promise<string | null | undefined> {
  if (!slug) {
    return undefined;
  }
  const key = slug.toLowerCase();
  if (TOKEN_ID_BY_SLUG.has(key)) {
    return TOKEN_ID_BY_SLUG.get(key) ?? null;
  }
  try {
    const cached = await redis.get<string>(buildIdentifierRedisKey("slug", key));
    if (typeof cached === "string" && cached.length) {
      TOKEN_ID_BY_SLUG.set(key, cached);
      return cached;
    }
  } catch (error) {
    logger.warn(`[coinmarketcap] Failed to read cached CoinGecko id for slug:${key}`, { error: error instanceof Error ? error.message : String(error) });
  }
  return undefined;
}

async function getCachedBySymbol(symbol: string): Promise<string | null | undefined> {
  if (!symbol) {
    return undefined;
  }
  const key = symbol.toLowerCase();
  if (TOKEN_ID_BY_SYMBOL.has(key)) {
    return TOKEN_ID_BY_SYMBOL.get(key) ?? null;
  }
  try {
    const cached = await redis.get<string>(buildIdentifierRedisKey("symbol", key));
    if (typeof cached === "string" && cached.length) {
      TOKEN_ID_BY_SYMBOL.set(key, cached);
      return cached;
    }
  } catch (error) {
    logger.warn(`[coinmarketcap] Failed to read cached CoinGecko id for symbol:${key}`, { error: error instanceof Error ? error.message : String(error) });
  }
  return undefined;
}

async function writeIdentifierRedisValue(type: "cmc" | "slug" | "symbol", key: string, value: string): Promise<void> {
  if (IDENTIFIER_CACHE_TTL_SECONDS <= 0) {
    return;
  }
  try {
    await redis.set(buildIdentifierRedisKey(type, key), value, { ex: IDENTIFIER_CACHE_TTL_SECONDS });
  } catch (error) {
    logger.warn(`[coinmarketcap] Failed to persist ${type}:${key} mapping`, { error: error instanceof Error ? error.message : String(error) });
  }
}

async function persistIdentifierMapping(identifier: NormalizedIdentifier, coingeckoId: string): Promise<void> {
  const tasks: Promise<UntypedJson>[] = [];

  if (identifier.cmcId != null) {
    TOKEN_ID_BY_CMC.set(identifier.cmcId, coingeckoId);
    tasks.push(writeIdentifierRedisValue("cmc", String(identifier.cmcId), coingeckoId));
  }

  const slugKeys = new Set(buildSlugCandidates(identifier));
  for (const slug of slugKeys) {
    TOKEN_ID_BY_SLUG.set(slug, coingeckoId);
    tasks.push(writeIdentifierRedisValue("slug", slug, coingeckoId));
  }

  if (identifier.normalizedSymbol) {
    TOKEN_ID_BY_SYMBOL.set(identifier.normalizedSymbol, coingeckoId);
    tasks.push(writeIdentifierRedisValue("symbol", identifier.normalizedSymbol, coingeckoId));
  }

  await Promise.allSettled(tasks);
}

function cacheNegativeMapping(identifier: NormalizedIdentifier) {
  if (identifier.cmcId != null && !TOKEN_ID_BY_CMC.has(identifier.cmcId)) {
    TOKEN_ID_BY_CMC.set(identifier.cmcId, null);
  }
  for (const slug of buildSlugCandidates(identifier)) {
    if (!TOKEN_ID_BY_SLUG.has(slug)) {
      TOKEN_ID_BY_SLUG.set(slug, null);
    }
  }
  if (identifier.normalizedSymbol && !TOKEN_ID_BY_SYMBOL.has(identifier.normalizedSymbol)) {
    TOKEN_ID_BY_SYMBOL.set(identifier.normalizedSymbol, null);
  }
}

async function lookupCachedIdentifier(identifier: NormalizedIdentifier): Promise<string | null | undefined> {
  if (identifier.cmcId != null) {
    const cachedById = await getCachedByCmcId(identifier.cmcId);
    if (cachedById !== undefined) {
      return cachedById;
    }
  }

  for (const slug of buildSlugCandidates(identifier)) {
    const cachedSlug = await getCachedBySlug(slug);
    if (cachedSlug !== undefined) {
      return cachedSlug;
    }
  }

  if (identifier.normalizedSymbol) {
    const cachedSymbol = await getCachedBySymbol(identifier.normalizedSymbol);
    if (cachedSymbol !== undefined) {
      return cachedSymbol;
    }
  }

  return undefined;
}

async function findInDirectory(identifier: NormalizedIdentifier): Promise<string | null> {
  const directory = await loadDirectoryIndex();

  for (const slug of buildSlugCandidates(identifier)) {
    const match = directory.slugToId.get(slug);
    if (match) {
      return match;
    }
  }

  if (identifier.normalizedSymbol) {
    const possible = directory.symbolToIds.get(identifier.normalizedSymbol);
    if (possible && possible.size === 1) {
      return Array.from(possible)[0];
    }
    if (possible && possible.size > 1) {
      const targetSlugs = new Set(buildSlugCandidates(identifier));
      for (const id of possible) {
        const normalized = slugify(id);
        if (normalized && targetSlugs.has(normalized)) {
          return id;
        }
      }
    }
  }

  return null;
}

function compareMarketCapRank(left: CoinSearchResult, right: CoinSearchResult): number {
  const leftRank = typeof left.marketCapRank === "number" ? left.marketCapRank : Number.POSITIVE_INFINITY;
  const rightRank = typeof right.marketCapRank === "number" ? right.marketCapRank : Number.POSITIVE_INFINITY;
  return leftRank - rightRank;
}

function computeSearchScore(entry: CoinSearchResult, identifier: NormalizedIdentifier): number {
  let score = 0;
  const entrySlug = slugify(entry.id);
  const entryNameSlug = slugify(entry.name);

  if (identifier.normalizedSlug && entrySlug && entrySlug === identifier.normalizedSlug) {
    score += 10;
  } else if (identifier.normalizedSlug && entryNameSlug && entryNameSlug === identifier.normalizedSlug) {
    score += 7;
  }

  if (identifier.normalizedNameSlug && entrySlug && entrySlug === identifier.normalizedNameSlug) {
    score += 6;
  } else if (
    identifier.normalizedNameSlug &&
    entryNameSlug &&
    entryNameSlug === identifier.normalizedNameSlug
  ) {
    score += 4;
  }

  if (identifier.normalizedSymbol && entry.symbol === identifier.normalizedSymbol) {
    score += 3;
  } else if (identifier.normalizedSymbol && entry.symbol?.startsWith(identifier.normalizedSymbol)) {
    score += 1;
  }

  return score;
}

function selectBestSearchMatch(
  results: CoinSearchResult[],
  identifier: NormalizedIdentifier,
): CoinSearchResult | null {
  let best: { entry: CoinSearchResult; score: number } | null = null;

  for (const entry of results) {
    if (!entry?.id) {
      continue;
    }
    const score = computeSearchScore(entry, identifier);
    if (score <= 0) {
      continue;
    }
    if (!best || score > best.score || (score === best.score && compareMarketCapRank(entry, best.entry) < 0)) {
      best = { entry, score };
    }
  }

  return best?.entry ?? null;
}

async function findViaSearch(identifier: NormalizedIdentifier): Promise<string | null> {
  const queries = new Set<string>();
  if (identifier.slug) {
    queries.add(identifier.slug);
  }
  if (identifier.name) {
    queries.add(identifier.name);
  }
  if (identifier.symbol) {
    queries.add(identifier.symbol);
  }
  if (identifier.symbol && identifier.slug) {
    queries.add(`${identifier.symbol} ${identifier.slug}`);
  }

  for (const query of queries) {
    const response = await searchCoins(query);
    const match = selectBestSearchMatch(response.data, identifier);
    if (match) {
      return match.id;
    }
  }

  return null;
}

async function resolveCoingeckoId(identifier: CoinIdentifier): Promise<string | null> {
  const normalized = normalizeIdentifier(identifier);
  const cached = await lookupCachedIdentifier(normalized);
  if (cached !== undefined) {
    return cached;
  }

  const directoryMatch = await findInDirectory(normalized);
  if (directoryMatch) {
    await persistIdentifierMapping(normalized, directoryMatch);
    return directoryMatch;
  }

  const searchMatch = await findViaSearch(normalized);
  if (searchMatch) {
    await persistIdentifierMapping(normalized, searchMatch);
    return searchMatch;
  }

  cacheNegativeMapping(normalized);
  return null;
}

class CoinMarketCapRetryableError extends Error {
  status?: number;
  retryAfterMs?: number;

  constructor(message: string, status?: number, retryAfterMs?: number) {
    super(message);
    this.name = "CoinMarketCapRetryableError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

async function fetchFromCmc<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const apiKey = ensureApiKey();
  const url = new URL(path, API_BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return pRetry(
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

      try {
        const response = await timeVendor("coinmarketcap_rest", () =>
          fetch(url.toString(), {
            headers: {
              Accept: "application/json",
              "X-CMC_PRO_API_KEY": apiKey,
            },
            signal: controller.signal,
          } satisfies RequestInit),
        );

        if (!response.ok) {
          const body = await response.text();
          const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
          const message = `CoinMarketCap REST ${response.status}: ${body}`;

          // 403/404 are non-retryable (subscription plan limits, endpoint not found)
          // Don't retry these, let the caller handle fallback
          if (response.status === 403 || response.status === 404) {
            throw new AbortError(message);
          }

          if (response.status === 429 || response.status >= 500) {
            throw new CoinMarketCapRetryableError(message, response.status, retryAfterMs);
          }

          throw new AbortError(message);
        }

        const text = await response.text();
        return text ? (JSON.parse(text) as T) : ({} as T);
      } finally {
        clearTimeout(timeout);
      }
    },
    {
      retries: RETRY_ATTEMPTS,
      minTimeout: 400,
      maxTimeout: 2_000,
      factor: 2,
      onFailedAttempt: (error) => {
        if (error instanceof CoinMarketCapRetryableError && error.retryAfterMs) {
          return new Promise((resolve) => {
            setTimeout(resolve, error.retryAfterMs);
          });
        }
        return undefined;
      },
    },
  );
}

type ListingsResponse = {
  data?: Array<{
    id: number;
    name: string;
    symbol: string;
    slug?: string;
    cmc_rank?: number;
    num_market_pairs?: number;
    date_added?: string;
    tags?: string[];
    platform?: {
      id?: number;
      name?: string;
      symbol?: string;
      slug?: string;
      token_address?: string;
    } | null;
    max_supply?: number;
    circulating_supply?: number;
    total_supply?: number;
    last_updated?: string;
    quote?: {
      USD?: {
        price?: number;
        percent_change_1h?: number;
        percent_change_24h?: number;
        percent_change_7d?: number;
        volume_24h?: number;
        volume_change_24h?: number;
        market_cap?: number;
        fully_diluted_market_cap?: number;
        last_updated?: string;
      };
    };
  }>;
};

type TopMoverEntry = {
  id: number;
  name: string;
  symbol: string;
  slug?: string;
  cmc_rank?: number;
  num_market_pairs?: number;
  last_updated?: string;
  tags?: string[];
  quote?: {
    USD?: {
      price?: number;
      percent_change_1h?: number;
      percent_change_24h?: number;
      percent_change_7d?: number;
      market_cap?: number;
      volume_24h?: number;
      last_updated?: string;
    };
  };
};

type TopMoversResponse = {
  data?: {
    time_period?: string;
    gainers?: TopMoverEntry[];
    losers?: TopMoverEntry[];
  };
};

type SpotPairsLatestResponse = {
  data?: Array<{
    id?: number;
    market_pair_id?: number;
    name?: string;
    symbol?: string;
    market_pair?: string;
    exchange?: { name?: string };
    exchange_name?: string;
    market_pair_base?: { currency_symbol?: string; symbol?: string };
    market_pair_quote?: { currency_symbol?: string; symbol?: string };
    quote?: {
      USD?: {
        price?: number;
        volume_24h?: number;
        last_updated?: string;
      };
    };
    last_updated?: string;
  }>;
};

type TrendingLatestResponse = {
  data?: Array<{
    id: number;
    name: string;
    symbol: string;
    slug?: string;
    cmc_rank?: number;
    score?: number;
    last_updated?: string;
    quote?: {
      USD?: {
        price?: number;
        percent_change_24h?: number;
        market_cap?: number;
        volume_24h?: number;
        last_updated?: string;
      };
    };
  }>;
};

async function getListings(limit = LISTINGS_LIMIT, start = 1): Promise<CachedResponse<ListingsResponse["data"]>> {
  return withCache(buildCacheKey(["listings", limit, start]), 45, async () => {
    const response = await fetchFromCmc<ListingsResponse>("/v1/cryptocurrency/listings/latest", {
      limit,
      convert: "USD",
      sort: "volume_24h",
      start,
    });
    return response.data ?? [];
  });
}

function toNumber(value: UntypedJson): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function clampListingLimit(value: number | undefined, fallback = 25, max = LISTINGS_LIMIT): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(Math.max(1, Math.floor(value)), max);
  }
  return fallback;
}

function normalizeListing(entry: NonNullable<ListingsResponse["data"]>[number]): CoinMarketCapListing {
  const usd = entry.quote?.USD ?? {};

  return {
    id: entry.id,
    name: entry.name,
    symbol: entry.symbol,
    slug: entry.slug ?? null,
    cmcRank: toNumber(entry.cmc_rank),
    marketPairCount: toNumber(entry.num_market_pairs),
    dateAdded: entry.date_added ?? null,
    tags: Array.isArray(entry.tags) ? entry.tags.filter((tag): tag is string => typeof tag === "string") : undefined,
    platform: entry.platform
      ? {
        id: entry.platform.id ?? null,
        name: entry.platform.name ?? null,
        symbol: entry.platform.symbol ?? null,
        slug: entry.platform.slug ?? null,
        tokenAddress: entry.platform.token_address ?? null,
      }
      : null,
    maxSupply: toNumber(entry.max_supply),
    circulatingSupply: toNumber(entry.circulating_supply),
    totalSupply: toNumber(entry.total_supply),
    fullyDilutedMarketCapUsd: toNumber(usd.fully_diluted_market_cap),
    lastUpdated: entry.last_updated ?? usd.last_updated ?? null,
    quote: {
      priceUsd: toNumber(usd.price),
      volume24hUsd: toNumber(usd.volume_24h),
      percentChange1h: toNumber(usd.percent_change_1h),
      percentChange24h: toNumber(usd.percent_change_24h),
      percentChange7d: toNumber(usd.percent_change_7d),
      marketCapUsd: toNumber(usd.market_cap),
      fullyDilutedMarketCapUsd: toNumber(usd.fully_diluted_market_cap),
      lastUpdated: usd.last_updated ?? entry.last_updated ?? null,
    },
  };
}

async function normalizeTopMover(entry: TopMoverEntry, direction: "gainer" | "loser"): Promise<CoinMarketCapTopMover> {
  const usd = entry.quote?.USD ?? {};

  return {
    id: entry.id,
    name: entry.name,
    symbol: entry.symbol,
    slug: entry.slug ?? null,
    cmcRank: toNumber(entry.cmc_rank),
    direction,
    priceUsd: toNumber(usd.price),
    marketCapUsd: toNumber(usd.market_cap),
    volume24hUsd: toNumber(usd.volume_24h),
    percentChange1h: toNumber(usd.percent_change_1h),
    percentChange24h: toNumber(usd.percent_change_24h),
    percentChange7d: toNumber(usd.percent_change_7d),
    tags: Array.isArray(entry.tags) ? entry.tags.filter((tag): tag is string => typeof tag === "string") : undefined,
    lastUpdated: entry.last_updated ?? usd.last_updated ?? null,
    coingeckoId: await resolveCoingeckoId({
      id: entry.id,
      slug: entry.slug,
      symbol: entry.symbol,
      name: entry.name ?? entry.symbol ?? null,
    }),
  };
}

type SpotPairEntry = Required<SpotPairsLatestResponse>["data"][number];

function normalizeSpotPair(entry: SpotPairEntry): CoinMarketCapSpotPair {
  const usd = entry?.quote?.USD ?? {};
  const baseSymbol = entry?.market_pair_base?.currency_symbol ?? entry?.market_pair_base?.symbol ?? null;
  const quoteSymbol = entry?.market_pair_quote?.currency_symbol ?? entry?.market_pair_quote?.symbol ?? null;
  const mergedPair = [baseSymbol, quoteSymbol].filter(Boolean).join("/");
  const pairSymbol = entry?.market_pair ?? (mergedPair || null);

  return {
    id: entry?.id ?? entry?.market_pair_id ?? 0,
    name: entry?.name ?? entry?.market_pair ?? entry?.symbol ?? "",
    symbol: entry?.symbol ?? null,
    pairSymbol,
    baseSymbol,
    quoteSymbol,
    exchangeName: entry?.exchange?.name ?? entry?.exchange_name ?? null,
    priceUsd: toNumber(usd?.price),
    volume24hUsd: toNumber(usd?.volume_24h),
    lastUpdated: entry?.last_updated ?? usd?.last_updated ?? null,
  } satisfies CoinMarketCapSpotPair;
}

type TrendingLatestEntry = Required<TrendingLatestResponse>["data"][number];

function normalizeTrendingLatest(entry: TrendingLatestEntry): CoinMarketCapTrendingAsset {
  const usd = entry?.quote?.USD ?? {};
  return {
    id: entry?.id ?? 0,
    name: entry?.name ?? entry?.symbol ?? "",
    symbol: entry?.symbol ?? "",
    slug: entry?.slug ?? null,
    cmcRank: toNumber(entry?.cmc_rank),
    score: toNumber(entry?.score),
    priceUsd: toNumber(usd?.price),
    percentChange24h: toNumber(usd?.percent_change_24h),
    marketCapUsd: toNumber(usd?.market_cap),
    volume24hUsd: toNumber(usd?.volume_24h),
    lastUpdated: usd?.last_updated ?? entry?.last_updated ?? null,
  } satisfies CoinMarketCapTrendingAsset;
}

function buildSyntheticChart(level: number | null, percentChange24h: number | null): Coinbase50IndexPoint[] {
  if (level == null) {
    return [];
  }

  const totalPoints = 16;
  const now = Date.now();
  const change = (percentChange24h ?? 0) / 100;
  const points: Coinbase50IndexPoint[] = [];

  for (let i = totalPoints - 1; i >= 0; i -= 1) {
    const progress = 1 - i / (totalPoints - 1);
    const wave = Math.sin(progress * Math.PI * 1.5) * 0.15; // s-curve wobble
    const value = level * (1 + change * progress + wave * change);
    points.push({
      timestamp: new Date(now - i * 60 * 60 * 1000).toISOString(),
      value: Number(value.toFixed(2)),
    });
  }

  return points;
}

export async function getMarketSentiment(): Promise<CachedResponse<MarketSentiment>> {
  return withCache(buildCacheKey(["sentiment", "latest"]), 120, async () => {
    const response = await fetchFromCmc<{
      data?: { value?: number; value_classification?: string; update_time?: string } | null;
    }>("/v3/fear-and-greed/latest");

    const payload = response.data ?? null;
    return {
      score: toNumber(payload?.value),
      classification: typeof payload?.value_classification === "string" ? payload.value_classification : null,
      updatedAt: payload?.update_time ?? null,
    };
  });
}

export async function getCoinbaseLeaderboard(limit = 12): Promise<CachedResponse<CoinbaseLeaderboardRow[]>> {
  const listings = await getListings();
  const baseRows = (listings.data ?? [])
    .filter((row) => row?.quote?.USD)
    .sort((a, b) => {
      const left = toNumber(a.quote?.USD?.volume_24h) ?? 0;
      const right = toNumber(b.quote?.USD?.volume_24h) ?? 0;
      return right - left;
    })
    .slice(0, limit);

  const rows = await Promise.all(
    baseRows.map(async (row) => {
      const usd = row.quote?.USD ?? {};
      return {
        id: row.id,
        name: row.name ?? row.symbol ?? "",
        symbol: row.symbol ?? "",
        pair: `${row.symbol ?? ""}/USD`,
        rank: toNumber(row.cmc_rank),
        priceUsd: toNumber(usd.price),
        priceChangePercent24h: toNumber(usd.percent_change_24h),
        volume24hUsd: toNumber(usd.volume_24h),
        volumeChangePercent24h: toNumber(usd.volume_change_24h),
        marketCapUsd: toNumber(usd.market_cap),
        coingeckoId: await resolveCoingeckoId({
          id: row.id,
          slug: row.slug,
          symbol: row.symbol,
          name: row.name ?? row.symbol ?? null,
        }),
      } satisfies CoinbaseLeaderboardRow;
    }),
  );

  return {
    data: rows,
    fetchedAt: listings.fetchedAt,
    cache: listings.cache,
  };
}

export async function getCoinbase50Index(): Promise<CachedResponse<Coinbase50Index>> {
  const listings = await getListings();
  const ordered = [...(listings.data ?? [])]
    .filter((row) => typeof row.cmc_rank === "number")
    .sort((a, b) => (a.cmc_rank ?? Infinity) - (b.cmc_rank ?? Infinity))
    .slice(0, 50);

  let totalMarketCap = 0;
  let totalVolume24h = 0;
  let weightedChange = 0;

  for (const row of ordered) {
    const usd = row.quote?.USD ?? {};
    const marketCap = toNumber(usd.market_cap) ?? 0;
    const volume = toNumber(usd.volume_24h) ?? 0;
    const change = toNumber(usd.percent_change_24h) ?? 0;

    totalMarketCap += marketCap;
    totalVolume24h += volume;
    weightedChange += marketCap * change;
  }

  const level = totalMarketCap > 0 ? totalMarketCap / INDEX_DIVISOR : null;
  const changePercent24h = totalMarketCap > 0 ? weightedChange / totalMarketCap : null;
  const changeValue24h =
    level != null && changePercent24h != null ? Number((level * (changePercent24h / 100)).toFixed(2)) : null;

  return {
    data: {
      level: level != null ? Number(level.toFixed(2)) : null,
      changePercent24h: changePercent24h != null ? Number(changePercent24h.toFixed(2)) : null,
      changeValue24h,
      volume24hUsd: totalVolume24h > 0 ? totalVolume24h : null,
      updatedAt: listings.fetchedAt,
      divisor: INDEX_DIVISOR,
      chart: buildSyntheticChart(level, changePercent24h),
    },
    fetchedAt: listings.fetchedAt,
    cache: listings.cache,
  };
}

export async function getLatestListings(limit = 25, start = 1): Promise<CachedResponse<CoinMarketCapListing[]>> {
  const sanitizedLimit = clampListingLimit(limit, 25, LISTINGS_LIMIT);
  const sanitizedStart = Math.max(1, Math.floor(start));
  const listings = await getListings(sanitizedLimit, sanitizedStart);
  const normalized = (listings.data ?? []).map(normalizeListing);

  return {
    data: normalized,
    fetchedAt: listings.fetchedAt,
    cache: listings.cache,
  };
}

export async function getSpotPairsLatest(limit = 10): Promise<CachedResponse<CoinMarketCapSpotPair[]>> {
  const sanitizedLimit = clampListingLimit(limit, 5, 50);
  const cacheKey = buildCacheKey(["spot-pairs-latest", sanitizedLimit]);

  try {
    return await withCache(cacheKey, 180, async () => {
      const response = await fetchFromCmc<SpotPairsLatestResponse>("/v1/spot_pairs/latest", {
        limit: sanitizedLimit,
        convert: "USD",
      });
      return (response.data ?? []).map(normalizeSpotPair);
    });
  } catch (error) {
    logger.debugExpectedError("spot-pairs-latest endpoint unavailable (free tier), using listings fallback", error);
    return fallbackSpotPairsFromListings(sanitizedLimit, error);
  }
}

export async function getTrendingLatest(limit = 10): Promise<CachedResponse<CoinMarketCapTrendingAsset[]>> {
  const sanitizedLimit = clampListingLimit(limit, 5, 50);
  const cacheKey = buildCacheKey(["trending-latest", sanitizedLimit]);

  try {
    return await withCache(cacheKey, 180, async () => {
      const response = await fetchFromCmc<TrendingLatestResponse>("/v1/cryptocurrency/trending/latest", {
        limit: sanitizedLimit,
        convert: "USD",
      });
      return (response.data ?? []).map(normalizeTrendingLatest);
    });
  } catch (error) {
    logger.debugExpectedError("trending-latest endpoint unavailable (free tier), using listings fallback", error);
    return fallbackTrendingLatestFromListings(sanitizedLimit, error);
  }
}

export async function getTopGainersLosers(limit = 10): Promise<CachedResponse<CoinMarketCapTopMovers>> {
  const sanitizedLimit = clampListingLimit(limit, 10, 50);
  const cacheKey = buildCacheKey(["top-gainers-losers", sanitizedLimit]);

  try {
    return await withCache(cacheKey, 180, async () => {
      const response = await fetchFromCmc<TopMoversResponse>("/v1/cryptocurrency/trending/gainers-losers", {
        limit: sanitizedLimit,
        convert: "USD",
        time_period: "24h",
      });

      const gainers = await Promise.all(
        (response.data?.gainers ?? []).slice(0, sanitizedLimit).map((entry) => normalizeTopMover(entry, "gainer")),
      );
      const losers = await Promise.all(
        (response.data?.losers ?? []).slice(0, sanitizedLimit).map((entry) => normalizeTopMover(entry, "loser")),
      );

      return {
        timePeriod: response.data?.time_period ?? "24h",
        gainers,
        losers,
        approximate: false,
      } satisfies CoinMarketCapTopMovers;
    });
  } catch (error) {
    logger.debugExpectedError("top-gainers-losers endpoint unavailable (free tier), using listings fallback", error);
    return fallbackTopMoversFromListings(sanitizedLimit, error);
  }
}

async function loadListingsSnapshot(limit: number): Promise<CachedResponse<CoinMarketCapListing[]>> {
  return getLatestListings(Math.max(25, limit));
}

function listingToTrendingAsset(listing: CoinMarketCapListing): CoinMarketCapTrendingAsset {
  const quote = listing.quote ?? {};
  const volume = typeof quote.volume24hUsd === "number" ? quote.volume24hUsd : null;
  const score =
    typeof volume === "number" && volume > 0 ? Number(Math.min(100, Math.log10(volume + 1) * 10).toFixed(1)) : null;

  return {
    id: listing.id,
    name: listing.name ?? listing.symbol ?? "Unlisted",
    symbol: listing.symbol ?? (listing.name ? listing.name.slice(0, 3).toUpperCase() : "--"),
    slug: listing.slug ?? null,
    cmcRank: listing.cmcRank ?? null,
    score,
    priceUsd: quote.priceUsd ?? null,
    percentChange24h: quote.percentChange24h ?? null,
    marketCapUsd: quote.marketCapUsd ?? null,
    volume24hUsd: quote.volume24hUsd ?? null,
    lastUpdated: quote.lastUpdated ?? listing.lastUpdated ?? null,
  } satisfies CoinMarketCapTrendingAsset;
}

function listingToSpotPair(listing: CoinMarketCapListing): CoinMarketCapSpotPair {
  const quote = listing.quote ?? {};
  const symbol = listing.symbol ?? null;
  const pairSymbol = symbol ? `${symbol}/USD` : listing.name ?? null;

  return {
    id: listing.id,
    name: listing.name ?? listing.symbol ?? "Unlisted Pair",
    symbol,
    pairSymbol,
    baseSymbol: symbol,
    quoteSymbol: "USD",
    exchangeName: "CoinMarketCap",
    priceUsd: quote.priceUsd ?? null,
    volume24hUsd: quote.volume24hUsd ?? null,
    lastUpdated: quote.lastUpdated ?? listing.lastUpdated ?? null,
  } satisfies CoinMarketCapSpotPair;
}

function listingToTopMoverFallback(
  listing: CoinMarketCapListing,
  direction: "gainer" | "loser",
): CoinMarketCapTopMover {
  const quote = listing.quote ?? {};
  return {
    id: listing.id,
    name: listing.name ?? listing.symbol ?? "Unlisted",
    symbol: listing.symbol ?? "",
    slug: listing.slug ?? null,
    cmcRank: listing.cmcRank ?? null,
    direction,
    priceUsd: quote.priceUsd ?? null,
    marketCapUsd: quote.marketCapUsd ?? null,
    volume24hUsd: quote.volume24hUsd ?? null,
    percentChange1h: quote.percentChange1h ?? null,
    percentChange24h: quote.percentChange24h ?? null,
    percentChange7d: quote.percentChange7d ?? null,
    tags: listing.tags,
    lastUpdated: quote.lastUpdated ?? listing.lastUpdated ?? null,
    coingeckoId: null,
  } satisfies CoinMarketCapTopMover;
}

async function fallbackTrendingLatestFromListings(
  limit: number,
  error: UntypedJson,
): Promise<CachedResponse<CoinMarketCapTrendingAsset[]>> {
  try {
    const snapshot = await loadListingsSnapshot(limit * 2);
    const ordered = [...(snapshot.data ?? [])]
      .sort((a, b) => (b.quote?.volume24hUsd ?? 0) - (a.quote?.volume24hUsd ?? 0))
      .slice(0, limit)
      .map(listingToTrendingAsset);

    return {
      data: ordered,
      fetchedAt: snapshot.fetchedAt,
      cache: snapshot.cache,
      fallback: true,
      error: fallbackErrorMessage("CoinMarketCap trending latest unavailable", error),
    } satisfies CachedResponse<CoinMarketCapTrendingAsset[]>;
  } catch (fallbackError) {
    return {
      data: [],
      fetchedAt: new Date().toISOString(),
      cache: "miss",
      fallback: true,
      error: fallbackErrorMessage("CoinMarketCap trending latest fallback failed", fallbackError),
    } satisfies CachedResponse<CoinMarketCapTrendingAsset[]>;
  }
}

async function fallbackSpotPairsFromListings(
  limit: number,
  error: UntypedJson,
): Promise<CachedResponse<CoinMarketCapSpotPair[]>> {
  try {
    const snapshot = await loadListingsSnapshot(limit * 2);
    const pairs = (snapshot.data ?? []).slice(0, limit).map(listingToSpotPair);
    return {
      data: pairs,
      fetchedAt: snapshot.fetchedAt,
      cache: snapshot.cache,
      fallback: true,
      error: fallbackErrorMessage("CoinMarketCap latest listings unavailable", error),
    } satisfies CachedResponse<CoinMarketCapSpotPair[]>;
  } catch (fallbackError) {
    return {
      data: [],
      fetchedAt: new Date().toISOString(),
      cache: "miss",
      fallback: true,
      error: fallbackErrorMessage("CoinMarketCap listings fallback failed", fallbackError),
    } satisfies CachedResponse<CoinMarketCapSpotPair[]>;
  }
}

async function fallbackTopMoversFromListings(
  limit: number,
  error: UntypedJson,
): Promise<CachedResponse<CoinMarketCapTopMovers>> {
  try {
    const snapshot = await loadListingsSnapshot(Math.max(limit * 4, 40));
    const rows = snapshot.data ?? [];
    const withChange = rows.filter((listing) => typeof listing.quote?.percentChange24h === "number");

    const gainersRaw = withChange
      .filter((listing) => (listing.quote?.percentChange24h ?? 0) > 0)
      .sort((a, b) => (b.quote?.percentChange24h ?? 0) - (a.quote?.percentChange24h ?? 0))
      .slice(0, limit);
    const losersRaw = withChange
      .filter((listing) => (listing.quote?.percentChange24h ?? 0) < 0)
      .sort((a, b) => (a.quote?.percentChange24h ?? 0) - (b.quote?.percentChange24h ?? 0))
      .slice(0, limit);

    const gainers = gainersRaw.map((listing) => listingToTopMoverFallback(listing, "gainer"));
    const losers = losersRaw.map((listing) => listingToTopMoverFallback(listing, "loser"));

    return {
      data: {
        timePeriod: "24h",
        gainers,
        losers,
        approximate: true,
      },
      fetchedAt: snapshot.fetchedAt,
      cache: snapshot.cache,
      fallback: true,
      error: fallbackErrorMessage("CoinMarketCap gainers/losers unavailable", error),
    } satisfies CachedResponse<CoinMarketCapTopMovers>;
  } catch (fallbackError) {
    return {
      data: {
        timePeriod: "24h",
        gainers: [],
        losers: [],
        approximate: true,
      },
      fetchedAt: new Date().toISOString(),
      cache: "miss",
      fallback: true,
      error: fallbackErrorMessage("CoinMarketCap gainers/losers fallback failed", fallbackError),
    } satisfies CachedResponse<CoinMarketCapTopMovers>;
  }
}
