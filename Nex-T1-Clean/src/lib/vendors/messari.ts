import {
  VendorHttpError,
  withVendorCache,
  vendorCacheKey,
  vendorFetch,
  VendorResponse,
  type VendorRequestOptions,
} from "./base";

const MESSARI_API_ROOT = "https://api.messari.io";
const MESSARI_AI_BASE = `${MESSARI_API_ROOT}/api/v3/ai/openai`;
const MESSARI_METRICS_BASE = `${MESSARI_API_ROOT}/metrics/v1`;
const MESSARI_CORE_V1_BASE = `${MESSARI_API_ROOT}/api/v1`;
const MESSARI_LEGACY_BASE = "https://data.messari.io/api/v1";
const DEFAULT_TTL_SECONDS = 600;
const DEFAULT_REQUEST_TIMEOUT_MS = Number(process.env.MESSARI_HTTP_TIMEOUT_MS ?? 7_000);
const DEFAULT_REQUEST_RETRY_ATTEMPTS = Number(process.env.MESSARI_HTTP_RETRY_ATTEMPTS ?? 0);
const DEFAULT_REQUEST_BACKOFF_MS = Number(process.env.MESSARI_HTTP_BACKOFF_MS ?? 750);

export interface MessariAssetMetricsResponse {
  data: {
    market_data: {
      price_usd: number;
      volume_last_24_hours: number;
    };
    defi?: {
      total_value_locked_usd?: number;
    };
    chain_data?: {
      transactions_last_24_hours?: number;
    };
    fees?: {
      revenue_last_24_hours?: number;
    };
  };
}

export interface MessariMarketSnapshotResponse {
  data: Array<{
    exchange_name: string;
    base_asset: string;
    quote_asset: string;
    close: number;
    volume: number;
  }>;
}

export interface MessariReportResponse {
  data: Array<{
    id: string;
    title: string;
    published_at: string;
    slug: string;
    tags: string[];
    assets: Array<{ slug: string; name: string }>;
    url: string;
  }>;
}

export async function getMessariAssetMetrics(
  asset: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  requestOptions?: VendorRequestOptions,
): Promise<VendorResponse<MessariAssetMetricsResponse>> {
  const key = vendorCacheKey(["messari", "metrics", asset, ttlSeconds]);
  return withVendorCache(key, ttlSeconds, async () => {
    const url = `${MESSARI_METRICS_BASE}/assets/${encodeURIComponent(asset)}/metrics`;
    const legacyUrl = `${MESSARI_LEGACY_BASE}/assets/${encodeURIComponent(asset)}/metrics`;
    return fetchWithLegacyFallback<MessariAssetMetricsResponse>(
      url,
      legacyUrl,
      applyMessariRequestDefaults(requestOptions),
    );
  });
}

export async function getMessariMarketSnapshot(
  ttlSeconds = 300,
  requestOptions?: VendorRequestOptions,
): Promise<VendorResponse<MessariMarketSnapshotResponse>> {
  const key = vendorCacheKey(["messari", "markets"]);
  return withVendorCache(key, ttlSeconds, async () => {
    const url = `${MESSARI_METRICS_BASE}/markets`;
    const legacyUrl = `${MESSARI_LEGACY_BASE}/markets`;
    return fetchWithLegacyFallback<MessariMarketSnapshotResponse>(
      url,
      legacyUrl,
      applyMessariRequestDefaults(requestOptions),
    );
  });
}

export async function getMessariReports(
  params: {
    asset?: string;
    tag?: string;
    publishedAfter?: string;
  } = {},
  ttlSeconds = 3600,
  requestOptions?: VendorRequestOptions,
): Promise<VendorResponse<MessariReportResponse>> {
  const key = vendorCacheKey([
    "messari",
    "reports",
    params.asset,
    params.tag,
    params.publishedAfter,
  ]);

  return withVendorCache(key, ttlSeconds, async () => {
    const search = new URLSearchParams();
    if (params.asset) search.set("asset", params.asset);
    if (params.tag) search.set("tags", params.tag);
    if (params.publishedAfter) search.set("publishedAfter", params.publishedAfter);

    const query = search.toString();
    const url = `${MESSARI_CORE_V1_BASE}/reports${query ? `?${query}` : ""}`;
    const legacyUrl = `${MESSARI_LEGACY_BASE}/reports${query ? `?${query}` : ""}`;
    return fetchWithLegacyFallback<MessariReportResponse>(
      url,
      legacyUrl,
      applyMessariRequestDefaults(requestOptions),
    );
  });
}

export async function messariChatCompletion<TRequest extends Record<string, UntypedJson>, TResponse = UntypedJson>(
  body: TRequest,
): Promise<TResponse> {
  if (!process.env.MESSARI_API_KEY) {
    throw new Error("Missing MESSARI_API_KEY environment variable");
  }

  const response = await vendorFetch<TResponse>(`${MESSARI_AI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      ...messariHeaders(),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return response;
}

function messariHeaders(): HeadersInit {
  if (!process.env.MESSARI_API_KEY) {
    throw new Error("Missing MESSARI_API_KEY environment variable");
  }
  const apiKey = process.env.MESSARI_API_KEY;

  return {
    "x-messari-api-key": apiKey,
    "x-api-key": apiKey,
    accept: "application/json",
  };
}

async function fetchWithLegacyFallback<T>(
  primaryUrl: string,
  legacyUrl: string,
  options: VendorRequestOptions = {},
): Promise<T> {
  const requestOptions = {
    ...options,
    headers: buildMessariHeaders(options.headers),
  } satisfies VendorRequestOptions;

  try {
    return await vendorFetch<T>(primaryUrl, requestOptions);
  } catch (error) {
    if (shouldFallbackToLegacy(error) && !requestOptions.signal?.aborted) {
      return vendorFetch<T>(legacyUrl, requestOptions);
    }
    throw error;
  }
}

function applyMessariRequestDefaults(overrides?: VendorRequestOptions): VendorRequestOptions {
  return {
    ...overrides,
    timeoutMs: overrides?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    retry: overrides?.retry ?? DEFAULT_REQUEST_RETRY_ATTEMPTS,
    backoffMs: overrides?.backoffMs ?? DEFAULT_REQUEST_BACKOFF_MS,
  };
}

function buildMessariHeaders(headers?: HeadersInit): HeadersInit {
  return {
    ...normalizeHeaders(headers),
    ...(messariHeaders() as Record<string, string>),
  };
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (isHeadersInstance(headers)) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return { ...(headers as Record<string, string>) };
}

function isHeadersInstance(value: HeadersInit): value is Headers {
  return typeof Headers !== "undefined" && value instanceof Headers;
}

function shouldFallbackToLegacy(error: UntypedJson): boolean {
  if (error instanceof VendorHttpError) {
    return error.status === 401 || error.status === 404;
  }
  return false;
}
