import crypto from "crypto";

import pRetry, { AbortError } from "p-retry";

import { redis } from "@/server/services/redis";
import { metrics, timeVendor } from "@/server/instrumentation/metrics";
import { createLogger } from "@/server/logging/logging";
import fallbackEtfSnapshot from "@/server/market/data/etf-snapshot-fallback.json";
import type {

  CachedResponse,
  DefiLlamaChainSummary,
  DefiLlamaEtfSnapshot,
  DefiLlamaPerpProtocol,
  DefiLlamaProtocol,
  DefiLlamaYieldPool,
  DefiTvlMovers,
  DefiTvlMover,
} from "@/types/market";

const logger = createLogger("defillama");

const API_BASE = "https://api.llama.fi";
const YIELDS_BASE = "https://yields.llama.fi";
const PRO_API_BASE = process.env.DEFILLAMA_PRO_API_BASE ?? "https://pro-api.llama.fi";
const DEFILLAMA_PRO_API_KEY = process.env.DEFILLAMA_PRO_API_KEY ?? process.env.DEFILLAMA_API_KEY ?? null;
const CACHE_NAMESPACE = "defillama";
const DEFAULT_TIMEOUT_MS = 12_000;
const STALE_CACHE_TTL_MULTIPLIER = 6;
const MIN_STALE_CACHE_SECONDS = 15 * 60;
const TTL_PROTOCOLS_SECONDS = 300;
const TTL_CHAINS_SECONDS = 300;
const TTL_MOVERS_SECONDS = 300;
const TTL_YIELDS_SECONDS = 300;
const TTL_ETF_SECONDS = 900;
const TTL_PERPS_SECONDS = 300;
const MIN_TVL_USD = Number(process.env.DEFI_LLAMA_MIN_TVL ?? 5_000_000);

/**
 * Loosely-typed representation of a raw JSON API response.
 * Normalizer functions receive this and defensively narrow every value.
 */
 
type RawJson = Record<string, UntypedJson>;

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
    logger.warn(`[defillama] failed to read cache for key ${key}`, { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function readStaleCacheEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  const staleKey = `${key}:stale`;
  try {
    const cached = await redis.get<CacheEntry<T>>(staleKey);
    return cached ?? null;
  } catch (error) {
    logger.warn(`[defillama] failed to read stale cache for key ${staleKey}`, { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function writeCacheEntry<T>(key: string, ttlSeconds: number, entry: CacheEntry<T>) {
  try {
    await redis.set(key, entry, { ex: ttlSeconds });
    const staleKey = `${key}:stale`;
    await redis.set(staleKey, entry, { ex: computeStaleTtl(ttlSeconds) });
    metrics.cacheWrite(CACHE_NAMESPACE);
  } catch (error) {
    logger.warn(`[defillama] failed to write cache for key ${key}`, { error: error instanceof Error ? error.message : String(error) });
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
      logger.warn(`[defillama] serving stale cache for key ${key}: ${message}`);
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

type FetchOptions = {
  base?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
};

async function fetchDefillama<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: FetchOptions,
): Promise<T> {
  const url = new URL(path, options?.base ?? API_BASE);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return pRetry(
    async () => {
      const controller = new AbortController();
      const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const abortReason = new DOMException(`DefiLlama request timed out after ${timeoutMs}ms`, "AbortError");
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
        const response = await timeVendor("defillama_rest", () =>
          fetch(url.toString(), {
            method: "GET",
            headers: {
              Accept: "application/json",
              ...(options?.headers ?? {}),
            },
            signal: controller.signal,
          }),
        );

        if (!response.ok) {
          const body = await response.text();
          const message = `[defillama] ${response.status}: ${body.slice(0, 160)}`;

          // Retry on 500+ errors, but not on 4xx (client errors)
          if (response.status >= 500) {
            throw new Error(message);
          }

          // For 4xx errors, throw AbortError to prevent retries
          throw new AbortError(message);
        }

        const text = await response.text();
        return text ? (JSON.parse(text) as T) : ({} as T);
      } finally {
        clearTimeout(timeout);
        if (options?.signal) {
          options.signal.removeEventListener("abort", abortExternal);
        }
      }
    },
    {
      retries: 2,
      minTimeout: 500,
      maxTimeout: 2_000,
      factor: 2,
    },
  );
}

function normalizeProtocol(raw: RawJson): DefiLlamaProtocol {
  const slugValue = typeof raw?.slug === "string" && raw.slug.length
    ? raw.slug
    : typeof raw?.name === "string"
      ? raw.name.toLowerCase().replace(/\s+/g, "-")
      : String(raw?.id ?? crypto.randomUUID());

  return {
    id: String(raw?.id ?? slugValue),
    name: typeof raw?.name === "string" ? raw.name : slugValue,
    symbol: typeof raw?.symbol === "string" ? raw.symbol : null,
    slug: slugValue,
    url: typeof raw?.url === "string" ? raw.url : null,
    description: typeof raw?.description === "string" ? raw.description : null,
    logo: typeof raw?.logo === "string" ? raw.logo : null,
    category: typeof raw?.category === "string" ? raw.category : null,
    chain: typeof raw?.chain === "string" ? raw.chain : null,
    chains: Array.isArray(raw?.chains) ? raw.chains.filter((chain: UntypedJson) => typeof chain === "string") : [],
    tvlUsd: toNumber(raw?.tvl),
    change1h: toNumber(raw?.change_1h),
    change1d: toNumber(raw?.change_1d),
    change7d: toNumber(raw?.change_7d),
    change1m: toNumber(raw?.change_1m),
    chainTvls: typeof raw?.chainTvls === "object" && raw?.chainTvls ? raw.chainTvls as Record<string, number> : undefined,
    marketCapUsd: toNumber(raw?.mcap),
  };
}

function normalizeChain(raw: RawJson): DefiLlamaChainSummary {
  return {
    name: typeof raw?.name === "string" ? raw.name : String(raw?.chain ?? raw?.gecko_id ?? "Unknown"),
    chainId: (typeof raw?.chainId === "string" || typeof raw?.chainId === "number") ? raw.chainId : null,
    tokenSymbol: typeof raw?.tokenSymbol === "string" ? raw.tokenSymbol : null,
    tvlUsd: toNumber(raw?.tvl),
    change1h: toNumber(raw?.change_1h),
    change1d: toNumber(raw?.change_1d),
    change7d: toNumber(raw?.change_7d),
    change1m: toNumber(raw?.change_1m),
  };
}

function clampLimit(value: UntypedJson, fallback = 10, max = 50): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(Math.max(1, Math.floor(value)), max);
  }
  return fallback;
}

function buildMover(protocol: DefiLlamaProtocol): DefiTvlMover | null {
  if (protocol.tvlUsd == null || protocol.change1d == null) {
    return null;
  }
  const absolute = protocol.tvlUsd * (protocol.change1d / 100);
  if (!Number.isFinite(absolute)) {
    return null;
  }

  return {
    id: protocol.id,
    name: protocol.name,
    slug: protocol.slug,
    logo: protocol.logo ?? null,
    category: protocol.category ?? null,
    chains: protocol.chains,
    tvlUsd: protocol.tvlUsd,
    absoluteChangeUsd24h: Number(absolute.toFixed(2)),
    percentChange24h: protocol.change1d,
    percentChange7d: protocol.change7d ?? null,
    percentChange1m: protocol.change1m ?? null,
    url: protocol.url ?? null,
  };
}

function buildMoversCollection(protocols: DefiLlamaProtocol[], limit: number, minTvlUsd: number): DefiTvlMovers {
  const normalized = protocols
    .filter((protocol) => (protocol.tvlUsd ?? 0) >= minTvlUsd)
    .map((protocol) => ({
      ...protocol,
      move: buildMover(protocol),
    }))
    .map((entry) => entry.move)
    .filter((move): move is DefiTvlMover => Boolean(move));

  const gainers = normalized
    .filter((move) => (move.absoluteChangeUsd24h ?? 0) > 0)
    .sort((a, b) => (b.absoluteChangeUsd24h ?? 0) - (a.absoluteChangeUsd24h ?? 0))
    .slice(0, limit);

  const losers = normalized
    .filter((move) => (move.absoluteChangeUsd24h ?? 0) < 0)
    .sort((a, b) => (a.absoluteChangeUsd24h ?? 0) - (b.absoluteChangeUsd24h ?? 0))
    .slice(0, limit);

  return { gainers, losers };
}

function buildProtocolLookupMap(protocols: DefiLlamaProtocol[]): Map<string, DefiLlamaProtocol> {
  const map = new Map<string, DefiLlamaProtocol>();
  for (const protocol of protocols) {
    const identifiers = [protocol.id, protocol.name, protocol.slug]
      .map((value) => (typeof value === "string" ? value.toLowerCase() : null))
      .filter((value): value is string => Boolean(value));
    for (const id of identifiers) {
      if (!map.has(id)) {
        map.set(id, protocol);
      }
    }
  }
  return map;
}

function sanitizeTokenArray(value: UntypedJson): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((token) => (typeof token === "string" ? token.trim() : ""))
    .filter((token): token is string => Boolean(token));
}

function normalizeYieldPool(raw: RawJson, protocolMap: Map<string, DefiLlamaProtocol>): DefiLlamaYieldPool | null {
  const poolId = typeof raw?.pool === "string" && raw.pool.length ? raw.pool : crypto.randomUUID();
  const project = typeof raw?.project === "string" ? raw.project : null;
  const chain = typeof raw?.chain === "string" ? raw.chain : null;
  if (!project || !chain) {
    return null;
  }

  const protocolMatch = protocolMap.get(project.toLowerCase()) ?? protocolMap.get(String(raw?.defillamaId ?? "").toLowerCase());
  const predictionsRaw = raw?.predictions;
  const predObj = predictionsRaw && typeof predictionsRaw === "object" ? predictionsRaw as Record<string, UntypedJson> : null;
  const predictions = predObj
    ? {
        predictedClass: typeof predObj.predictedClass === "string" ? predObj.predictedClass : null,
        predictedProbability: toNumber(predObj.predictedProbability),
        binnedConfidence: toNumber(predObj.binnedConfidence),
      }
    : null;

  return {
    id: poolId,
    pool: poolId,
    project,
    chain,
    symbol: typeof raw?.symbol === "string" ? raw.symbol : sanitizeTokenArray(raw?.underlyingTokens).join("/") || null,
    tvlUsd: toNumber(raw?.tvlUsd),
    apy: toNumber(raw?.apy),
    apyBase: toNumber(raw?.apyBase),
    apyReward: toNumber(raw?.apyReward),
    rewardTokens: sanitizeTokenArray(raw?.rewardTokens),
    underlyingTokens: sanitizeTokenArray(raw?.underlyingTokens),
    poolMeta: typeof raw?.poolMeta === "string" ? raw.poolMeta : null,
    url: typeof raw?.url === "string" ? raw.url : protocolMatch?.url ?? null,
    predictions,
    logo: protocolMatch?.logo ?? null,
  };
}

function normalizeEtfSnapshot(raw: RawJson): DefiLlamaEtfSnapshot | null {
  const ticker = typeof raw?.ticker === "string" && raw.ticker.trim().length ? raw.ticker.trim() : null;
  if (!ticker) {
    return null;
  }
  return {
    ticker,
    timestamp: toNumber(raw?.timestamp),
    asset: typeof raw?.asset === "string" ? raw.asset : null,
    issuer: typeof raw?.issuer === "string" ? raw.issuer : null,
    name: typeof raw?.etf_name === "string" ? raw.etf_name : typeof raw?.name === "string" ? raw.name : null,
    custodian: typeof raw?.custodian === "string" ? raw.custodian : null,
    pctFee: toNumber(raw?.pct_fee),
    url: typeof raw?.url === "string" ? raw.url : null,
    flows: toNumber(raw?.flows),
    aum: toNumber(raw?.aum),
    volume: toNumber(raw?.volume),
  };
}

const FALLBACK_ETF_ROWS = buildFallbackEtfSnapshot();

function buildFallbackEtfSnapshot(): DefiLlamaEtfSnapshot[] {
  if (!Array.isArray(fallbackEtfSnapshot)) {
    return [];
  }
  return fallbackEtfSnapshot
    .map((row) => normalizeEtfSnapshot(row as RawJson))
    .filter((row): row is DefiLlamaEtfSnapshot => Boolean(row));
}

function getFallbackEtfSnapshotRows(): DefiLlamaEtfSnapshot[] {
  return FALLBACK_ETF_ROWS.map((row) => ({ ...row }));
}

function normalizePerpProtocol(raw: RawJson): DefiLlamaPerpProtocol | null {
  // Handle both direct protocol objects and nested structures
  const rawProtocol = raw?.protocol ?? raw;
  if (!rawProtocol || typeof rawProtocol !== "object" || Array.isArray(rawProtocol)) {
    return null;
  }
  const protocol = rawProtocol as RawJson;

  const idValue = protocol?.defillamaId ?? protocol?.id ?? protocol?.name ?? crypto.randomUUID();
  const name = typeof protocol?.name === "string" && protocol.name.trim().length > 0
    ? protocol.name.trim()
    : null;

  if (!name) {
    return null;
  }

  const slug = typeof protocol?.slug === "string" && protocol.slug.trim().length > 0
    ? protocol.slug.trim()
    : typeof protocol?.gecko_id === "string" && protocol.gecko_id.trim().length > 0
      ? protocol.gecko_id.trim()
      : null;

  const displayName = typeof protocol?.displayName === "string" && protocol.displayName.trim().length > 0
    ? protocol.displayName.trim()
    : name;

  const logo = typeof protocol?.logo === "string" && protocol.logo.trim().length > 0
    ? protocol.logo.trim()
    : null;

  const chains = Array.isArray(protocol?.chains)
    ? protocol.chains.filter((chain: UntypedJson): chain is string =>
      typeof chain === "string" && chain.trim().length > 0
    ).map((chain: string) => chain.trim())
    : [];

  return {
    id: String(idValue),
    name,
    displayName: displayName !== name ? displayName : null,
    logo,
    chains,
    total24h: toNumber(protocol?.total24h),
    total7d: toNumber(protocol?.total7d),
    change1d: toNumber(protocol?.change_1d),
    change7d: toNumber(protocol?.change_7d),
    change30d: toNumber(protocol?.change_1m ?? protocol?.change_30d ?? protocol?.change_30dover30d),
    slug,
    url: slug ? `https://defillama.com/protocol/${slug}` : null,
  };
}

type DefiLlamaRequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export async function getDefiLlamaProtocols(options: DefiLlamaRequestOptions = {}): Promise<CachedResponse<DefiLlamaProtocol[]>> {
  const cacheKey = buildCacheKey(["protocols"]);
  return withCache(cacheKey, TTL_PROTOCOLS_SECONDS, async () => {
    const response = await fetchDefillama<RawJson[]>("/protocols", undefined, {
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    });
    if (!Array.isArray(response)) {
      return [];
    }
    return response.map(normalizeProtocol);
  });
}

export async function getDefiLlamaChains(): Promise<CachedResponse<DefiLlamaChainSummary[]>> {
  const cacheKey = buildCacheKey(["chains"]);
  return withCache(cacheKey, TTL_CHAINS_SECONDS, async () => {
    const response = await fetchDefillama<RawJson[]>("/chains");
    if (!Array.isArray(response)) {
      return [];
    }
    return response.map(normalizeChain);
  });
}

export type DefiLlamaTvlMoversOptions = {
  limit?: number;
  minTvlUsd?: number;
};

export async function getDefiLlamaTvlMovers(options: DefiLlamaTvlMoversOptions = {}): Promise<CachedResponse<DefiTvlMovers>> {
  const limit = clampLimit(options.limit, 10, 50);
  const minTvlUsd = typeof options.minTvlUsd === "number" && options.minTvlUsd > 0 ? options.minTvlUsd : MIN_TVL_USD;
  const cacheKey = buildCacheKey(["tvl-movers", limit, minTvlUsd]);

  return withCache(cacheKey, TTL_MOVERS_SECONDS, async () => {
    try {
      const protocols = await getDefiLlamaProtocols();
      return buildMoversCollection(protocols.data, limit, minTvlUsd);
    } catch (error) {
      // If it's a 500 error that failed after retries, return empty movers instead of throwing
      if (error instanceof Error && /500|server error|timeout/i.test(error.message)) {
        logger.warn(`[defillama] tvl movers failed after retries, returning empty movers: ${error.message}`);
        return {
          gainers: [],
          losers: [],
          updatedAt: new Date().toISOString(),
        };
      }
      throw error;
    }
  });
}

type YieldPoolOptions = {
  limit?: number;
  minTvlUsd?: number;
  chain?: string;
  project?: string;
};

export async function getDefiLlamaYieldPools(options: YieldPoolOptions = {}): Promise<CachedResponse<DefiLlamaYieldPool[]>> {
  const limit = clampLimit(options.limit ?? undefined, 100, 200);
  const minTvlUsd = typeof options.minTvlUsd === "number" && options.minTvlUsd > 0 ? options.minTvlUsd : 1_000_000;
  const chainFilter = options.chain?.toLowerCase().trim() || null;
  const projectFilter = options.project?.toLowerCase().trim() || null;
  const cacheKey = buildCacheKey(["yield-pools", limit, minTvlUsd, chainFilter, projectFilter]);

  return withCache(cacheKey, TTL_YIELDS_SECONDS, async () => {
    const poolsResponse = await fetchDefillama<{ status?: string; data?: RawJson[] }>(
      "/pools",
      undefined,
      { base: YIELDS_BASE },
    );

    let protocolsData: DefiLlamaProtocol[] = [];
    try {
      const protocolsResponse = await getDefiLlamaProtocols();
      protocolsData = protocolsResponse.data;
    } catch (error) {
      logger.warn("[defillama] failed to fetch protocols for yield pools metadata, proceeding without logos", { error: error instanceof Error ? error.message : String(error) });
    }

    const lookup = buildProtocolLookupMap(protocolsData);
    const data = Array.isArray(poolsResponse?.data) ? poolsResponse.data : [];
    const normalized = data
      .map((pool) => normalizeYieldPool(pool, lookup))
      .filter((pool): pool is DefiLlamaYieldPool => Boolean(pool))
      .filter((pool) => (chainFilter ? pool.chain.toLowerCase() === chainFilter : true))
      .filter((pool) => (projectFilter ? pool.project.toLowerCase() === projectFilter : true))
      .filter((pool) => (pool.tvlUsd ?? 0) >= minTvlUsd)
      .sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0));

    return normalized.slice(0, limit);
  });
}

export async function getDefiLlamaEtfSnapshot(): Promise<CachedResponse<DefiLlamaEtfSnapshot[]>> {
  const cacheKey = buildCacheKey(["etfs", "snapshot"]);
  return withCache(cacheKey, TTL_ETF_SECONDS, async () => {
    const fallbackRows = getFallbackEtfSnapshotRows();
    if (!DEFILLAMA_PRO_API_KEY) {
      logger.warnOnce("etf_pro_key_missing", "DEFILLAMA_PRO_API_KEY missing, using fallback ETF snapshot (set key for live data)");
      return fallbackRows.length ? fallbackRows : [];
    }

    const headers = { Authorization: `Bearer ${DEFILLAMA_PRO_API_KEY}` };

    try {
      const response = await fetchDefillama<RawJson[]>("/etfs/snapshot", undefined, { base: PRO_API_BASE, headers });
      const rows = Array.isArray(response) ? response : [];
      const normalized = rows
        .map((row) => normalizeEtfSnapshot(row))
        .filter((row): row is DefiLlamaEtfSnapshot => Boolean(row));
      if (!normalized.length && fallbackRows.length) {
        logger.warn("[defillama] ETF snapshot API returned no records; using fallback dataset.");
        return fallbackRows;
      }
      return normalized;
    } catch (error) {
      if (error instanceof Error && /401|403/.test(error.message)) {
        logger.warn("[defillama] ETF snapshot unavailable for current plan; using fallback dataset.");
        return fallbackRows.length ? fallbackRows : [];
      }
      logger.warn("[defillama] ETF snapshot request failed; attempting fallback dataset.", { error: error instanceof Error ? error.message : String(error) });
      if (fallbackRows.length) {
        return fallbackRows;
      }
      throw error;
    }
  });
}

export async function getDefiLlamaPerpsOverview(): Promise<CachedResponse<DefiLlamaPerpProtocol[]>> {
  const cacheKey = buildCacheKey(["perps", "overview"]);
  return withCache(cacheKey, TTL_PERPS_SECONDS, async () => {
    try {
      const response = await fetchDefillama<{ protocols?: RawJson[] }>(
        "/overview/open-interest",
        { excludeTotalDataChart: true, excludeTotalDataChartBreakdown: true },
      );

      // Handle both direct protocols array and nested structure
      const protocols: RawJson[] = Array.isArray(response?.protocols)
        ? response.protocols
        : Array.isArray(response)
          ? (response as RawJson[])
          : [];

      if (protocols.length === 0) {
        logger.warn("[defillama] perps overview returned empty protocols array");
        return [];
      }

      const normalized = protocols
        .map((row) => normalizePerpProtocol(row))
        .filter((row): row is DefiLlamaPerpProtocol => Boolean(row));

      if (normalized.length === 0) {
        logger.warn("[defillama] perps overview: all protocols filtered out during normalization");
      }

      return normalized.sort((a, b) => (b.total24h ?? 0) - (a.total24h ?? 0));
    } catch (error) {
      // If it's a 500 error that failed after retries, return empty array instead of throwing
      // This allows the API route to return 200 with empty data instead of 500
      if (error instanceof Error && /500|server error|timeout/i.test(error.message)) {
        logger.warn(`[defillama] perps overview failed after retries, returning empty array: ${error.message}`);
        return [];
      }
      logger.error("[defillama] failed to fetch perps overview", { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  });
}
