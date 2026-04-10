import crypto from "crypto";

import Coingecko from "@coingecko/coingecko-typescript";
import type { MarketChartGetParams } from "@coingecko/coingecko-typescript/resources/coins/market-chart";
import pRetry, { AbortError } from "p-retry";

import { redis } from "@/server/services/redis";
import { metrics, timeVendor } from "@/server/instrumentation/metrics";
import { createLogger } from "@/server/logging/logging";
import {
  isCoingeckoProApiBase,
  isCoingeckoDemoKeyMismatchError,
  isCoingeckoProKeyMismatchError,
  resolveCoingeckoApiBase,
  resolveCoingeckoCredentials,
} from "@/server/market/coingecko-base";

const logger = createLogger("coingecko");
import type {
  AssetSearchCollection,
  CachedResponse,
  CoinChartQueryParams,
  CoinDetails,
  CoinDirectoryEntry,
  CoinMarketChart,
  CoinMarketRow,
  CoinSearchResult,
  NftCollectionDetails,
  NftMarketChart,
  NftSearchResult,
  TrendingCollection,
  TrendingEntity,
  CoinCategorySummary,
  GlobalMarketData,
} from "@/types/market";
import type {
  CoinMentionContextRecord,
  CoinMentionContractAddress,
  CoinMentionTicker,
  TokenMentionRecentCollection,
  TokenMentionSearchResult,
} from "@/components/chat-composer/token-mentions";

/**
 * Loosely-typed bag for raw JSON API responses.
 * Normalizer helpers defensively narrow each value before use.
 */
type RawJson = Record<string, UntypedJson>;

/** Narrow an unknown value to a RawJson object (non-objects become `undefined`). */
function sub(value: UntypedJson): RawJson | undefined {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as RawJson)
    : undefined;
}

/** Cast an SDK or REST response to RawJson for normaliser consumption. */
function toRaw(value: UntypedJson): RawJson {
  return (value ?? {}) as RawJson;
}

const { proApiKey: API_KEY, demoApiKey: DEMO_API_KEY } = resolveCoingeckoCredentials({
  apiKey: process.env.COINGECKO_API_KEY,
  proApiKey: process.env.COINGECKO_PRO_API_KEY,
  demoApiKey: process.env.COINGECKO_DEMO_API_KEY,
});
const PRO_API_BASE_URL = resolveCoingeckoApiBase({
  apiKey: "enabled",
  envBase: isCoingeckoProApiBase(process.env.COINGECKO_API_BASE)
    ? process.env.COINGECKO_API_BASE
    : "https://pro-api.coingecko.com/api/v3",
});
const PUBLIC_API_BASE_URL = resolveCoingeckoApiBase({
  apiKey: undefined,
  envBase: isCoingeckoProApiBase(process.env.COINGECKO_API_BASE)
    ? "https://api.coingecko.com/api/v3"
    : process.env.COINGECKO_API_BASE,
});
const DEMO_FALLBACK_KEY = DEMO_API_KEY || API_KEY;

const CACHE_NAMESPACE = "coingecko";
// Local networks can be slow; give REST a bit more headroom while keeping SDK tighter.
const DEFAULT_TIMEOUT_MS = 20_000;
const SDK_TIMEOUT_MS = Number(process.env.COINGECKO_SDK_TIMEOUT_MS ?? 8_000);
const SDK_CIRCUIT_BREAK_MS = Number(process.env.COINGECKO_SDK_CIRCUIT_BREAK_MS ?? 5 * 60 * 1000);
const RAW_SDK_TIMEOUT_DISABLE_THRESHOLD = Number(
  process.env.COINGECKO_SDK_TIMEOUT_DISABLE_THRESHOLD ?? 1,
);
const SDK_TIMEOUT_DISABLE_THRESHOLD = Number.isFinite(RAW_SDK_TIMEOUT_DISABLE_THRESHOLD)
  ? Math.max(1, Math.floor(RAW_SDK_TIMEOUT_DISABLE_THRESHOLD))
  : 1;
const SDK_FORCE_DISABLED = process.env.COINGECKO_DISABLE_SDK === "true";
const RETRY_ATTEMPTS = 2;
const DAY_IN_MS = 86_400_000;
const COIN_DIRECTORY_CACHE_SECONDS = Number(process.env.COINGECKO_DIRECTORY_CACHE_SECONDS ?? 4 * 60 * 60);
const COIN_SEARCH_CACHE_SECONDS = Number(process.env.COINGECKO_SEARCH_CACHE_SECONDS ?? 30 * 60);
const COIN_RECENT_CACHE_SECONDS = Number(process.env.COINGECKO_RECENT_CACHE_SECONDS ?? 30);
const COIN_MENTION_CACHE_SECONDS = Number(process.env.COINGECKO_MENTION_CACHE_SECONDS ?? 60);
const STALE_CACHE_TTL_MULTIPLIER = 6;
const MIN_STALE_CACHE_SECONDS = 10 * 60;

const FALLBACK_IMAGE_URL = "/placeholder-logo.svg";

function normalizeIpfsUrl(raw: string) {
  const trimmed = raw.replace(/^ipfs:\/\//i, "").replace(/^ipfs\//i, "");
  return `https://ipfs.io/ipfs/${trimmed}`;
}

function sanitizeImageUrl(value: UntypedJson): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  if (trimmed.toLowerCase().startsWith("ipfs://")) {
    return normalizeIpfsUrl(trimmed);
  }

  if (trimmed.toLowerCase().startsWith("data:image/")) {
    const commaIndex = trimmed.indexOf(",");
    if (commaIndex === -1) {
      return null;
    }
    const meta = trimmed.slice(0, commaIndex);
    const payload = trimmed.slice(commaIndex + 1);
    if (!payload) {
      return null;
    }

    if (/;base64/i.test(meta)) {
      if (payload.length < 16) {
        return null;
      }
      if (!/^[0-9a-zA-Z+/=]+$/.test(payload)) {
        return null;
      }
      return trimmed;
    }

    if (/;(charset=utf-8|utf8)/i.test(meta)) {
      return trimmed;
    }

    return null;
  }

  return null;
}

type CoinGeckoClientInstance = InstanceType<typeof Coingecko>;
type CoingeckoRuntimeMode = "pro" | "demo";

let coinGeckoClient: CoinGeckoClientInstance | null = null;
let runtimeMode: CoingeckoRuntimeMode = API_KEY ? "pro" : "demo";
let sdkDisabledUntil = 0; // epoch ms after which we can retry the SDK
let sdkConsecutiveTimeouts = 0; // track back-to-back SDK timeouts before tripping the circuit breaker

function getRestApiBaseUrl(): string {
  return runtimeMode === "pro" ? PRO_API_BASE_URL : PUBLIC_API_BASE_URL;
}

function getRestAuthHeaders(): Record<string, string> {
  if (runtimeMode === "pro" && API_KEY) {
    return { "x-cg-pro-api-key": API_KEY };
  }
  if (DEMO_FALLBACK_KEY) {
    return { "x-cg-demo-api-key": DEMO_FALLBACK_KEY };
  }
  return {};
}

function switchToDemoRuntimeMode(reason: string) {
  if (runtimeMode === "demo") {
    return;
  }
  runtimeMode = "demo";
  coinGeckoClient = null;
  logger.warn(`[coingecko] Demo API key mismatch detected; switching to public API host (${reason})`);
}

function switchToProRuntimeMode(reason: string) {
  if (runtimeMode === "pro" || !API_KEY) {
    return;
  }
  runtimeMode = "pro";
  coinGeckoClient = null;
  logger.warn(`[coingecko] Pro API key mismatch detected; switching to pro API host (${reason})`);
}

function getClient(): CoinGeckoClientInstance {
  if (!coinGeckoClient) {
    const useProEnvironment = runtimeMode === "pro" && Boolean(API_KEY);
    coinGeckoClient = new Coingecko({
      proAPIKey: useProEnvironment ? API_KEY : undefined,
      demoAPIKey: useProEnvironment ? undefined : DEMO_FALLBACK_KEY,
      environment: useProEnvironment ? "pro" : "demo",
      maxRetries: 3,
      logLevel: "error",
    });
  }

  return coinGeckoClient;
}

function shouldUseSdk(): boolean {
  if (SDK_FORCE_DISABLED) {
    return false;
  }
  if (!SDK_CIRCUIT_BREAK_MS) {
    return true;
  }
  if (sdkDisabledUntil && sdkDisabledUntil > Date.now()) {
    return false;
  }
  if (sdkDisabledUntil && sdkDisabledUntil <= Date.now()) {
    sdkDisabledUntil = 0;
  }
  return true;
}

function disableSdkTemporarily(reason: string) {
  if (SDK_CIRCUIT_BREAK_MS <= 0) {
    return;
  }
  sdkDisabledUntil = Date.now() + SDK_CIRCUIT_BREAK_MS;
  const seconds = Math.round(SDK_CIRCUIT_BREAK_MS / 1000);
  logger.warn(`[coingecko] SDK disabled for ${seconds}s (${reason})`);
}

class CoinGeckoRetryableError extends Error {
  status?: number;
  retryAfterMs?: number;
  constructor(message: string, status?: number, retryAfterMs?: number) {
    super(message);
    this.name = "CoinGeckoRetryableError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function isHourlyIntervalRestrictionError(error: UntypedJson): boolean {
  if (!error) {
    return false;
  }

  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? `${error.name}: ${error.message}`
        : "";

  if (!message) {
    return false;
  }

  return /interval=hourly\s+is\s+exclusive/i.test(message);
}

function isProOnlyEndpointError(error: unknown): boolean {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? `${error.name}: ${error.message}`
        : "";

  if (!message) {
    return false;
  }

  return /10005|pro api|paid plan|exclusive endpoint/i.test(message);
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
    logger.warn(`[coingecko] Failed to read cache key ${key}`, { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function readStaleCacheEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  const staleKey = `${key}:stale`;
  try {
    const cached = await redis.get<CacheEntry<T>>(staleKey);
    return cached ?? null;
  } catch (error) {
    logger.warn(`[coingecko] Failed to read stale cache key ${staleKey}`, { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function writeCacheEntry<T>(key: string, ttlSeconds: number, entry: CacheEntry<T>) {
  try {
    await redis.set(key, entry, { ex: ttlSeconds });
    await redis.set(`${key}:stale`, entry, { ex: computeStaleTtl(ttlSeconds) });
    metrics.cacheWrite("coingecko");
  } catch (error) {
    logger.warn(`[coingecko] Failed to write cache key ${key}`, { error: error instanceof Error ? error.message : String(error) });
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
    metrics.cacheHit("coingecko");
    return {
      data: cached.value,
      fetchedAt: cached.fetchedAt,
      cache: "hit",
    };
  }

  metrics.cacheMiss("coingecko");

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
      logger.warn(`[coingecko] Serving stale cache for key ${key}: ${message}`);
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

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) {
    return undefined;
  }

  const seconds = Number(header);
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    const diff = date - Date.now();
    return diff > 0 ? diff : undefined;
  }

  return undefined;
}

function exponentialDelay(attempt: number, base = 400, max = 5_000): number {
  const delay = Math.min(max, base * 2 ** (attempt - 1));
  const jitter = Math.random() * 200;
  return delay + jitter;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRestUrl(path: string): string {
  const activeBaseUrl = getRestApiBaseUrl();
  const trimmedBase = activeBaseUrl.endsWith("/") ? activeBaseUrl : `${activeBaseUrl}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return new URL(normalizedPath, trimmedBase).toString();
}

type RestFetchOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  allowDemoFallbackRetry?: boolean;
  allowProFallbackRetry?: boolean;
};

async function fetchFromRest<T>(
  path: string,
  params?: Record<string, string | number | boolean | string[] | number[] | undefined>,
  options: RestFetchOptions = {},
): Promise<T> {
  const url = new URL(buildRestUrl(path));

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, String(item));
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...getRestAuthHeaders(),
  };

  const maxRetries = options.signal ? 0 : RETRY_ATTEMPTS;

  return pRetry(
    async () => {
      if (options.signal?.aborted) {
        throw new AbortError("coingecko REST fetch aborted");
      }
      const controller = new AbortController();
      const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const abortReason = new DOMException(`CoinGecko REST request timed out after ${timeoutMs}ms`, "AbortError");
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort(abortReason);
      }, timeoutMs);

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
        const response = await timeVendor("coingecko_rest", () => fetch(url.toString(), {
          headers,
          signal: controller.signal,
        } as RequestInit));

        if (!response.ok) {
          const body = await response.text();
          if (
            response.status === 400 &&
            runtimeMode === "pro" &&
            options.allowDemoFallbackRetry !== false &&
            isCoingeckoDemoKeyMismatchError(body)
          ) {
            switchToDemoRuntimeMode("REST 400 / error_code=10011");
            return fetchFromRest<T>(path, params, {
              ...options,
              allowDemoFallbackRetry: false,
            });
          }

          if (
            response.status === 400 &&
            runtimeMode === "demo" &&
            options.allowProFallbackRetry !== false &&
            isCoingeckoProKeyMismatchError(body)
          ) {
            switchToProRuntimeMode("REST 400 / error_code=10010");
            return fetchFromRest<T>(path, params, {
              ...options,
              allowProFallbackRetry: false,
            });
          }

          const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
          const message = `CoinGecko REST ${response.status}: ${body}`;

          if (response.status === 429 || response.status >= 500) {
            throw new CoinGeckoRetryableError(message, response.status, retryAfterMs);
          }

          throw new AbortError(message);
        }

        const text = await response.text();
        return text ? (JSON.parse(text) as T) : ({} as T);
      } catch (error) {
        const isAbortError =
          error instanceof DOMException
            ? error.name === "AbortError"
            : error instanceof Error && error.name === "AbortError";
        if (isAbortError) {
          if (timedOut) {
            throw new CoinGeckoRetryableError(`CoinGecko REST timed out after ${timeoutMs}ms`);
          }
          if (options.signal?.aborted) {
            throw new AbortError("coingecko REST fetch aborted");
          }
          if (error instanceof AbortError) {
            throw error;
          }
          throw new AbortError("coingecko REST fetch aborted");
        }

        if (error instanceof AbortError) {
          throw error;
        }

        if (error instanceof CoinGeckoRetryableError) {
          throw error;
        }

        const retryable = new CoinGeckoRetryableError(
          error instanceof Error ? error.message : "Unknown CoinGecko fetch error",
        );
        throw retryable;
      } finally {
        clearTimeout(timeout);
        if (options.signal) {
          options.signal.removeEventListener("abort", abortExternal);
        }
      }
    },
    {
      retries: maxRetries,
      onFailedAttempt: async ({ attemptNumber, retriesLeft, error }) => {
        const retryable = error as CoinGeckoRetryableError;
        const delay = retryable.retryAfterMs ?? exponentialDelay(attemptNumber);
        if (retriesLeft > 0 && delay > 0) {
          await wait(delay);
        }
      },
    },
  );
}

async function runWithSdkFallback<T>(
  sdkCall: () => Promise<T>,
  fallback: () => Promise<T>,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  if (!shouldUseSdk()) {
    return fallback();
  }

  if (options.signal?.aborted) {
    throw new AbortError("coingecko sdk fetch aborted");
  }

  const sdkPromise = sdkCall();
  let timeout: NodeJS.Timeout | undefined;
  const timeoutError = new Error(`CoinGecko SDK timeout after ${SDK_TIMEOUT_MS}ms`);
  const abortError = new AbortError("coingecko sdk fetch aborted");

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(timeoutError), SDK_TIMEOUT_MS);
  });

  let abortHandler: (() => void) | undefined;
  const abortPromise = options.signal
    ? new Promise<never>((_resolve, reject) => {
      abortHandler = () => reject(abortError);
      options.signal!.addEventListener("abort", abortHandler, { once: true });
    })
    : null;

  try {
    const contenders: Array<Promise<UntypedJson>> = [sdkPromise, timeoutPromise];
    if (abortPromise) {
      contenders.push(abortPromise);
    }
    const result = await Promise.race(contenders);
    if (sdkDisabledUntil) {
      sdkDisabledUntil = 0;
    }
    if (sdkConsecutiveTimeouts > 0) {
      sdkConsecutiveTimeouts = 0;
    }
    return result as T;
  } catch (error) {
    if (error === timeoutError) {
      sdkPromise.catch((lateError) => {
        logger.warn("[coingecko] SDK call resolved after timeout", lateError);
      });
      sdkConsecutiveTimeouts += 1;
      const shouldDisable = sdkConsecutiveTimeouts >= SDK_TIMEOUT_DISABLE_THRESHOLD;
      if (shouldDisable) {
        logger.warn(`[coingecko] SDK call timed out after ${SDK_TIMEOUT_MS}ms (${sdkConsecutiveTimeouts}/${SDK_TIMEOUT_DISABLE_THRESHOLD}); disabling SDK and falling back to REST`);
        disableSdkTemporarily(`timeout after ${SDK_TIMEOUT_MS}ms (x${sdkConsecutiveTimeouts})`);
        sdkConsecutiveTimeouts = 0;
      } else {
        logger.warn(`[coingecko] SDK call timed out after ${SDK_TIMEOUT_MS}ms (${sdkConsecutiveTimeouts}/${SDK_TIMEOUT_DISABLE_THRESHOLD}); falling back to REST but will retry before disabling`);
      }
    } else if (error === abortError) {
      sdkPromise.catch(() => { });
      throw abortError;
    } else {
      sdkConsecutiveTimeouts = 0;
      if (error instanceof Coingecko.RateLimitError) {
        logger.warn("[coingecko] SDK rate limit hit (429), falling back to REST", { status: error.status });
        disableSdkTemporarily(`rate limit (429)`);
      } else if (error instanceof Coingecko.AuthenticationError) {
        logger.warn("[coingecko] SDK authentication error (401), switching runtime mode", { status: error.status });
        if (isCoingeckoDemoKeyMismatchError(error)) {
          switchToDemoRuntimeMode("SDK AuthenticationError / error_code=10011");
        } else if (isCoingeckoProKeyMismatchError(error)) {
          switchToProRuntimeMode("SDK AuthenticationError / error_code=10010");
        }
        disableSdkTemporarily(`authentication error (${error.status})`);
      } else if (error instanceof Coingecko.BadRequestError) {
        if (isCoingeckoDemoKeyMismatchError(error)) {
          switchToDemoRuntimeMode("SDK BadRequestError / error_code=10011");
        } else if (isCoingeckoProKeyMismatchError(error)) {
          switchToProRuntimeMode("SDK BadRequestError / error_code=10010");
        }
        logger.warn("[coingecko] SDK bad request (400), falling back to REST", { status: error.status, message: error.message });
        disableSdkTemporarily(`bad request (400)`);
      } else if (error instanceof Coingecko.InternalServerError) {
        logger.warn("[coingecko] SDK upstream error (5xx), falling back to REST", { status: error.status });
        disableSdkTemporarily(`upstream error (${error.status})`);
      } else if (error instanceof Coingecko.APIError) {
        logger.warn("[coingecko] SDK API error, falling back to REST", { name: error.name, status: error.status, message: error.message });
        disableSdkTemporarily(`API error (${error.name}: ${error.status})`);
      } else {
        logger.warn("[coingecko] SDK call failed with unknown error, falling back to REST", { error: error instanceof Error ? error.message : String(error) });
        const reason = error instanceof Error ? error.message : "unknown SDK error";
        disableSdkTemporarily(reason);
      }
    }
    return fallback();
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
    if (options.signal && abortHandler) {
      options.signal.removeEventListener("abort", abortHandler);
    }
  }
}

function normalizeTrendingItem(item: RawJson, type: TrendingEntity["type"]): TrendingEntity {
  const thumbnailUrl = sanitizeImageUrl(item.thumb ?? item.thumbnail ?? item.image);
  const smallImageUrl =
    sanitizeImageUrl(item.small ?? item.image_small ?? item.image) ?? thumbnailUrl ?? null;
  const largeImageUrl =
    sanitizeImageUrl(item.large ?? item.image_large ?? item.image) ??
    smallImageUrl ??
    thumbnailUrl ??
    null;

  const itemData = sub(item.data);

  return {
    id: String(item.id ?? item.coin_id ?? item.slug ?? ""),
    name: String(item.name ?? item.title ?? ""),
    symbol: typeof item.symbol === "string" ? item.symbol : String(sub(item.symbol)?.value ?? ""),
    type,
    score: typeof item.score === "number" ? item.score : undefined,
    marketCapRank:
      typeof item.market_cap_rank === "number"
        ? item.market_cap_rank
        : typeof item.market_cap_rank === "string"
          ? Number(item.market_cap_rank)
          : undefined,
    priceBtc:
      typeof item.price_btc === "number"
        ? item.price_btc
        : typeof itemData?.price_btc === "number"
          ? itemData.price_btc
          : undefined,
    thumbnailUrl: thumbnailUrl ?? undefined,
    smallImageUrl: smallImageUrl ?? undefined,
    largeImageUrl: largeImageUrl ?? undefined,
    quickStats: {
      priceUsd:
        typeof itemData?.price === "number"
          ? itemData.price
          : typeof itemData?.price_usd === "number"
            ? itemData.price_usd
            : undefined,
      priceChangePercentage24h:
        typeof itemData?.price_change_percentage_24h === "number"
          ? itemData.price_change_percentage_24h
          : typeof sub(itemData?.price_change_percentage_24h)?.usd === "number"
            ? (sub(itemData?.price_change_percentage_24h)?.usd as number)
            : typeof itemData?.floor_price_24h_percentage_change === "number"
              ? itemData.floor_price_24h_percentage_change
              : undefined,
      marketCapUsd:
        typeof itemData?.market_cap === "number"
          ? itemData.market_cap
          : typeof item.market_cap === "number"
            ? item.market_cap
            : undefined,
      floorPriceNative:
        typeof itemData?.floor_price === "number"
          ? itemData.floor_price
          : typeof item.floor_price_in_native_currency === "number"
            ? item.floor_price_in_native_currency
            : undefined,
      floorPriceUsd:
        typeof itemData?.floor_price_in_usd === "number"
          ? itemData.floor_price_in_usd
          : typeof item.floor_price_in_usd === "number"
            ? item.floor_price_in_usd
            : undefined,
      volume24hUsd:
        typeof itemData?.h24_volume === "number"
          ? itemData.h24_volume
          : typeof itemData?.volume === "number"
            ? itemData.volume
            : typeof item.volume_24h === "number"
              ? item.volume_24h
              : undefined,
    },
  };
}

function normalizeMarketRow(row: RawJson): CoinMarketRow {
  const imageUrl =
    sanitizeImageUrl(row.image ?? row.thumb ?? row.small ?? row.large) ?? FALLBACK_IMAGE_URL;

  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    symbol: String(row.symbol ?? ""),
    image: imageUrl,
    marketCapRank:
      typeof row.market_cap_rank === "number"
        ? row.market_cap_rank
        : typeof row.market_cap_rank === "string"
          ? Number(row.market_cap_rank)
          : null,
    currentPrice: typeof row.current_price === "number" ? row.current_price : null,
    priceChangePercentage1h:
      typeof row.price_change_percentage_1h_in_currency === "number"
        ? row.price_change_percentage_1h_in_currency
        : null,
    priceChangePercentage24h:
      typeof row.price_change_percentage_24h_in_currency === "number"
        ? row.price_change_percentage_24h_in_currency
        : typeof row.price_change_percentage_24h === "number"
          ? row.price_change_percentage_24h
          : null,
    priceChangePercentage7d:
      typeof row.price_change_percentage_7d_in_currency === "number"
        ? row.price_change_percentage_7d_in_currency
        : typeof row.price_change_percentage_7d === "number"
          ? row.price_change_percentage_7d
          : null,
    priceChangePercentage30d:
      typeof row.price_change_percentage_30d_in_currency === "number"
        ? row.price_change_percentage_30d_in_currency
        : typeof row.price_change_percentage_30d === "number"
          ? row.price_change_percentage_30d
          : null,
    marketCap: typeof row.market_cap === "number" ? row.market_cap : null,
    totalVolume: typeof row.total_volume === "number" ? row.total_volume : null,
    circulatingSupply: typeof row.circulating_supply === "number" ? row.circulating_supply : null,
    totalSupply: typeof row.total_supply === "number" ? row.total_supply : null,
    maxSupply: typeof row.max_supply === "number" ? row.max_supply : null,
    fullyDilutedValuation:
      typeof row.fully_diluted_valuation === "number" ? row.fully_diluted_valuation : null,
    sparkline7d: Array.isArray(sub(row.sparkline_in_7d)?.price)
      ? (sub(row.sparkline_in_7d)?.price as UntypedJson[]).map((value: UntypedJson) => Number(value))
      : [],
    lastUpdated: typeof row.last_updated === "string" ? new Date(row.last_updated).toISOString() : null,
    // Aliases to satisfy CoinMarketRow interface
    priceUsd: typeof row.current_price === "number" ? row.current_price : null,
    marketCapUsd: typeof row.market_cap === "number" ? row.market_cap : null,
    volume24hUsd: typeof row.total_volume === "number" ? row.total_volume : null,
  };
}

function normalizeCoinDetails(data: RawJson): CoinDetails {
  const marketData = (sub(data.market_data) ?? {}) as RawJson;
  const rawImage = (sub(data.image) ?? {}) as RawJson;
  const normalizedImage = {
    thumb: sanitizeImageUrl(rawImage.thumb) ?? null,
    small: sanitizeImageUrl(rawImage.small) ?? null,
    large: sanitizeImageUrl(rawImage.large) ?? null,
  };
  const hasImage = Boolean(normalizedImage.thumb || normalizedImage.small || normalizedImage.large);

  const rawPlatforms = typeof data.platforms === "object" && data.platforms ? (data.platforms as Record<string, UntypedJson>) : {};
  const networksMap = new Map<string, string | null>();

  for (const [chain, contractAddress] of Object.entries(rawPlatforms)) {
    if (!chain) continue;
    const normalizedChain = String(chain).trim();
    if (!normalizedChain) continue;
    const value = typeof contractAddress === "string" && contractAddress.trim().length ? contractAddress.trim() : null;
    if (!networksMap.has(normalizedChain) || value) {
      networksMap.set(normalizedChain, value);
    }
  }

  if (!networksMap.size && typeof data.asset_platform_id === "string" && data.asset_platform_id.trim().length) {
    networksMap.set(data.asset_platform_id.trim(), null);
  }

  const links = sub(data.links);
  const description = sub(data.description);

  return {
    id: String(data.id ?? ""),
    name: String(data.name ?? ""),
    symbol: String(data.symbol ?? ""),
    description: (description?.en ?? data.description ?? null) as string | null,
    categories: Array.isArray(data.categories) ? (data.categories as UntypedJson[]).filter(Boolean) as string[] : [],
    marketCapRank: typeof data.market_cap_rank === "number" ? data.market_cap_rank : typeof data.coingecko_rank === "number" ? data.coingecko_rank : null,
    hashingAlgorithm: typeof data.hashing_algorithm === "string" ? data.hashing_algorithm : null,
    genesisDate: typeof data.genesis_date === "string" && data.genesis_date.length ? data.genesis_date : null,
    networks: Array.from(networksMap.entries()).map(([chain, contractAddress]) => ({
      chain,
      contractAddress,
    })),
    image: hasImage ? normalizedImage : undefined,
    homepageUrls: Array.isArray(links?.homepage)
      ? (links.homepage as UntypedJson[]).filter((url): url is string => typeof url === "string" && Boolean(url))
      : [],
    blockchainSiteUrls: Array.isArray(links?.blockchain_site)
      ? (links.blockchain_site as UntypedJson[]).filter((url): url is string => typeof url === "string" && Boolean(url))
      : [],
    sentimentVotesUpPercentage:
      typeof data.sentiment_votes_up_percentage === "number" ? data.sentiment_votes_up_percentage : null,
    sentimentVotesDownPercentage:
      typeof data.sentiment_votes_down_percentage === "number"
        ? data.sentiment_votes_down_percentage
        : null,
    marketData: {
      currentPriceUsd: (sub(marketData.current_price)?.usd ?? null) as number | null,
      priceChangePercentage24h: (sub(marketData.price_change_percentage_24h_in_currency)?.usd ?? marketData.price_change_percentage_24h ?? null) as number | null,
      priceChangePercentage7d: (sub(marketData.price_change_percentage_7d_in_currency)?.usd ?? marketData.price_change_percentage_7d_in_currency ?? marketData.price_change_percentage_7d ?? null) as number | null,
      priceChangePercentage30d: (sub(marketData.price_change_percentage_30d_in_currency)?.usd ?? marketData.price_change_percentage_30d ?? null) as number | null,
      priceChangePercentage1y: (sub(marketData.price_change_percentage_1y_in_currency)?.usd ?? marketData.price_change_percentage_1y ?? null) as number | null,
      marketCapUsd: (sub(marketData.market_cap)?.usd ?? null) as number | null,
      fullyDilutedValuationUsd: (sub(marketData.fully_diluted_valuation)?.usd ?? null) as number | null,
      totalVolumeUsd: (sub(marketData.total_volume)?.usd ?? null) as number | null,
      circulatingSupply: typeof marketData.circulating_supply === "number" ? marketData.circulating_supply : null,
      totalSupply: typeof marketData.total_supply === "number" ? marketData.total_supply : null,
      maxSupply: typeof marketData.max_supply === "number" ? marketData.max_supply : null,
      high24hUsd: (sub(marketData.high_24h)?.usd ?? null) as number | null,
      low24hUsd: (sub(marketData.low_24h)?.usd ?? null) as number | null,
      athUsd: (sub(marketData.ath)?.usd ?? null) as number | null,
      athDate: (sub(marketData.ath_date)?.usd ?? null) as string | null,
      atlUsd: (sub(marketData.atl)?.usd ?? null) as number | null,
      atlDate: (sub(marketData.atl_date)?.usd ?? null) as string | null,
      lastUpdated: typeof data.last_updated === "string" ? new Date(data.last_updated).toISOString() : null,
    },
  };
}

function normalizeCoinDirectoryEntry(entry: RawJson): CoinDirectoryEntry {
  const id = typeof entry?.id === "string" ? entry.id.trim().toLowerCase() : "";
  const symbol = typeof entry?.symbol === "string" ? entry.symbol.trim().toLowerCase() : "";
  const name = typeof entry?.name === "string" ? entry.name.trim() : "";
  const rawPlatforms = sub(entry?.platforms);
  const platforms =
    rawPlatforms
      ? Object.fromEntries(
        Object.entries(rawPlatforms).map(([chain, address]) => [
          String(chain),
          typeof address === "string" && address.trim().length ? address.trim() : null,
        ]),
      )
      : undefined;

  return {
    id,
    symbol,
    name,
    platforms,
  };
}

function normalizeCoinSearchResult(entry: RawJson): CoinSearchResult {
  return {
    id: typeof entry?.id === "string" ? entry.id.trim().toLowerCase() : "",
    name: typeof entry?.name === "string" ? entry.name.trim() : "",
    symbol: typeof entry?.symbol === "string" ? entry.symbol.trim().toLowerCase() : "",
    marketCapRank: typeof entry?.market_cap_rank === "number" ? entry.market_cap_rank : null,
    thumb: typeof entry?.large === "string" ? entry.large : typeof entry?.thumb === "string" ? entry.thumb : typeof entry?.image === "string" ? entry.image : null,
  };
}

function normalizeRecentlyListedToken(entry: RawJson): TokenMentionSearchResult {
  const data = sub(entry.data);

  return {
    id: typeof entry?.id === "string" ? entry.id.trim().toLowerCase() : "",
    name: typeof entry?.name === "string" ? entry.name.trim() : "",
    symbol: typeof entry?.symbol === "string" ? entry.symbol.trim() : "",
    imageUrl:
      sanitizeImageUrl(entry.large) ??
      sanitizeImageUrl(entry.thumb) ??
      sanitizeImageUrl(entry.image) ??
      sanitizeImageUrl(data?.large) ??
      sanitizeImageUrl(data?.thumb) ??
      sanitizeImageUrl(data?.image) ??
      null,
    marketCapRank:
      typeof entry?.market_cap_rank === "number"
        ? entry.market_cap_rank
        : typeof data?.market_cap_rank === "number"
          ? data.market_cap_rank
          : null,
    launchedAt:
      typeof entry?.activated_at === "string"
        ? new Date(entry.activated_at).toISOString()
        : typeof entry?.launch_date === "string"
          ? new Date(entry.launch_date).toISOString()
          : typeof entry?.created_at === "string"
            ? new Date(entry.created_at).toISOString()
            : null,
  } satisfies TokenMentionSearchResult;
}

function normalizeTrendingMentionResult(entry: TrendingEntity): TokenMentionSearchResult {
  return {
    id: entry.id.trim().toLowerCase(),
    name: entry.name.trim(),
    symbol: typeof entry.symbol === "string" ? entry.symbol.trim() : "",
    imageUrl: entry.smallImageUrl ?? entry.thumbnailUrl ?? entry.largeImageUrl ?? null,
    marketCapRank: entry.marketCapRank ?? null,
    launchedAt: null,
  } satisfies TokenMentionSearchResult;
}

function normalizeCoinMentionTickers(entry: RawJson[]): CoinMentionTicker[] {
  return entry
    .map((rawTicker) => {
      const market = sub(rawTicker.market);

      return {
        marketName:
          typeof market?.name === "string" && market.name.trim().length > 0
            ? market.name.trim()
            : "Unknown",
        base: typeof rawTicker.base === "string" ? rawTicker.base.trim().toUpperCase() : "",
        target:
          typeof rawTicker.target === "string"
            ? rawTicker.target.trim().toUpperCase()
            : "",
        last: typeof rawTicker.last === "number" ? rawTicker.last : null,
        volume:
          typeof rawTicker.converted_volume === "object" && rawTicker.converted_volume
            ? ((rawTicker.converted_volume as Record<string, UntypedJson>).usd as
                | number
                | null
                | undefined) ?? null
            : null,
        tradeUrl:
          typeof rawTicker.trade_url === "string" && rawTicker.trade_url.trim().length > 0
            ? rawTicker.trade_url.trim()
            : null,
      } satisfies CoinMentionTicker;
    })
    .filter((ticker) => ticker.base.length > 0 && ticker.target.length > 0)
    .slice(0, 5);
}

function normalizeCoinMentionContextRecord(data: RawJson): CoinMentionContextRecord {
  const details = normalizeCoinDetails(data);
  const links = sub(data.links);
  const rawRepos = sub(links?.repos_url);
  const githubUrls = Array.isArray(rawRepos?.github)
    ? (rawRepos.github as UntypedJson[]).filter(
        (url): url is string => typeof url === "string" && url.trim().length > 0,
      )
    : [];
  const contractAddresses: CoinMentionContractAddress[] = details.networks.flatMap(
    (network) => {
      if (
        typeof network.contractAddress !== "string" ||
        network.contractAddress.trim().length === 0
      ) {
        return [];
      }

      return [
        {
          chain: network.chain,
          contractAddress: network.contractAddress,
        },
      ];
    },
  );

  return {
    id: details.id,
    name: details.name,
    symbol: details.symbol,
    imageUrl: details.image?.small ?? details.image?.thumb ?? details.image?.large ?? null,
    description: details.description ?? null,
    homepageUrls: details.homepageUrls,
    blockchainSiteUrls: details.blockchainSiteUrls,
    twitterScreenName:
      typeof links?.twitter_screen_name === "string"
        ? links.twitter_screen_name.trim()
        : null,
    telegramChannelIdentifier:
      typeof links?.telegram_channel_identifier === "string"
        ? links.telegram_channel_identifier.trim()
        : null,
    githubUrls,
    categories: details.categories,
    contractAddresses,
    marketData: {
      currentPriceUsd: details.marketData.currentPriceUsd ?? null,
      priceChangePercentage24h: details.marketData.priceChangePercentage24h ?? null,
      marketCapUsd: details.marketData.marketCapUsd ?? null,
      totalVolumeUsd: details.marketData.totalVolumeUsd ?? null,
      athUsd: details.marketData.athUsd ?? null,
      athDate: details.marketData.athDate ?? null,
      high24hUsd: details.marketData.high24hUsd ?? null,
      low24hUsd: details.marketData.low24hUsd ?? null,
      circulatingSupply: details.marketData.circulatingSupply ?? null,
      totalSupply: details.marketData.totalSupply ?? null,
      maxSupply: details.marketData.maxSupply ?? null,
    },
    tickers: Array.isArray(data.tickers)
      ? normalizeCoinMentionTickers((data.tickers as UntypedJson[]).map(toRaw))
      : [],
  } satisfies CoinMentionContextRecord;
}

function normalizeNftSearchResult(entry: RawJson): NftSearchResult {
  const rawId = typeof entry?.id === "string" ? entry.id.trim() : "";
  const normalizedId = rawId.toLowerCase();
  const slug = typeof entry?.slug === "string" && entry.slug.trim().length > 0
    ? entry.slug.trim().toLowerCase()
    : normalizedId;

  return {
    id: normalizedId,
    slug,
    name: typeof entry?.name === "string" ? entry.name.trim() : "",
    symbol: typeof entry?.symbol === "string" ? entry.symbol.trim().toLowerCase() : "",
    thumbUrl: typeof entry?.thumb === "string"
      ? entry.thumb
      : typeof entry?.image === "string"
        ? entry.image
        : null,
  } satisfies NftSearchResult;
}

function normalizeMarketChart(data: RawJson): CoinMarketChart {
  return {
    prices: Array.isArray(data.prices) ? (data.prices as UntypedJson[]).map(normalizeTuple) : [],
    marketCaps: Array.isArray(data.market_caps) ? (data.market_caps as UntypedJson[]).map(normalizeTuple) : [],
    totalVolumes: Array.isArray(data.total_volumes) ? (data.total_volumes as UntypedJson[]).map(normalizeTuple) : [],
  };
}

function trimSeriesToWindow(series: [number, number][], windowMs: number): [number, number][] {
  if (!series.length || !Number.isFinite(windowMs) || windowMs <= 0) {
    return series;
  }
  const latestTimestamp = series[series.length - 1]?.[0];
  if (typeof latestTimestamp !== "number" || Number.isNaN(latestTimestamp)) {
    return series;
  }
  const cutoff = latestTimestamp - windowMs;
  return series.filter(([timestamp]) => timestamp >= cutoff);
}

function trimChartToWindow(chart: CoinMarketChart, windowMs: number | null): CoinMarketChart {
  if (!windowMs || windowMs <= 0) {
    return chart;
  }
  return {
    prices: trimSeriesToWindow(chart.prices, windowMs),
    marketCaps: trimSeriesToWindow(chart.marketCaps, windowMs),
    totalVolumes: trimSeriesToWindow(chart.totalVolumes, windowMs),
  };
}

function normalizeTuple(entry: UntypedJson): [number, number] {
  if (!Array.isArray(entry)) {
    return [0, 0];
  }
  const [timestamp, value] = entry;
  return [Number(timestamp), Number(value)];
}

function normalizeNftDetails(data: RawJson): NftCollectionDetails {
  const marketData = (sub(data.market_data) ?? {}) as RawJson;
  const stats = (sub(data.stats) ?? {}) as RawJson;
  const ownersCount = typeof marketData.number_of_unique_addresses === "number"
    ? marketData.number_of_unique_addresses
    : typeof data.number_of_unique_addresses === "number"
      ? data.number_of_unique_addresses
      : null;
  const itemsCount = typeof data.total_supply === "number"
    ? data.total_supply
    : typeof stats.total_supply === "number"
      ? stats.total_supply
      : typeof marketData.total_supply === "number"
        ? marketData.total_supply
        : null;
  const oneDaySales = typeof marketData.one_day_sales === "number"
    ? marketData.one_day_sales
    : typeof data.one_day_sales === "number"
      ? data.one_day_sales
      : null;
  const oneDayAveragePriceUsd = typeof marketData.one_day_average_price === "number"
    ? marketData.one_day_average_price
    : typeof marketData.one_day_average_price_in_usd === "number"
      ? marketData.one_day_average_price_in_usd
      : typeof data.one_day_average_price_usd === "number"
        ? data.one_day_average_price_usd
        : null;
  const links = sub(data.links);
  const floorPrice = sub(marketData.floor_price);
  const imageObj = sub(data.image);
  return {
    id: String(data.id ?? data.contract_address ?? ""),
    name: String(data.name ?? ""),
    symbol: String(data.symbol ?? ""),
    description: (data.description ?? null) as string | null,
    homepageUrl: Array.isArray(links?.homepage) ? ((links.homepage as UntypedJson[]).find(Boolean) as string) ?? null : null,
    floorPriceNative: (floorPrice?.native_currency ?? marketData.floor_price ?? null) as number | null,
    floorPriceUsd: (floorPrice?.usd ?? marketData.floor_price_in_usd ?? null) as number | null,
    marketCapUsd: (marketData.market_cap ?? null) as number | null,
    volume24hUsd: (marketData.volume_24h ?? marketData.volume_24h_usd ?? null) as number | null,
    totalVolumeUsd: (marketData.total_volume ?? null) as number | null,
    numberOfTokens: itemsCount ?? null,
    ownersCount,
    oneDaySales,
    oneDayAveragePriceUsd,
    blockchains: Array.isArray(data.blockchains) ? (data.blockchains as UntypedJson[]).filter(Boolean) as string[] : [],
    contractAddress: (data.contract_address ?? null) as string | null,
    imageUrl: (imageObj?.small ?? data.image ?? null) as string | null,
    lastUpdated: typeof data.last_updated === "string" ? new Date(data.last_updated).toISOString() : null,
  };
}

function normalizeNftMarketChart(data: RawJson): NftMarketChart {
  const prices = Array.isArray(data.prices) ? (data.prices as UntypedJson[][]) : [];
  return {
    prices: prices.map((entry) => [Number(entry[0]), Number(entry[1])] as [number, number]),
    totalVolumes: Array.isArray(data.total_volumes)
      ? (data.total_volumes as UntypedJson[][]).map((entry) => [Number(entry[0]), Number(entry[1])] as [number, number])
      : undefined,
  };
}

export async function getTrendingCollection(): Promise<CachedResponse<TrendingCollection>> {
  const key = buildCacheKey(["trending"]);
  return withCache(key, 300, async () => {
    const client = getClient();
    const response = await runWithSdkFallback(
      () => client.search.trending.get(),
      () => fetchFromRest("/search/trending"),
    );

    const raw = toRaw(response);
    const coins = Array.isArray(raw.coins)
      ? (raw.coins as UntypedJson[]).map((e) => { const entry = toRaw(e); return normalizeTrendingItem(toRaw(sub(entry.item) ?? entry), "coin"); })
      : [];
    const nfts = Array.isArray(raw.nfts)
      ? (raw.nfts as UntypedJson[]).map((e) => normalizeTrendingItem(toRaw(e), "nft"))
      : [];
    const categories = Array.isArray(raw.categories)
      ? (raw.categories as UntypedJson[]).map((e) => normalizeTrendingItem(toRaw(e), "category"))
      : [];

    return {
      coins,
      nfts,
      categories,
      combined: [...coins, ...nfts, ...categories],
    };
  });
}

export async function getCoinSnapshotsByIds(
  ids: string[],
  params: { vsCurrency: string; priceChangePercentage?: string },
): Promise<CoinMarketRow[]> {
  const unique = Array.from(new Set(ids.map((id) => id.trim().toLowerCase()).filter(Boolean)));
  if (!unique.length) {
    return [];
  }

  const vsCurrency = params.vsCurrency?.toLowerCase() ?? "usd";
  const priceChangePercentage = params.priceChangePercentage ?? "1h,24h";
  const chunkSize = 50;
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += chunkSize) {
    chunks.push(unique.slice(i, i + chunkSize));
  }

  const rows: CoinMarketRow[] = [];
  for (const batch of chunks) {
    const key = buildCacheKey(["coin-snapshots", vsCurrency, ...batch]);
    const cached = await withCache(key, 30, async () => {
      const payload = await fetchFromRest<Record<string, UntypedJson>[]>("/coins/markets", {
        vs_currency: vsCurrency,
        ids: batch.join(","),
        order: "market_cap_desc",
        per_page: batch.length,
        page: 1,
        sparkline: false,
        price_change_percentage: priceChangePercentage,
        precision: "full",
      });
      return Array.isArray(payload) ? payload.map((entry) => normalizeMarketRow(toRaw(entry))) : [];
    });
    rows.push(...cached.data);
  }

  return rows;
}

export async function getCoinDirectory(): Promise<CachedResponse<CoinDirectoryEntry[]>> {
  const key = buildCacheKey(["coin-directory", "v1"]);
  return withCache(key, COIN_DIRECTORY_CACHE_SECONDS, async () => {
    const payload = await fetchFromRest<Record<string, UntypedJson>[]>("/coins/list", { include_platform: true });
    if (!Array.isArray(payload)) {
      return [];
    }
    return payload
      .map(normalizeCoinDirectoryEntry)
      .filter((entry) => entry.id.length > 0);
  });
}

async function searchAssetsInternal(query: string): Promise<CachedResponse<AssetSearchCollection>> {
  const trimmed = typeof query === "string" ? query.trim() : "";
  if (!trimmed.length) {
    return {
      data: { coins: [], nfts: [] },
      fetchedAt: new Date().toISOString(),
      cache: "miss",
      stale: true,
    };
  }

  const normalizedQuery = trimmed.toLowerCase();
  const key = buildCacheKey(["asset-search", normalizedQuery]);
  return withCache(key, COIN_SEARCH_CACHE_SECONDS, async () => {
    const payload = await fetchFromRest<{ coins?: UntypedJson[]; nfts?: UntypedJson[] }>("/search", { query: trimmed });
    const coins = Array.isArray(payload?.coins)
      ? payload.coins
        .map((e: UntypedJson) => normalizeCoinSearchResult(toRaw(e)))
        .filter((entry) => entry.id.length > 0)
      : [];
    const nfts = Array.isArray(payload?.nfts)
      ? payload.nfts
        .map((e: UntypedJson) => normalizeNftSearchResult(toRaw(e)))
        .filter((entry) => entry.id.length > 0 || entry.slug.length > 0)
      : [];
    return { coins, nfts } satisfies AssetSearchCollection;
  });
}

export async function searchAssets(query: string): Promise<CachedResponse<AssetSearchCollection>> {
  return searchAssetsInternal(query);
}

export async function searchCoins(query: string): Promise<CachedResponse<CoinSearchResult[]>> {
  const result = await searchAssetsInternal(query);
  return {
    ...result,
    data: result.data.coins,
  } satisfies CachedResponse<CoinSearchResult[]>;
}

export async function searchTokenMentions(
  query: string,
): Promise<CachedResponse<TokenMentionSearchResult[]>> {
  const result = await searchAssetsInternal(query);
  return {
    ...result,
    data: result.data.coins
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        symbol: entry.symbol,
        imageUrl: sanitizeImageUrl(entry.thumb) ?? null,
        marketCapRank: entry.marketCapRank ?? null,
        launchedAt: null,
      }))
      .filter((entry) => entry.id.length > 0),
  } satisfies CachedResponse<TokenMentionSearchResult[]>;
}

export async function getRecentlyListedCoins(): Promise<
  CachedResponse<TokenMentionRecentCollection>
> {
  const key = buildCacheKey(["coin-mentions-recent"]);

  return withCache(key, COIN_RECENT_CACHE_SECONDS, async () => {
    try {
      const payload = await fetchFromRest<UntypedJson[]>("/coins/list/new");
      const items = Array.isArray(payload)
        ? payload
            .map((entry) => normalizeRecentlyListedToken(toRaw(entry)))
            .filter((entry) => entry.id.length > 0)
        : [];

      return {
        items,
        source: "coins-list-new",
      } satisfies TokenMentionRecentCollection;
    } catch (error) {
      if (!isProOnlyEndpointError(error)) {
        throw error;
      }

      logger.warn(
        "[coingecko] /coins/list/new requires a paid plan; using trending coins as token mention fallback",
      );

      const trending = await getTrendingCollection();

      return {
        items: trending.data.coins
          .map((entry) => normalizeTrendingMentionResult(entry))
          .filter((entry) => entry.id.length > 0),
        source: "trending-fallback",
      } satisfies TokenMentionRecentCollection;
    }
  });
}

export async function getCoinMentionContextRecord(
  id: string,
): Promise<CachedResponse<CoinMentionContextRecord>> {
  const normalizedId = id.trim().toLowerCase();
  const key = buildCacheKey(["coin-mention-context", normalizedId]);

  return withCache(key, COIN_MENTION_CACHE_SECONDS, async () => {
    if (!normalizedId) {
      throw new Error("Coin id is required");
    }

    const response = await fetchFromRest<UntypedJson>(`/coins/${normalizedId}`, {
      localization: false,
      tickers: true,
      community_data: true,
      developer_data: false,
      sparkline: false,
    });

    return normalizeCoinMentionContextRecord(toRaw(response));
  });
}

export async function getCoinMentionContextRecords(
  ids: string[],
): Promise<CachedResponse<CoinMentionContextRecord[]>> {
  const uniqueIds = Array.from(
    new Set(ids.map((id) => id.trim().toLowerCase()).filter(Boolean)),
  );

  if (uniqueIds.length === 0) {
    return {
      data: [],
      fetchedAt: new Date().toISOString(),
      cache: "miss",
    };
  }

  const records = await Promise.all(
    uniqueIds.map(async (id) => {
      const result = await getCoinMentionContextRecord(id);
      return result;
    }),
  );

  return {
    data: records.map((result) => result.data),
    fetchedAt: records[0]?.fetchedAt ?? new Date().toISOString(),
    cache: records.every((result) => result.cache === "hit") ? "hit" : "miss",
    stale: records.some((result) => result.stale),
    fallback: records.some((result) => result.fallback),
    error: records.find((result) => result.error)?.error,
  } satisfies CachedResponse<CoinMentionContextRecord[]>;
}

export async function getCoinDetails(id: string): Promise<CachedResponse<CoinDetails>> {
  const key = buildCacheKey(["coin", id]);
  return withCache(key, 60, async () => {
    if (!id) {
      throw new Error("Coin id is required");
    }

    const client = getClient();
    const response = await runWithSdkFallback(
      () =>
        client.coins.getID(id, {
          localization: false,
          tickers: false,
          community_data: false,
          developer_data: false,
          sparkline: false,
        }),
      () =>
        fetchFromRest(`/coins/${id}`, {
          localization: false,
          tickers: false,
          community_data: false,
          developer_data: false,
          sparkline: false,
        }),
    );

    return normalizeCoinDetails(toRaw(response));
  });
}

export async function getCoinMarketChart(
  id: string,
  params: CoinChartQueryParams,
): Promise<CachedResponse<CoinMarketChart>> {
  const { vsCurrency, days, interval } = params;
  const requestedInterval = typeof interval === "string" ? interval.toLowerCase() : undefined;
  const numericDays =
    typeof days === "number"
      ? days
      : typeof days === "string"
        ? Number.parseFloat(days)
        : Number.NaN;
  const hasFiniteDayWindow = Number.isFinite(numericDays);
  const wantsHourly = requestedInterval === "hourly";
  const shouldExtendWindow = wantsHourly && hasFiniteDayWindow && (numericDays as number) < 2;
  const normalizedInterval = wantsHourly ? undefined : interval;
  const effectiveDays: typeof days = shouldExtendWindow ? (typeof days === "number" ? 2 : "2") : days;
  const trimWindowMs = shouldExtendWindow && hasFiniteDayWindow ? (numericDays as number) * DAY_IN_MS : null;
  const key = buildCacheKey([
    "coin-chart",
    id,
    vsCurrency,
    days,
    normalizedInterval ?? null,
    shouldExtendWindow ? "extended" : undefined,
  ]);
  return withCache(key, 60, async () => {
    if (!id) {
      throw new Error("Coin id is required");
    }

    const client = getClient();
    const buildSdkParams = (intervalOverride?: string): MarketChartGetParams => {
      const params: MarketChartGetParams = {
        vs_currency: vsCurrency,
        days: typeof effectiveDays === "number" ? String(effectiveDays) : (effectiveDays as string),
      };
      if (intervalOverride) {
        params.interval = intervalOverride as MarketChartGetParams["interval"];
      }
      return params;
    };
    const buildRestParams = (intervalOverride?: string): Record<string, string | number> => {
      const params: Record<string, string | number> = {
        vs_currency: vsCurrency,
        days: effectiveDays,
      };
      if (intervalOverride) {
        params.interval = intervalOverride;
      }
      return params;
    };

    const fetchChart = (intervalOverride?: string) =>
      runWithSdkFallback(
        () => client.coins.marketChart.get(id, buildSdkParams(intervalOverride)),
        () => fetchFromRest(`/coins/${id}/market_chart`, buildRestParams(intervalOverride)),
      );

    const initialInterval = typeof normalizedInterval === "string" ? normalizedInterval : undefined;
    try {
      const response = await fetchChart(initialInterval);
      const chart = normalizeMarketChart(toRaw(response));
      if (!chart.prices || chart.prices.length === 0) {
        throw new CoinGeckoRetryableError("No price data found in chart response", 404);
      }
      return trimChartToWindow(chart, trimWindowMs);
    } catch (error) {
      if (initialInterval && wantsHourly && isHourlyIntervalRestrictionError(error)) {
        const fallbackResponse = await fetchChart(undefined);
        return trimChartToWindow(normalizeMarketChart(toRaw(fallbackResponse)), trimWindowMs);
      }
      throw error;
    }
  });
}

export async function getNftDetails(id: string): Promise<CachedResponse<NftCollectionDetails>> {
  const key = buildCacheKey(["nft", id]);
  return withCache(key, 60, async () => {
    if (!id) {
      throw new Error("NFT id is required");
    }

    const client = getClient();
    const response = await runWithSdkFallback(
      () => client.nfts?.getID?.(id) ?? fetchFromRest(`/nfts/${id}`),
      () => fetchFromRest(`/nfts/${id}`),
    );

    return normalizeNftDetails(toRaw(response));
  });
}

export async function getNftMarketChart(
  id: string,
  params: { vsCurrency: string; days: number | string },
): Promise<CachedResponse<NftMarketChart>> {
  const { vsCurrency, days } = params;
  const key = buildCacheKey(["nft-chart", id, vsCurrency, days]);
  return withCache(key, 60, async () => {
    if (!id) {
      throw new Error("NFT id is required");
    }

    const client = getClient();
    const response = await runWithSdkFallback(
      () => client.nfts?.marketChart?.get?.(id, { vs_currency: vsCurrency, days: String(days) } as UntypedJson as MarketChartGetParams),
      () => fetchFromRest(`/nfts/${id}/market_chart`, { vs_currency: vsCurrency, days }),
    );

    return normalizeNftMarketChart(toRaw(response));
  });
}

// --- Token metadata by platform/contract (for ERC-20 / SPL) ----------------

export async function getCoinIdByContract(
  platform: string,
  contractAddress: string,
): Promise<CachedResponse<string | null>> {
  const normalizedPlatform = platform.trim().toLowerCase();
  const normalizedAddress = contractAddress.trim();

  if (!normalizedPlatform || !normalizedAddress) {
    return {
      data: null,
      fetchedAt: new Date().toISOString(),
      cache: "miss",
    };
  }

  const key = buildCacheKey(["token_id", normalizedPlatform, normalizedAddress.toLowerCase()]);

  return withCache(key, 24 * 60 * 60, async () => {
    try {
      const controller = new AbortController();
      const response = await fetchFromRest<Record<string, UntypedJson>>(
        `/coins/${normalizedPlatform}/contract/${normalizedAddress}`,
        undefined,
        { timeoutMs: 8_000, signal: controller.signal },
      );

      const id = typeof response?.id === "string" ? response.id : null;
      return id ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/CoinGecko REST (400|404):/i.test(message)) {
        return null;
      }
      throw error;
    }
  });
}

// --- Token prices by platform/contract (for ERC-20 / SPL) -----------------

/**
 * Fetch simple coin prices by CoinGecko id.
 * Useful for native assets that do not have contract addresses (e.g. XLM).
 */
export async function getCoinPricesByIds(
  ids: string[],
): Promise<Record<string, { usd?: number; usd_24h_change?: number }>> {
  const unique = Array.from(new Set(ids.map((id) => id.trim().toLowerCase()).filter(Boolean)));
  if (unique.length === 0) {
    return {};
  }

  try {
    const key = buildCacheKey(["simple_price", "usd", ...unique]);
    const cached = await withCache<Record<string, { usd?: number; usd_24h_change?: number }>>(key, 60, async () => {
      return await fetchFromRest<Record<string, { usd?: number; usd_24h_change?: number }>>(
        `/simple/price`,
        {
          ids: unique.join(","),
          vs_currencies: "usd",
          include_24hr_change: true,
        },
      );
    });
    return cached.data ?? {};
  } catch (error) {
    logger.warn("[coingecko] simple price fetch failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {};
  }
}

/**
 * Fetch token prices by contract addresses for a given Coingecko platform id.
 * Example platforms: 'ethereum', 'polygon-pos', 'arbitrum-one', 'optimism', 'base', 'bsc', 'avalanche', 'solana'.
 */
export async function getTokenPricesByContracts(
  platform: string,
  contractAddresses: string[],
): Promise<Record<string, { usd?: number; usd_24h_change?: number }>> {
  const unique = Array.from(new Set(contractAddresses.map((a) => a.toLowerCase()).filter(Boolean)));
  if (!platform || unique.length === 0) {
    return {};
  }

  const chunk = (arr: string[], size: number) => {
    const out: string[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const batches = chunk(unique, 50); // Coingecko supports sizeable batches; keep conservative
  const results: Record<string, { usd?: number; usd_24h_change?: number }> = {};

  for (const batch of batches) {
    try {
      const key = buildCacheKey(["token_price", platform, ...batch]);
      const cached = await withCache<Record<string, { usd?: number; usd_24h_change?: number }>>(key, 90, async () => {
        return await fetchFromRest<Record<string, { usd?: number; usd_24h_change?: number }>>(
          `/simple/token_price/${platform}`,
          {
            vs_currencies: "usd",
            include_24hr_change: true,
            contract_addresses: batch.join(","),
          },
        );
      });
      Object.assign(results, cached.data);
    } catch (error) {
      logger.warn(`[coingecko] token_price batch failed for ${platform}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  return results;
}

export async function getTokenMarketChartByContract(params: {
  platform: string;
  contractAddress: string;
  vsCurrency?: string;
  days?: number | string;
}): Promise<CachedResponse<CoinMarketChart>> {
  const platform = (params.platform ?? "").trim().toLowerCase();
  const contractAddress = (params.contractAddress ?? "").trim().toLowerCase();
  if (!platform || !contractAddress) {
    return {
      data: { prices: [], marketCaps: [], totalVolumes: [] },
      fetchedAt: new Date().toISOString(),
      cache: "miss",
      stale: true,
    };
  }

  const vsCurrency = (params.vsCurrency ?? "usd").toLowerCase();
  const days = params.days ?? 1;

  const key = buildCacheKey(["token-market-chart", platform, contractAddress, vsCurrency, String(days)]);
  return withCache(key, 5 * 60, async () => {
    const payload = await fetchFromRest<Record<string, UntypedJson>>(
      `/coins/${platform}/contract/${contractAddress}/market_chart`,
      { vs_currency: vsCurrency, days: String(days) },
    );
    return normalizeMarketChart(toRaw(payload));
  });
}

export async function getCoingeckoMarkets(
  ids: string[],
  params: { vsCurrency?: string; page?: number; perPage?: number; sparkline?: boolean } = {}
): Promise<CachedResponse<CoinMarketRow[]>> {
    if (!ids.length) {
        return {
            data: [],
            fetchedAt: new Date().toISOString(),
            cache: "miss"
        };
    }

    const vsCurrency = params.vsCurrency ?? "usd";
    const page = params.page ?? 1;
    // Default perPage to ids length if not specified, but max 250 per Coingecko docs? 
    // Coingecko allows up to 250.
    const perPage = params.perPage ?? Math.min(ids.length, 250); 
    const sparkline = params.sparkline ?? false;

    // Use a simplified cache key
    const key = buildCacheKey(["markets", ids.sort().join(","), vsCurrency, String(page), String(perPage), String(sparkline)]);
    
    return withCache(key, 60, async () => {
        const data = await fetchFromRest<CoinMarketRow[]>(
            "/coins/markets",
            {
                vs_currency: vsCurrency,
                ids: ids.join(","),
                order: "market_cap_desc",
                per_page: perPage,
                page: page,
                sparkline: sparkline,
                price_change_percentage: "1h,24h,7d"
            }
        );

        // Map to a CoinMarketRow-like structure (or just return raw if compatible, but typing is safer)
        // Since CoinMarketRow is imported, let's try to match it.
        // If CoinMarketRow is strict, we might need to be careful.
        // For now, casting the result is usually what we do if the shapes align.
        return data as CoinMarketRow[];
    });
}
import type {
  OnchainTokenData,
  OnchainPoolData,
  OnchainPoolOHLCV,
  OnchainTradeData,
} from "@/types/market";

// --- Onchain DEX Data Endpoints -------------------------------------------

export async function getTokenDataByContract(
  network: string,
  address: string
): Promise<CachedResponse<OnchainTokenData | null>> {
  const networkId = network.trim().toLowerCase();
  const contractAddress = address.trim().toLowerCase();

  if (!networkId || !contractAddress) {
    return { data: null, fetchedAt: new Date().toISOString(), cache: "miss" };
  }

  const key = buildCacheKey(["onchain-token", networkId, contractAddress]);
  return withCache(key, 300, async () => {
    try {
      const response = await fetchFromRest<{ data: UntypedJson }>(
        `/onchain/networks/${networkId}/tokens/${contractAddress}`,
        undefined,
        { timeoutMs: 10_000 }
      );
      return toRaw(response.data) as unknown as OnchainTokenData;
    } catch (error) {
       // Return null on 404 to avoid breaking upstream
       const message = error instanceof Error ? error.message : String(error);
       if (/CoinGecko REST (400|404):/i.test(message)) {
         return null;
       }
       throw error;
    }
  });
}

/**
 * Fetch market charts for multiple coin IDs in parallel.
 * Useful for sparklines.
 */
export async function getBatchCoinMarketCharts(
    ids: string[],
    days: number = 7,
    vsCurrency: string = "usd"
): Promise<Record<string, number[]>> {
    const results: Record<string, number[]> = {};
    const uniqueIds = Array.from(new Set(ids.map(id => id.trim().toLowerCase()).filter(Boolean)));
    
    // Process in parallel. Our fetchers handle rate limits via p-retry and SDK circuit breakers.
    // However, to be kind to the API, we can chunk if needed. 
    // Typically <20 items for visible UI elements.
    if (uniqueIds.length === 0) return {};

    const promises = uniqueIds.map(async (id) => {
        try {
            const chart = await getCoinMarketChart(id, { vsCurrency, days });
            if (chart.data.prices) {
                // Return just the prices for sparklines [price1, price2, ...]
                return { id, prices: chart.data.prices.map(p => p[1]) };
            }
        } catch (err) {
            logger.warn(`[coingecko] Failed to fetch market chart for ${id}`, { error: err instanceof Error ? err.message : String(err) });
        }
        return { id, prices: [] as number[] };
    });

    const charts = await Promise.all(promises);
    
    charts.forEach(c => {
        if (c.prices.length > 0) {
            results[c.id] = c.prices;
        }
    });

    return results;
}


export async function getPoolsByToken(
  network: string,
  address: string
): Promise<CachedResponse<OnchainPoolData[]>> {
  const networkId = network.trim().toLowerCase();
  const contractAddress = address.trim().toLowerCase();

  const key = buildCacheKey(["onchain-pools-by-token", networkId, contractAddress]);
  return withCache(key, 120, async () => {
    try {
      const response = await fetchFromRest<{ data: UntypedJson[] }>(
        `/onchain/networks/${networkId}/tokens/${contractAddress}/pools`,
        undefined,
        { timeoutMs: 10_000 }
      );
      return Array.isArray(response.data)
        ? (response.data as unknown as OnchainPoolData[])
        : [];
    } catch (error) {
       const message = error instanceof Error ? error.message : String(error);
       if (/CoinGecko REST (400|404):/i.test(message)) {
         return [];
       }
       throw error;
    }
  });
}

export async function getPoolOHLCV(
  network: string,
  poolAddress: string,
  timeframe: "day" | "hour" | "minute",
  aggregate = 1,
  beforeTimestamp?: number
): Promise<CachedResponse<OnchainPoolOHLCV | null>> {
  const networkId = network.trim().toLowerCase();
  const address = poolAddress.trim().toLowerCase();
  
  // Cache key includes all params
  const key = buildCacheKey([
    "onchain-pool-ohlcv", 
    networkId, 
    address, 
    timeframe, 
    aggregate, 
    beforeTimestamp
  ]);

  // OHLCV changes frequently, but we cache for at least 1 minute to avoid spamming
  const ttl = timeframe === "minute" ? 60 : 300;

  return withCache(key, ttl, async () => {
    try {
      const query: Record<string, string | number> = {
        aggregate: aggregate,
      };
      if (beforeTimestamp) {
        query.before_timestamp = beforeTimestamp;
      }
      
      const response = await fetchFromRest<{ data: UntypedJson }>(
        `/onchain/networks/${networkId}/pools/${address}/ohlcv/${timeframe}`,
        query,
        { timeoutMs: 10_000 }
      );
      
      return toRaw(response.data) as unknown as OnchainPoolOHLCV;
    } catch (error) {
       const message = error instanceof Error ? error.message : String(error);
       if (/CoinGecko REST (400|404):/i.test(message)) {
         return null;
       }
       throw error;
    }
  });
}

export async function getPoolTrades(
  network: string,
  poolAddress: string,
  tradeVolumeInUsdGreaterThan?: number
): Promise<CachedResponse<OnchainTradeData[]>> {
  const networkId = network.trim().toLowerCase();
  const address = poolAddress.trim().toLowerCase();

  const key = buildCacheKey(["onchain-pool-trades", networkId, address, tradeVolumeInUsdGreaterThan]);

  // Trades are high frequency, cache for short duration
  return withCache(key, 30, async () => {
    try {
      const query: Record<string, string | number> = {};
      if (typeof tradeVolumeInUsdGreaterThan === "number") {
        query.trade_volume_in_usd_greater_than = tradeVolumeInUsdGreaterThan;
      }

      const response = await fetchFromRest<{ data: UntypedJson[] }>(
        `/onchain/networks/${networkId}/pools/${address}/trades`,
        query,
        { timeoutMs: 8000 }
      );

      return Array.isArray(response.data)
        ? (response.data as unknown as OnchainTradeData[])
        : [];
      
    } catch (error) {
       const message = error instanceof Error ? error.message : String(error);
       if (/CoinGecko REST (400|404):/i.test(message)) {
         return [];
       }
       throw error;
    }
  });
}

/**
 * Get Top Coins by Market Cap (For general market lists)
 */
export async function getTopCoins(
    params: {
        vsCurrency?: string;
        page?: number;
        perPage?: number;
        category?: string;
        order?: "market_cap_desc" | "volume_desc" | "id_desc" | "id_asc"; 
        priceChangePercentage?: string;
        sparkline?: boolean;
    } = {},
    options?: RestFetchOptions
): Promise<CachedResponse<CoinMarketRow[]>> {
    const vsCurrency = params.vsCurrency ?? "usd";
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 100;
    const order = params.order ?? "market_cap_desc";
    const category = params.category;
    const priceChangePercentage = params.priceChangePercentage ?? "1h,24h,7d";
    const sparkline = params.sparkline ?? true;

    const cacheKeyParts = ["top-coins", vsCurrency, page, perPage, order, priceChangePercentage, sparkline ? "sparkline" : "no-sparkline"];
    if (category) cacheKeyParts.push(category);

    const key = buildCacheKey(cacheKeyParts);

    // Cache for 60 seconds (market data)
    return withCache(key, 60, async () => {
        const query: Record<string, string | number> = {
            vs_currency: vsCurrency,
            order,
            per_page: perPage,
            page,
            price_change_percentage: priceChangePercentage,
            sparkline: sparkline ? "true" : "false",
        };
        if (category) query.category = category;

        const payload = await fetchFromRest<Record<string, UntypedJson>[]>("/coins/markets", query, options);
        
        if (!Array.isArray(payload)) return [];
        return payload.map((entry) => normalizeMarketRow(toRaw(entry)));
    });
}

/**
 * Get Coin Categories
 */
export async function getCoinCategories(): Promise<CachedResponse<CoinCategorySummary[]>> {
    const key = buildCacheKey(["coin-categories"]);
    // Cache categories for 1 hour
    return withCache(key, 3600, async () => {
        // endpoint /coins/categories/list gives id/name
        // endpoint /coins/categories gives full data with market cap
        // We probably want the full data for "availableCategories" in token-asset.ts
        const payload = await fetchFromRest<Record<string, UntypedJson>[]>("/coins/categories");
        if (!Array.isArray(payload)) return [];

        return payload.map(item => ({
            id: String(item.id || ""),
            name: String(item.name || ""),
            marketCap: typeof item.market_cap === 'number' ? item.market_cap : 0,
            marketCapChange24h: typeof item.market_cap_change_24h === 'number' ? item.market_cap_change_24h : 0,
            volume24hUsd: typeof item.volume_24h === 'number' ? item.volume_24h : 0,
            updatedAt: String(item.updated_at || new Date().toISOString()),
            topThreeCoinImageUrls: Array.isArray(item.top_3_coins) ? item.top_3_coins.map(String) : []
        }));
    });
}

/**
 * Get Coin Details by Contract Address (Coin API, not Onchain)
 * Useful for resolving a contract to a CoinGecko ID and full metadata.
 */
export async function getCoinDataByContract(
    platformId: string,
    contractAddress: string
): Promise<CachedResponse<CoinDetails | null>> {
    const key = buildCacheKey(["coin-by-contract", platformId, contractAddress]);
    return withCache(key, 300, async () => {
        try {
            // coin api /coins/{id}/contract/{contract_address}
            const data = await fetchFromRest<UntypedJson>(`/coins/${platformId}/contract/${contractAddress}`);
            return normalizeCoinDetails(data);
        } catch {
             // 404 means not found
             return null;
        }
    });
}
export async function getGlobalMarketData(): Promise<CachedResponse<GlobalMarketData>> {
  const key = buildCacheKey(["global"]);
  return withCache(key, 300, async () => {
    const response = await fetchFromRest<{ data: GlobalMarketData }>("/global");
    return response.data;
  });
} 
