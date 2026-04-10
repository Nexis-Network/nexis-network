import crypto from "crypto";

import pRetry, { AbortError } from "p-retry";

import { withCircuitBreaker } from "@/lib/circuit-breaker/circuit-breaker";
import { redis } from "@/server/services/redis";
import { metrics, timeVendor } from "@/server/instrumentation/metrics";
import { createLogger } from "@/server/logging/logging";
import type { CachedResponse, DexPairSummary } from "@/types/market";
import { getTrendingPairs as getDexscreenerTrendingPairs } from "./dexscreener";

const logger = createLogger("dextools");

const API_BASE = process.env.DEXTOOLS_API_BASE ?? "https://open-api.dextools.io/free/v2";
const API_KEY = process.env.DEXTOOLS_API_KEY;
const CACHE_NAMESPACE = "dextools";
const CACHE_VERSION = "v2";
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_NETWORK = "ether";
const NEW_PAIRS_TTL_SECONDS = 60;
const TOP_PAIRS_TTL_SECONDS = 90;
const STALE_CACHE_TTL_SECONDS = 60 * 60; // 1 hour fallback window
const FAIL_FAST_MS = Number(process.env.DEXTOOLS_FAIL_FAST_MS ?? 2_500);
const REVALIDATE_LOCK_SECONDS = Number(process.env.DEXTOOLS_REVALIDATE_LOCK_SECONDS ?? 30);
const HOT_CACHE_MAX_MS = Math.max(0, Number(process.env.DEXTOOLS_HOT_CACHE_MS ?? 8_000));
const CIRCUIT_NAME = "dextools_rest";
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: Number(process.env.DEXTOOLS_CIRCUIT_FAILURE_THRESHOLD ?? 3),
  recoveryTimeout: Number(process.env.DEXTOOLS_CIRCUIT_RECOVERY_TIMEOUT_MS ?? 2 * 60 * 1000),
  successThreshold: Number(process.env.DEXTOOLS_CIRCUIT_SUCCESS_THRESHOLD ?? 2),
};

class DexToolsRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DexToolsRetryableError";
  }
}

class DexToolsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DexToolsConfigError";
  }
}

type CacheEntry<T> = {
  value: T;
  fetchedAt: string;
};

type DextoolsTokenPayload = {
  address?: string;
  symbol?: string;
  name?: string;
  price?: number | string | null;
};

type DextoolsExchangePayload = {
  name?: string;
  id?: string;
  factory?: string;
};

type DextoolsPoolPayload = {
  pairAddress?: string;
  address?: string;
  name?: string;
  exchange?: DextoolsExchangePayload;
  baseToken?: DextoolsTokenPayload;
  quoteToken?: DextoolsTokenPayload;
  mainToken?: DextoolsTokenPayload;
  sideToken?: DextoolsTokenPayload;
  pairInfo?: {
    fdv?: number | string | null;
    liquidity?: number | string | null;
    liquidityUsd?: number | string | null;
  };
  price?: number | string | { usd?: number | string | null };
  priceUsd?: number | string | null;
  variation1h?: number | string | null;
  variation24h?: number | string | null;
  volume24h?: number | string | { usd?: number | string | null };
  liquidity?: number | string | null;
  liquidityUsd?: number | string | null;
  totalLiquidity?: number | string | null;
  dextScore?: number | string | null;
  score?: number | string | null;
  fdvUsd?: number | string | null;
  marketCap?: number | string | null;
  creationTime?: string;
  url?: string;
};

type DextoolsPagedResponse = {
  data?: {
    page?: number;
    pageSize?: number;
    total?: number;
    items?: DextoolsPoolPayload[];
  };
  items?: DextoolsPoolPayload[];
};

type DextoolsListResponse = {
  data?: DextoolsPoolPayload[];
  items?: DextoolsPoolPayload[];
};

type HotCacheEntry = { entry: CacheEntry<UntypedJson>; expiresAt: number };

type FailFastOutcome<T> =
  | { status: "ok"; value: T }
  | { status: "timeout" }
  | { status: "error"; error: UntypedJson };

// Cheap per-process cache to avoid extra Redis hops on hot paths.
const hotCache = new Map<string, HotCacheEntry>();
// Deduplicate concurrent upstream fetches keyed by cache key.
const inFlightFetches = new Map<string, Promise<CacheEntry<UntypedJson>>>();

function getHotCache<T>(key: string): CacheEntry<T> | null {
  if (!HOT_CACHE_MAX_MS) return null;
  const cached = hotCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    hotCache.delete(key);
    return null;
  }
  return cached.entry as CacheEntry<T>;
}

function setHotCache<T>(key: string, entry: CacheEntry<T>, ttlSeconds: number) {
  if (!HOT_CACHE_MAX_MS) return;
  const ttlMs = Math.min(ttlSeconds * 1000, HOT_CACHE_MAX_MS);
  hotCache.set(key, { entry, expiresAt: Date.now() + ttlMs });
}

function computeRevalidateLockTtl(ttlSeconds: number): number {
  const fallback = REVALIDATE_LOCK_SECONDS > 0 ? REVALIDATE_LOCK_SECONDS : 15;
  return Math.max(5, Math.min(fallback, ttlSeconds));
}

async function persistCacheEntry<T>(key: string, ttlSeconds: number, value: T): Promise<CacheEntry<T>> {
  const entry: CacheEntry<T> = { value, fetchedAt: new Date().toISOString() };
  try {
    await redis.set(key, entry, { ex: ttlSeconds });
    await redis.set(`${key}:stale`, entry, {
      ex: Math.max(ttlSeconds * 6, STALE_CACHE_TTL_SECONDS),
    });
    setHotCache(key, entry, ttlSeconds);
    metrics.cacheWrite(CACHE_NAMESPACE);
  } catch (error) {
    logger.warn(`[dextools] failed to write cache for key ${key}`, { error: error instanceof Error ? error.message : String(error) });
  }
  return entry;
}

function scheduleBackgroundRevalidation<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>) {
  const lockKey = `${key}:revalidate`; // lightweight SWR lock
  const ttl = computeRevalidateLockTtl(ttlSeconds);

  void (async () => {
    try {
      const lockOwner = `${process.pid ?? "unknown"}-${Date.now()}`;
      const acquired = await redis.trySetNx(lockKey, lockOwner, ttl);
      if (!acquired) {
        return;
      }

      try {
        const value = await fetcher();
        await persistCacheEntry(key, ttlSeconds, value);
      } catch (error) {
        logger.warn(`[dextools] background revalidation failed for key ${key}`, { error: error instanceof Error ? error.message : String(error) });
      } finally {
        try {
          await redis.tryReleaseLock(lockKey, lockOwner);
        } catch (error) {
          logger.warn(`[dextools] failed to release revalidation lock for key ${key}`, { error: error instanceof Error ? error.message : String(error) });
        }
      }
    } catch (error) {
      logger.warn(`[dextools] failed to acquire revalidation lock for key ${key}`, { error: error instanceof Error ? error.message : String(error) });
    }
  })();
}

function hydrateCacheWhenResolved<T>(promise: Promise<T>, key: string, ttlSeconds: number, predicate?: (value: T) => boolean) {
  void promise
    .then(async (value) => {
      if (predicate && !predicate(value)) {
        return;
      }
      await persistCacheEntry(key, ttlSeconds, value);
    })
    .catch((error) => {
      logger.warn(`[dextools] background hydration failed for key ${key}`, error);
    });
}

async function raceWithFailFast<T>(promise: Promise<T>, timeoutMs: number): Promise<FailFastOutcome<T>> {
  if (!timeoutMs || timeoutMs <= 0) {
    try {
      const value = await promise;
      return { status: "ok", value };
    } catch (error) {
      return { status: "error", error };
    }
  }

  let timeoutHandle: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<FailFastOutcome<T>>((resolve) => {
    timeoutHandle = setTimeout(() => resolve({ status: "timeout" }), timeoutMs);
  });

  try {
    const result = await Promise.race([
      promise.then((value) => ({ status: "ok" as const, value })).catch((error) => ({ status: "error" as const, error })),
      timeoutPromise,
    ]);
    return result;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
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
  return `${CACHE_NAMESPACE}:${CACHE_VERSION}:${digest}`;
}

async function withCache<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<CachedResponse<T>> {
  const hot = getHotCache<T>(key);
  if (hot) {
    metrics.cacheHit(CACHE_NAMESPACE);
    return {
      data: hot.value,
      fetchedAt: hot.fetchedAt,
      cache: "hit",
    };
  }

  let staleEntry: CacheEntry<T> | null = null;
  try {
    const cached = await redis.get<CacheEntry<T>>(key);
    if (cached) {
      metrics.cacheHit(CACHE_NAMESPACE);
      setHotCache(key, cached, ttlSeconds);
      return {
        data: cached.value,
        fetchedAt: cached.fetchedAt,
        cache: "hit",
      };
    }
    metrics.cacheMiss(CACHE_NAMESPACE);
  } catch (error) {
    logger.warn(`[dextools] failed to read cache for key ${key}`, { error: error instanceof Error ? error.message : String(error) });
  }

  try {
    staleEntry = await redis.get<CacheEntry<T>>(`${key}:stale`);
  } catch (error) {
    logger.warn(`[dextools] failed to read stale cache for key ${key}`, { error: error instanceof Error ? error.message : String(error) });
  }

  if (staleEntry) {
    try {
      scheduleBackgroundRevalidation(key, ttlSeconds, fetcher);
    } catch (error) {
      logger.warn(`[dextools] failed to schedule revalidation for key ${key}`, { error: error instanceof Error ? error.message : String(error) });
    }
    setHotCache(key, staleEntry, ttlSeconds);

    return {
      data: staleEntry.value,
      fetchedAt: staleEntry.fetchedAt,
      cache: "miss",
      stale: true,
      fallback: true,
    };
  }

  const fetchAndCache = async () => {
    const inFlight = inFlightFetches.get(key);
    if (inFlight) {
      return (await inFlight) as CacheEntry<T>;
    }

    const promise = (async () => {
      const value = await fetcher();
      return persistCacheEntry(key, ttlSeconds, value);
    })();

    inFlightFetches.set(key, promise);
    try {
      return (await promise) as CacheEntry<T>;
    } finally {
      inFlightFetches.delete(key);
    }
  };

  try {
    const entry = await fetchAndCache();
    setHotCache(key, entry, ttlSeconds);
    return {
      data: entry.value,
      fetchedAt: entry.fetchedAt,
      cache: "miss",
    };
  } catch (error) {
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
  if (typeof value === "object" && value && "usd" in (value as Record<string, UntypedJson>)) {
    return toNumber((value as { usd?: UntypedJson }).usd);
  }
  return null;
}

function clampLimit(value: UntypedJson, fallback = 20, max = 50): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(Math.max(1, Math.floor(value)), max);
  }
  return fallback;
}

function sanitizeNetwork(network?: string): string {
  if (typeof network === "string" && network.trim().length) {
    return network.trim().toLowerCase();
  }
  return DEFAULT_NETWORK;
}

function buildDexToolsUrl(network: string, pairAddress?: string | null): string | null {
  if (!pairAddress) {
    return null;
  }
  return `https://www.dextools.io/app/${network}/pair-explorer/${pairAddress}`;
}

function normalizeDexToolsPair(raw: DextoolsPoolPayload, network: string): DexPairSummary {
  const baseToken = raw.baseToken ?? raw.mainToken ?? {};
  const quoteToken = raw.quoteToken ?? raw.sideToken ?? {};
  const price = toNumber(typeof raw.price === "object" ? raw.price : raw.priceUsd);
  const volume24h = toNumber(raw.volume24h);
  const liquidityUsd = toNumber(
    raw.liquidityUsd ?? raw.totalLiquidity ?? raw.liquidity ?? raw.pairInfo?.liquidityUsd ?? raw.pairInfo?.liquidity,
  );
  const fallbackSeed = `${network}:${baseToken.symbol ?? baseToken.name ?? quoteToken.symbol ?? Date.now()}`;
  const fallbackId = crypto.createHash("sha1").update(fallbackSeed).digest("hex");
  const idSource = raw.pairAddress ?? raw.address ?? fallbackId;

  return {
    id: idSource,
    source: "dextools",
    chainId: network,
    network,
    dexId: raw.exchange?.id ?? null,
    dexName: raw.exchange?.name ?? null,
    pairAddress: raw.pairAddress ?? raw.address ?? null,
    url: raw.url ?? buildDexToolsUrl(network, raw.pairAddress ?? raw.address),
    baseToken: {
      address: baseToken.address ?? null,
      symbol: baseToken.symbol ?? null,
      name: baseToken.name ?? null,
      priceUsd: toNumber(baseToken.price ?? price),
    },
    quoteToken: {
      address: quoteToken.address ?? null,
      symbol: quoteToken.symbol ?? null,
      name: quoteToken.name ?? null,
      priceUsd: toNumber(quoteToken.price),
    },
    priceUsd: price,
    priceChangePercent1h: toNumber(raw.variation1h),
    priceChangePercent24h: toNumber(raw.variation24h),
    liquidityUsd,
    volumeUsd24h: volume24h,
    fdvUsd: toNumber(raw.pairInfo?.fdv ?? raw.fdvUsd),
    marketCapUsd: toNumber(raw.marketCap),
    pairCreatedAt: raw.creationTime ? new Date(raw.creationTime).toISOString() : null,
    score: toNumber(raw.dextScore ?? raw.score),
    tags: [],
  };
}

type FetchOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

async function fetchFromDexTools<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  options?: FetchOptions,
): Promise<T> {
  if (!API_KEY) {
    throw new DexToolsConfigError("DEXTOOLS_API_KEY is not configured");
  }

  const url = new URL(path, API_BASE);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return withCircuitBreaker(
    CIRCUIT_NAME,
    () =>
      pRetry(
        async () => {
          if (options?.signal?.aborted) {
            throw new AbortError("dextools fetch aborted");
          }
          const controller = new AbortController();
          const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
          const abortReason = new DOMException(`DexTools request timed out after ${timeoutMs}ms`, "AbortError");
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
            const response = await timeVendor("dextools_rest", () =>
              fetch(url.toString(), {
                method: "GET",
                headers: {
                  Accept: "application/json",
                  "X-BLOBR-KEY": API_KEY,
                },
                signal: controller.signal,
              }),
            );

            if (!response.ok) {
              const body = await response.text();
              const snippet = body.slice(0, 160);
              if (response.status >= 500) {
                throw new DexToolsRetryableError(`[dextools] ${response.status}: ${snippet}`);
              }
              throw new AbortError(`[dextools] ${response.status}: ${snippet}`);
            }

            const text = await response.text();
            return text ? (JSON.parse(text) as T) : ({} as T);
          } catch (error) {
            const isAbortError =
              error instanceof DOMException
                ? error.name === "AbortError"
                : error instanceof Error && error.name === "AbortError";
            if (isAbortError) {
              throw new AbortError("dextools fetch aborted");
            }
            const message = error instanceof Error ? error.message : String(error);
            if (error instanceof DexToolsRetryableError) {
              throw error;
            }
            if (/ENOTFOUND|ECONNRESET|ECONNREFUSED|fetch failed|network/i.test(message)) {
              throw new DexToolsRetryableError(message);
            }
            throw error;
          } finally {
            clearTimeout(timeout);
            if (options?.signal) {
              options.signal.removeEventListener("abort", abortExternal);
            }
          }
        },
        {
          retries: 2,
          minTimeout: 400,
          maxTimeout: 1_500,
        },
      ),
    CIRCUIT_BREAKER_CONFIG,
  );
}

function extractItems(response: DextoolsPagedResponse | DextoolsListResponse): DextoolsPoolPayload[] {
  if (Array.isArray(response.items)) {
    return response.items;
  }
  if (Array.isArray(response.data)) {
    return response.data;
  }
  if (Array.isArray(response.data?.items)) {
    return response.data?.items ?? [];
  }
  return [];
}

function mapNetworkToDexscreenerChain(network: string): string {
  const mapping: Record<string, string> = {
    ether: "ethereum",
    bsc: "bsc",
    polygon: "polygon",
    avalanche: "avalanche",
    arbitrum: "arbitrum",
    optimism: "optimism",
  };
  return mapping[network] ?? network;
}

async function fallbackToDexscreener(network: string, limit: number, maxPairAgeMinutes?: number): Promise<DexPairSummary[]> {
  try {
    const fallback = await getDexscreenerTrendingPairs({
      limit,
      chainId: mapNetworkToDexscreenerChain(network),
      maxPairAgeMinutes,
    });
    if (!Array.isArray(fallback.data) || fallback.data.length === 0) {
      throw new Error("DexScreener fallback returned no pairs");
    }
    return fallback.data;
  } catch (error) {
    const isExpectedDexscreenerError = error instanceof Error && /dexscreener/.test(error.message);
    if (isExpectedDexscreenerError) {
      logger.warn(`[dextools] fallback to dexscreener unavailable (${error.message})`);
    } else {
      logger.warn(`[dextools] fallback to dexscreener failed`, { error: error instanceof Error ? error.message : String(error) });
    }
    throw error;
  }
}

export type DexToolsPairsOptions = {
  network?: string;
  limit?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export async function getNewPairs(options: DexToolsPairsOptions = {}): Promise<CachedResponse<DexPairSummary[]>> {
  const network = sanitizeNetwork(options.network);
  const limit = clampLimit(options.limit, 20, 50);
  const cacheKey = buildCacheKey(["new-pairs", network, limit]);

  return withCache(cacheKey, NEW_PAIRS_TTL_SECONDS, async () => {
    const dexToolsPromise = (async () => {
      const response = await fetchFromDexTools<DextoolsPagedResponse>(
        `/pool/${network}`,
        {
          sort: "creationTime",
          order: "desc",
          page: 0,
          pageSize: Math.min(limit, 50),
        },
        {
          signal: options.signal,
          timeoutMs: options.timeoutMs,
        },
      );
      return extractItems(response).slice(0, limit).map((pool) => normalizeDexToolsPair(pool, network));
    })();

    const outcome = await raceWithFailFast(dexToolsPromise, FAIL_FAST_MS);

    if (outcome.status === "ok" && outcome.value.length) {
      return outcome.value;
    }

    if (outcome.status === "ok" && !outcome.value.length) {
      logger.warn(`[dextools] new pairs returned empty payload; falling back to dexscreener`);
    }

    if (outcome.status === "error") {
      logger.debugExpectedError("failed to fetch new pairs (using fallback)", outcome.error);
    }

    if (outcome.status === "timeout") {
      logger.warn(`[dextools] new pairs fail-fast timeout after ${FAIL_FAST_MS}ms; serving fallback`);
      hydrateCacheWhenResolved(dexToolsPromise, cacheKey, NEW_PAIRS_TTL_SECONDS, (value) => Array.isArray(value) && value.length > 0);
    }

    return fallbackToDexscreener(network, limit, 24 * 60);
  });
}

export async function getTopPairs(options: DexToolsPairsOptions = {}): Promise<CachedResponse<DexPairSummary[]>> {
  const network = sanitizeNetwork(options.network);
  const limit = clampLimit(options.limit, 20, 50);
  const cacheKey = buildCacheKey(["top-pairs", network, limit]);

  return withCache(cacheKey, TOP_PAIRS_TTL_SECONDS, async () => {
    const dexToolsPromise = (async () => {
      const response = await fetchFromDexTools<DextoolsListResponse>(
        `/ranking/${network}/hotpools`,
        undefined,
        {
          signal: options.signal,
          timeoutMs: options.timeoutMs,
        },
      );
      return extractItems(response).slice(0, limit).map((pool) => normalizeDexToolsPair(pool, network));
    })();

    const outcome = await raceWithFailFast(dexToolsPromise, FAIL_FAST_MS);

    if (outcome.status === "ok" && outcome.value.length) {
      return outcome.value;
    }

    if (outcome.status === "ok" && !outcome.value.length) {
      logger.warn(`[dextools] hot pools returned empty payload; falling back to dexscreener`);
    }

    if (outcome.status === "error") {
      logger.debugExpectedError("failed to fetch hot pools (using fallback)", outcome.error);
    }

    if (outcome.status === "timeout") {
      logger.warn(`[dextools] hot pools fail-fast timeout after ${FAIL_FAST_MS}ms; serving fallback`);
      hydrateCacheWhenResolved(dexToolsPromise, cacheKey, TOP_PAIRS_TTL_SECONDS, (value) => Array.isArray(value) && value.length > 0);
    }

    return fallbackToDexscreener(network, limit);
  });
}
