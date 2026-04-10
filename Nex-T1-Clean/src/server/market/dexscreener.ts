import crypto from "crypto";

import { redis } from "@/server/services/redis";
import { metrics, timeVendor } from "@/server/instrumentation/metrics";
import { createLogger } from "@/server/logging/logging";

const logger = createLogger("dexscreener");
import type { CachedResponse, DexPairSummary, DexTxnStats } from "@/types/market";

const API_BASE = process.env.DEXSCREENER_API_BASE ?? "https://api.dexscreener.com";
const CACHE_NAMESPACE = "dexscreener";
const DEFAULT_TIMEOUT_MS = Number(process.env.DEXSCREENER_TIMEOUT_MS ?? 10_000);
const STALE_CACHE_TTL_MULTIPLIER = 6;
const MIN_STALE_CACHE_SECONDS = 10 * 60;
const USER_AGENT =
  process.env.DEXSCREENER_USER_AGENT ??
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36";

const TRENDING_TTL_SECONDS = 90;
const SEARCH_TTL_SECONDS = 300;

class DexscreenerHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "DexscreenerHttpError";
  }
}

type CacheEntry<T> = {
  value: T;
  fetchedAt: string;
};

function computeStaleTtl(ttlSeconds: number): number {
  const expanded = ttlSeconds * STALE_CACHE_TTL_MULTIPLIER;
  return Math.max(expanded, MIN_STALE_CACHE_SECONDS);
}

async function readCacheEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const cached = await redis.get<CacheEntry<T>>(key);
    return cached ?? null;
  } catch (error) {
    logger.debugExpectedError(`cache read failed for key ${key}`, error);
    return null;
  }
}

async function readStaleCacheEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  const staleKey = `${key}:stale`;
  try {
    const cached = await redis.get<CacheEntry<T>>(staleKey);
    return cached ?? null;
  } catch (error) {
    logger.debugExpectedError(`stale cache read failed for key ${staleKey}`, error);
    return null;
  }
}

async function writeCacheEntry<T>(key: string, ttlSeconds: number, entry: CacheEntry<T>) {
  try {
    await redis.set(key, entry, { ex: ttlSeconds });
    await redis.set(`${key}:stale`, entry, { ex: computeStaleTtl(ttlSeconds) });
    metrics.cacheWrite(CACHE_NAMESPACE);
  } catch (error) {
    logger.debugExpectedError(`cache write failed for key ${key}`, error);
  }
}

type DexscreenerTokenPayload = {
  address?: string;
  name?: string;
  symbol?: string;
};

type DexscreenerLiquidityPayload = {
  usd?: number | string | null;
  base?: number | string | null;
  quote?: number | string | null;
};

type DexscreenerPriceChangePayload = {
  m5?: number | string | null;
  h1?: number | string | null;
  h6?: number | string | null;
  h24?: number | string | null;
};

type DexscreenerTxWindow = {
  buys?: number | string | null;
  sells?: number | string | null;
};

type DexscreenerTxStats = {
  m5?: DexscreenerTxWindow;
  h1?: DexscreenerTxWindow;
  h6?: DexscreenerTxWindow;
  h24?: DexscreenerTxWindow;
};

type DexscreenerVolumePayload = {
  m5?: number | string | null;
  h1?: number | string | null;
  h6?: number | string | null;
  h24?: number | string | null;
};

type DexscreenerInfoPayload = {
  imageUrl?: string;
  websites?: Array<{ url?: string }>;
  socials?: Array<{ platform?: string; handle?: string }>;
};

type DexscreenerPairPayload = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: DexscreenerTokenPayload;
  quoteToken?: DexscreenerTokenPayload;
  priceUsd?: number | string | null;
  priceNative?: number | string | null;
  liquidity?: DexscreenerLiquidityPayload;
  fdv?: number | string | null;
  marketCap?: number | string | null;
  txns?: DexscreenerTxStats;
  volume?: DexscreenerVolumePayload;
  info?: DexscreenerInfoPayload;
  pairCreatedAt?: number | string | null;
  priceChange?: DexscreenerPriceChangePayload;
  boosts?: { active?: number | null } | null;
  tags?: string[];
};

type DexscreenerTrendingResponse = {
  pairs?: DexscreenerPairPayload[];
};

type DexscreenerSearchResponse = {
  pairs?: DexscreenerPairPayload[];
};

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

async function withCache<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<CachedResponse<T>> {
  const cached = await readCacheEntry<T>(key);
  if (cached) {
    metrics.cacheHit(CACHE_NAMESPACE);
    return {
      data: cached.value,
      fetchedAt: cached.fetchedAt,
      cache: "hit",
    };
  }

  metrics.cacheMiss(CACHE_NAMESPACE);

  try {
    const value = await fetcher();
    const entry: CacheEntry<T> = {
      value,
      fetchedAt: new Date().toISOString(),
    };
    await writeCacheEntry(key, ttlSeconds, entry);
    return {
      data: value,
      fetchedAt: entry.fetchedAt,
      cache: "miss",
    };
  } catch (error) {
    const stale = await readStaleCacheEntry<T>(key);
    if (stale) {
      const message = error instanceof Error ? error.message : String(error);
      logger.debug(`serving stale cache after fetch error`, { error: message });
      return {
        data: stale.value,
        fetchedAt: stale.fetchedAt,
        cache: "hit",
        stale: true,
        error: message,
      };
    }
    throw error;
  }
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

function parseTimestamp(value: UntypedJson): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 10_000_000_000 ? value : value * 1000;
    return new Date(ms).toISOString();
  }

  if (typeof value === "string" && value.trim().length) {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      const ms = numeric > 10_000_000_000 ? numeric : numeric * 1000;
      return new Date(ms).toISOString();
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }

  return null;
}

function buildTxnStats(windowStats?: DexscreenerTxWindow | null): DexTxnStats | null {
  if (!windowStats) {
    return null;
  }
  const buys = toNumber(windowStats.buys);
  const sells = toNumber(windowStats.sells);
  if (buys == null && sells == null) {
    return null;
  }
  return {
    buys,
    sells,
    total: buys != null || sells != null ? (buys ?? 0) + (sells ?? 0) : null,
  };
}

function normalizePair(raw: DexscreenerPairPayload): DexPairSummary {
  const baseToken = raw.baseToken ?? {};
  const quoteToken = raw.quoteToken ?? {};
  const urlFromChain = raw.chainId && raw.pairAddress ? `https://dexscreener.com/${raw.chainId}/${raw.pairAddress}` : null;
  const idSource = raw.pairAddress ?? `${raw.chainId ?? "unknown"}:${baseToken.symbol ?? quoteToken.symbol ?? "pair"}`;
  const liquidity = raw.liquidity ?? {};
  const priceChange = raw.priceChange ?? {};

  return {
    id: idSource,
    source: "dexscreener",
    chainId: raw.chainId ?? null,
    network: raw.chainId ?? null,
    dexId: raw.dexId ?? null,
    dexName: raw.dexId ?? null,
    pairAddress: raw.pairAddress ?? null,
    url: raw.url ?? urlFromChain,
    baseToken: {
      address: baseToken.address ?? null,
      symbol: baseToken.symbol ?? null,
      name: baseToken.name ?? null,
      logoUrl: raw.info?.imageUrl ?? null,
      priceUsd: toNumber(raw.priceUsd),
    },
    quoteToken: {
      address: quoteToken.address ?? null,
      symbol: quoteToken.symbol ?? null,
      name: quoteToken.name ?? null,
      priceUsd: null,
    },
    priceUsd: toNumber(raw.priceUsd),
    priceNative: toNumber(raw.priceNative),
    priceChangePercent1h: toNumber(priceChange.h1),
    priceChangePercent6h: toNumber(priceChange.h6),
    priceChangePercent24h: toNumber(priceChange.h24),
    liquidityUsd: toNumber(liquidity.usd),
    liquidityBase: toNumber(liquidity.base),
    liquidityQuote: toNumber(liquidity.quote),
    volumeUsd1h: toNumber(raw.volume?.h1),
    volumeUsd6h: toNumber(raw.volume?.h6),
    volumeUsd24h: toNumber(raw.volume?.h24),
    fdvUsd: toNumber(raw.fdv),
    marketCapUsd: toNumber(raw.marketCap),
    transactions1h: buildTxnStats(raw.txns?.h1),
    transactions6h: buildTxnStats(raw.txns?.h6),
    transactions24h: buildTxnStats(raw.txns?.h24),
    pairCreatedAt: parseTimestamp(raw.pairCreatedAt),
    confidence: raw.boosts?.active != null ? `boost-${raw.boosts.active}` : null,
    score: null,
    tags: raw.tags ?? [],
  };
}

function clampLimit(value: UntypedJson, fallback = 20, max = 100): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(Math.max(1, Math.floor(value)), max);
  }
  return fallback;
}

type FetchOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

async function fetchDexscreener<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  options?: FetchOptions,
): Promise<T> {
  const url = new URL(path, API_BASE);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const abortReason = new DOMException(`Dexscreener request timed out after ${timeoutMs}ms`, "AbortError");
  const timeout = setTimeout(() => controller.abort(abortReason), timeoutMs);
  const abortExternal = () => {
    controller.abort(options?.signal?.reason ?? abortReason);
  };

  if (options?.signal) {
    if (options.signal.aborted) {
      controller.abort(options.signal.reason ?? abortReason);
    } else {
      options.signal.addEventListener("abort", abortExternal);
    }
  }

  try {
    const response = await timeVendor("dexscreener_rest", () =>
      fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
        signal: controller.signal,
      }),
    );

    if (!response.ok) {
      const body = await response.text();
      throw new DexscreenerHttpError(response.status, `[dexscreener] ${response.status}: ${body.slice(0, 160)}`);
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  } finally {
    clearTimeout(timeout);
    if (options?.signal) {
      options.signal.removeEventListener("abort", abortExternal);
    }
  }
}

export type TrendingPairsOptions = {
  limit?: number;
  chainId?: string;
  maxPairAgeMinutes?: number;
};

export async function getTrendingPairs(options: TrendingPairsOptions = {}): Promise<CachedResponse<DexPairSummary[]>> {
  const limit = clampLimit(options.limit, 20, 100);
  const fetchLimit = Math.min(limit * 2, 100);
  const cacheKey = buildCacheKey(["trending", fetchLimit, options.chainId ?? "*", options.maxPairAgeMinutes ?? null]);

  return withCache(cacheKey, TRENDING_TTL_SECONDS, async () => {
    let response: DexscreenerTrendingResponse | null = null;
    try {
      response = await fetchDexscreener<DexscreenerTrendingResponse>("/latest/dex/trending", {
        limit: fetchLimit,
      });
    } catch (error) {
      if (error instanceof DexscreenerHttpError && (error.status === 403 || error.status === 429)) {
        // Rate limit or block - expected behavior when API limits are hit
        logger.warnOnce(
          `trending_blocked_${error.status}`,
          `DexScreener API rate limited (${error.status}), serving stale cache if available`,
        );
        // Throw so withCache can serve stale data (and we don't overwrite cache with empty arrays).
        throw error;
      }
      throw error;
    }

    let pairs = Array.isArray(response.pairs) ? response.pairs.map(normalizePair) : [];

    if (options.chainId) {
      const target = options.chainId.toLowerCase();
      pairs = pairs.filter((pair) => (pair.chainId ?? "").toLowerCase() === target);
    }

    if (options.maxPairAgeMinutes) {
      const cutoff = Date.now() - options.maxPairAgeMinutes * 60 * 1000;
      pairs = pairs.filter((pair) => {
        if (!pair.pairCreatedAt) return false;
        const created = Date.parse(pair.pairCreatedAt);
        return Number.isNaN(created) ? false : created >= cutoff;
      });
    }

    return pairs.slice(0, limit);
  });
}

type SearchPairsOptions = {
  limit?: number;
  chainId?: string;
  maxPairAgeMinutes?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export async function searchPairs(query: string, options: SearchPairsOptions = {}): Promise<CachedResponse<DexPairSummary[]>> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      data: [],
      fetchedAt: new Date().toISOString(),
      cache: "miss",
    };
  }

  const limit = clampLimit(options.limit, 10, 50);
  const cacheKey = buildCacheKey(["search", trimmed.toLowerCase(), limit]);

  return withCache(cacheKey, SEARCH_TTL_SECONDS, async () => {
    let response: DexscreenerSearchResponse | null = null;
    try {
      response = await fetchDexscreener<DexscreenerSearchResponse>(
        "/latest/dex/search/",
        {
          q: trimmed,
        },
        {
          signal: options.signal,
          timeoutMs: options.timeoutMs,
        },
      );
    } catch (error) {
      if (error instanceof DexscreenerHttpError && (error.status === 403 || error.status === 429)) {
        // Rate limit or block - expected behavior when API limits are hit
        logger.warnOnce(
          `search_blocked_${error.status}`,
          `DexScreener search API rate limited (${error.status}), returning empty results`
        );
        return [];
      }
      throw error;
    }

    const pairs = Array.isArray(response.pairs) ? response.pairs.map(normalizePair) : [];
    return pairs.slice(0, limit);
  });
}
