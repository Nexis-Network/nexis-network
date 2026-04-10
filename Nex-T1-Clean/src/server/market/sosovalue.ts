import crypto from "crypto";

import { redis } from "@/server/services/redis";
import { createLogger } from "@/server/logging/logging";
import type { CachedResponse } from "@/types/market";

const logger = createLogger("sosovalue");

const SOSOVALUE_API_BASE = "https://openapi.sosovalue.com";
const SOSOVALUE_API_KEY = process.env.SOSOVALUE_API_KEY?.trim() ?? "";

const CACHE_NAMESPACE = "sosovalue";
const DEFAULT_TIMEOUT_MS = 12_000;
const STALE_CACHE_TTL_MULTIPLIER = 6;
const MIN_STALE_CACHE_SECONDS = 10 * 60;

const TTL_FEATURED_NEWS_SECONDS = 120;
const TTL_CURRENCY_DIRECTORY_SECONDS = 12 * 60 * 60;
const TTL_ETF_METRICS_SECONDS = 5 * 60;

type CacheEntry<T> = {
  value: T;
  fetchedAt: string;
};

export type SosovalueApiEnvelope<T> = {
  code: number;
  msg: string | null;
  traceId?: string | null;
  data: T;
};

export type SosovalueCurrencyListItem = {
  id?: string;
  currencyId?: string;
  fullName?: string;
  name?: string;
  currencyName?: string;
};

export type SosovalueNewsMatchedCurrency = {
  id?: string;
  currencyId?: string;
  fullName?: string;
  name?: string;
  currencyName?: string;
};

export type SosovalueNewsMultilanguageContent = {
  language: string;
  title?: string;
  content: string;
};

export type SosovalueNewsMediaInfo = {
  sosoUrl?: string;
  originalUrl?: string;
  shortUrl?: string;
  type?: string;
};

export type SosovalueFeaturedNewsItem = {
  id: string;
  sourceLink?: string;
  releaseTime?: number;
  author?: string;
  authorDescription?: string;
  authorAvatarUrl?: string;
  category?: number;
  featureImage?: string;
  matchedCurrencies?: SosovalueNewsMatchedCurrency[];
  tags?: string[];
  multilanguageContent?: SosovalueNewsMultilanguageContent[];
  mediaInfo?: SosovalueNewsMediaInfo[];
  nickName?: string;
  quoteInfo?: UntypedJson;
  isBlueVerified?: number;
  verifiedType?: string;
};

export type SosovalueFeaturedNewsPage = {
  pageNum?: string;
  pageSize?: string;
  totalPages?: string;
  total?: string;
  list?: SosovalueFeaturedNewsItem[];
};

export type SosovalueEtfMetricValue = {
  value: number | null;
  lastUpdateDate?: string;
  status?: string | number;
};

export type SosovalueEtfEntry = {
  id: string;
  ticker?: string;
  institute?: string;
  netAssets?: SosovalueEtfMetricValue;
  netAssetsPercentage?: SosovalueEtfMetricValue;
  totalTokenHoldings?: SosovalueEtfMetricValue;
  dailyNetInflow?: SosovalueEtfMetricValue;
  cumNetInflow?: SosovalueEtfMetricValue;
  dailyValueTraded?: SosovalueEtfMetricValue;
  fee?: SosovalueEtfMetricValue;
  discountPremiumRate?: SosovalueEtfMetricValue;
};

export type SosovalueEtfDataMetrics = {
  totalNetAssets?: SosovalueEtfMetricValue;
  totalNetAssetsPercentage?: SosovalueEtfMetricValue;
  totalTokenHoldings?: SosovalueEtfMetricValue;
  dailyNetInflow?: SosovalueEtfMetricValue;
  cumNetInflow?: SosovalueEtfMetricValue;
  dailyTotalValueTraded?: SosovalueEtfMetricValue;
  list?: SosovalueEtfEntry[];
};

export class SosovalueHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: UntypedJson,
    message?: string,
  ) {
    super(message ?? `SoSoValue request failed with status ${status}`);
    this.name = "SosovalueHttpError";
  }
}

export class SosovalueApiError extends Error {
  constructor(
    message: string,
    public readonly vendorCode: number,
    public readonly traceId?: string | null,
  ) {
    super(message);
    this.name = "SosovalueApiError";
  }
}

function requireApiKey(): string {
  if (!SOSOVALUE_API_KEY) {
    throw new Error("SOSOVALUE_API_KEY is not configured");
  }
  return SOSOVALUE_API_KEY;
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
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

function buildCacheKey(parts: UntypedJson[]): string {
  const signature = stableStringify(parts);
  const digest = crypto.createHash("sha1").update(signature).digest("hex");
  return `${CACHE_NAMESPACE}:${digest}`;
}

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
  } catch (error) {
    logger.debugExpectedError(`cache write failed for key ${key}`, error);
  }
}

async function withCache<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<CachedResponse<T>> {
  const cached = await readCacheEntry<T>(key);
  if (cached) {
    return { data: cached.value, fetchedAt: cached.fetchedAt, cache: "hit" };
  }

  try {
    const value = await fetcher();
    const fetchedAt = new Date().toISOString();
    await writeCacheEntry(key, ttlSeconds, { value, fetchedAt });
    return { data: value, fetchedAt, cache: "miss" };
  } catch (error) {
    const stale = await readStaleCacheEntry<T>(key);
    if (stale) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`serving stale cache for key ${key}`, { error: message });
      return { data: stale.value, fetchedAt: stale.fetchedAt, cache: "hit", stale: true, error: message };
    }
    throw error;
  }
}

type SosovalueRequestOptions = {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: UntypedJson;
  timeoutMs?: number;
  signal?: AbortSignal;
};

async function requestSosovalue<T>(options: SosovalueRequestOptions): Promise<SosovalueApiEnvelope<T>> {
  const apiKey = requireApiKey();
  const url = new URL(options.path, SOSOVALUE_API_BASE);

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const abortReason = new DOMException(`SoSoValue request timed out after ${timeoutMs}ms`, "AbortError");
  const timeout = setTimeout(() => controller.abort(abortReason), timeoutMs);
  const abortExternal = () => {
    controller.abort(options.signal?.reason ?? abortReason);
  };

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort(options.signal.reason ?? abortReason);
    } else {
      options.signal.addEventListener("abort", abortExternal);
    }
  }

  try {
    const response = await fetch(url.toString(), {
      method: options.method,
      headers: {
        Accept: "application/json",
        "Content-Type": options.body ? "application/json" : "text/plain",
        "x-soso-api-key": apiKey,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await response.text();
    let payload: UntypedJson;
    try {
      payload = text ? (JSON.parse(text) as UntypedJson) : {};
    } catch {
      payload = { raw: text };
    }

    if (!response.ok) {
      throw new SosovalueHttpError(response.status, payload);
    }

    return payload as SosovalueApiEnvelope<T>;
  } finally {
    clearTimeout(timeout);
    if (options.signal) {
      options.signal.removeEventListener("abort", abortExternal);
    }
  }
}

function unwrapOrThrow<T>(envelope: SosovalueApiEnvelope<T>): T {
  if (typeof envelope?.code === "number" && envelope.code !== 0) {
    throw new SosovalueApiError(envelope.msg ?? "SoSoValue API error", envelope.code, envelope.traceId ?? null);
  }
  return envelope.data;
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

function slugify(value: string): string {
  return normalizeLookupKey(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function pickCurrencyId(entry: SosovalueCurrencyListItem): string | null {
  const id = entry.currencyId ?? entry.id ?? null;
  if (!id) return null;
  const trimmed = String(id).trim();
  if (!/^[0-9]+$/.test(trimmed)) return null;
  return trimmed;
}

function pickCurrencySymbol(entry: SosovalueCurrencyListItem): string | null {
  const symbol = entry.currencyName ?? entry.name ?? null;
  if (!symbol) return null;
  const trimmed = String(symbol).trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

export async function getSosovalueCurrencyDirectory(): Promise<CachedResponse<SosovalueCurrencyListItem[]>> {
  const key = buildCacheKey(["currencies", "v1"]);
  return withCache(key, TTL_CURRENCY_DIRECTORY_SECONDS, async () => {
    const envelope = await requestSosovalue<SosovalueCurrencyListItem[]>({
      method: "POST",
      path: "/openapi/v1/data/default/coin/list",
      body: {},
    });
    const data = unwrapOrThrow(envelope);
    return Array.isArray(data) ? data : [];
  });
}

export async function resolveSosovalueCurrencyId(input: {
  currencyId?: string | null;
  currency?: string | null;
}): Promise<string | null> {
  const candidateId = input.currencyId?.trim() ?? "";
  if (candidateId) {
    return /^[0-9]+$/.test(candidateId) ? candidateId : null;
  }

  const currency = input.currency?.trim() ?? "";
  if (!currency) {
    return null;
  }

  const directory = await getSosovalueCurrencyDirectory();
  const needle = normalizeLookupKey(currency);
  const needleSlug = slugify(currency);

  for (const entry of directory.data) {
    const id = pickCurrencyId(entry);
    if (!id) continue;

    const symbol = pickCurrencySymbol(entry);
    const fullName = typeof entry.fullName === "string" ? entry.fullName.trim() : "";

    if (symbol && normalizeLookupKey(symbol) === needle) return id;
    if (fullName && normalizeLookupKey(fullName) === needle) return id;
    if (fullName && slugify(fullName) === needleSlug) return id;
  }

  return null;
}

export async function getSosovalueFeaturedNews(params: {
  pageNum: number;
  pageSize: number;
  categoryList?: string | null;
}): Promise<CachedResponse<SosovalueFeaturedNewsPage>> {
  const key = buildCacheKey(["news", "featured", params]);
  return withCache(key, TTL_FEATURED_NEWS_SECONDS, async () => {
    const envelope = await requestSosovalue<SosovalueFeaturedNewsPage>({
      method: "GET",
      path: "/api/v1/news/featured",
      query: {
        pageNum: params.pageNum,
        pageSize: params.pageSize,
        categoryList: params.categoryList ?? undefined,
      },
    });
    return unwrapOrThrow(envelope);
  });
}

export async function getSosovalueFeaturedNewsByCurrency(params: {
  pageNum: number;
  pageSize: number;
  currencyId?: string | null;
  categoryList?: string | null;
}): Promise<CachedResponse<SosovalueFeaturedNewsPage>> {
  const key = buildCacheKey(["news", "featured", "currency", params]);
  return withCache(key, TTL_FEATURED_NEWS_SECONDS, async () => {
    const envelope = await requestSosovalue<SosovalueFeaturedNewsPage>({
      method: "GET",
      path: "/api/v1/news/featured/currency",
      query: {
        pageNum: params.pageNum,
        pageSize: params.pageSize,
        currencyId: params.currencyId ?? undefined,
        categoryList: params.categoryList ?? undefined,
      },
    });
    return unwrapOrThrow(envelope);
  });
}

export type SosovalueEtfType = "us-btc-spot" | "us-eth-spot";

export async function getSosovalueCurrentEtfDataMetrics(
  type: SosovalueEtfType,
): Promise<CachedResponse<SosovalueEtfDataMetrics>> {
  const key = buildCacheKey(["etf", "currentEtfDataMetrics", type]);
  return withCache(key, TTL_ETF_METRICS_SECONDS, async () => {
    const envelope = await requestSosovalue<SosovalueEtfDataMetrics>({
      method: "POST",
      path: "/openapi/v2/etf/currentEtfDataMetrics",
      body: { type },
    });
    return unwrapOrThrow(envelope);
  });
}
