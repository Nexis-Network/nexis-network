/**
 * CoinGecko API Proxy Route
 * Proxies requests to CoinGecko API with:
 * - Server-side API key injection (Pro or Demo)
 * - Rate limiting (50 req/min per IP)
 * - Response caching with stale fallback
 */

import { connection, NextRequest } from "next/server";
import {
  checkRateLimit,
  withProxyCache,
  createProxyResponse,
  createErrorResponse,
  getClientIdentifier,
  RATE_LIMITS,
} from "@/lib/api-proxy";

import { logger } from "@/lib/logger";
import {
  isCoingeckoDemoKeyMismatchError,
  resolveCoingeckoApiBase,
  resolveCoingeckoCredentials,
} from "@/server/market/coingecko-base";

const {
  proApiKey: COINGECKO_API_KEY = "",
  demoApiKey: COINGECKO_DEMO_API_KEY = "",
} = resolveCoingeckoCredentials({
  apiKey: process.env.COINGECKO_API_KEY,
  proApiKey: process.env.COINGECKO_PRO_API_KEY,
  demoApiKey: process.env.COINGECKO_DEMO_API_KEY,
});
const COINGECKO_PUBLIC_BASE = resolveCoingeckoApiBase({
  apiKey: undefined,
  envBase: "https://api.coingecko.com/api/v3",
});
const COINGECKO_PRO_BASE = resolveCoingeckoApiBase({
  apiKey: COINGECKO_API_KEY || "enabled",
  envBase: process.env.COINGECKO_API_BASE ?? "https://pro-api.coingecko.com/api/v3",
});
const FALLBACK_LOG_COOLDOWN_MS = Number(
  process.env.COINGECKO_PROXY_FALLBACK_LOG_COOLDOWN_MS ?? 60_000,
);
const fallbackLogLastSeenAt = new Map<string, number>();
const KEY_DISABLE_MS = Number(
  process.env.COINGECKO_PROXY_KEY_DISABLE_MS ?? 5 * 60_000,
);
const keyDisabledUntil = new Map<Exclude<CoinGeckoApiConfig["id"], "public">, number>();

// Cache TTL by endpoint pattern (seconds)
// Cache TTLs tuned for 500K credits/month budget (~11 req/min sustained)
const CACHE_TTLS: Record<string, number> = {
  "coins/markets": 120, // 2 min — most polled endpoint, extended from 60s
  "coins/list": 3600, // 1 hour
  trending: 900, // 15 min
  search: 300, // 5 min
  "simple/price": 300, // 5 min — extended from 2 min
  "coins/": 300, // 5 min for coin details / OHLC
  global: 600, // 10 min — extended from 5 min
  default: 180, // 3 min default — extended from 2 min
};

function getCacheTtl(path: string): number {
  for (const [pattern, ttl] of Object.entries(CACHE_TTLS)) {
    if (path.includes(pattern)) return ttl;
  }
  return CACHE_TTLS.default;
}

type CoinGeckoApiConfig = {
  id: "pro" | "demo" | "public";
  baseUrl: string;
  headers: Record<string, string>;
};

function getApiConfigs(): CoinGeckoApiConfig[] {
  const configs: CoinGeckoApiConfig[] = [];
  const now = Date.now();

  const proDisabledUntil = keyDisabledUntil.get("pro") ?? 0;
  if (COINGECKO_API_KEY && proDisabledUntil <= now) {
    configs.push({
      id: "pro",
      baseUrl: COINGECKO_PRO_BASE,
      headers: { "x-cg-pro-api-key": COINGECKO_API_KEY },
    });
  }

  const demoDisabledUntil = keyDisabledUntil.get("demo") ?? 0;
  const fallbackDemoKey = COINGECKO_DEMO_API_KEY || COINGECKO_API_KEY;
  if (fallbackDemoKey && demoDisabledUntil <= now) {
    configs.push({
      id: "demo",
      baseUrl: COINGECKO_PUBLIC_BASE,
      headers: { "x-cg-demo-api-key": fallbackDemoKey },
    });
  }

  configs.push({
    id: "public",
    baseUrl: COINGECKO_PUBLIC_BASE,
    headers: {},
  });

  const seen = new Set<string>();
  return configs.filter((config) => {
    const signature = `${config.baseUrl}|${Object.keys(config.headers).sort().join(",")}`;
    if (seen.has(signature)) {
      return false;
    }
    seen.add(signature);
    return true;
  });
}

function shouldFallback(status: number, body: string): boolean {
  return (
    status === 401 ||
    status === 403 ||
    status === 429 ||
    (status === 400 && isCoingeckoDemoKeyMismatchError(body))
  );
}

function logFallbackOnce(scope: string, message: string) {
  const now = Date.now();
  const lastSeen = fallbackLogLastSeenAt.get(scope) ?? 0;
  if (now - lastSeen < FALLBACK_LOG_COOLDOWN_MS) {
    return;
  }
  fallbackLogLastSeenAt.set(scope, now);
  if (fallbackLogLastSeenAt.size > 512) {
    // Prevent unbounded growth for high-cardinality paths.
    const oldest = fallbackLogLastSeenAt.keys().next().value as string | undefined;
    if (oldest) fallbackLogLastSeenAt.delete(oldest);
  }
  logger.warn(message);
}

function disableKeyTemporarily(id: CoinGeckoApiConfig["id"], disableMs: number, reason: string) {
  if (id === "public") {
    return;
  }

  const clampedMs = Number.isFinite(disableMs) ? Math.max(1_000, Math.min(disableMs, 60 * 60_000)) : KEY_DISABLE_MS;
  keyDisabledUntil.set(id, Date.now() + clampedMs);
  logFallbackOnce(
    `disabled:${id}`,
    `[CoinGecko Proxy] ${id} temporarily disabled for ${Math.round(clampedMs / 1000)}s (${reason}).`,
  );
}

function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    const diff = date - Date.now();
    return diff > 0 ? diff : null;
  }
  return null;
}

async function fetchCoinGeckoWithFallback(
  pathString: string,
  searchParams: string,
): Promise<UntypedJson> {
  const apiConfigs = getApiConfigs();
  let lastError: unknown = new Error("CoinGecko upstream unavailable");

  for (let index = 0; index < apiConfigs.length; index += 1) {
    const config = apiConfigs[index];
    const upstreamUrl = `${config.baseUrl}/${pathString}${searchParams ? `?${searchParams}` : ""}`;

    try {
      const response = await fetch(upstreamUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...config.headers,
        },
      });

      if (response.ok) {
        return response.json();
      }

      const body = await response.text();
      const canFallback = index < apiConfigs.length - 1 && shouldFallback(response.status, body);
      if (canFallback) {
        if (response.status === 401 || response.status === 403) {
          disableKeyTemporarily(config.id, KEY_DISABLE_MS, `upstream ${response.status}`);
        }
        if (response.status === 429) {
          const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after")) ?? 30_000;
          disableKeyTemporarily(config.id, retryAfterMs, "upstream 429");
        }
        if (response.status === 400 && isCoingeckoDemoKeyMismatchError(body)) {
          disableKeyTemporarily(config.id, KEY_DISABLE_MS, "upstream demo/pro host mismatch");
        }
        logFallbackOnce(
          `${config.id}:${response.status}`,
          `[CoinGecko Proxy] ${config.id} failed with ${response.status} for ${pathString}. Falling back.`,
        );
        continue;
      }

      lastError = new Error(`CoinGecko ${response.status}: ${body}`);
      break;
    } catch (error) {
      lastError = error;
      const canFallback = index < apiConfigs.length - 1;
      if (canFallback) {
        logFallbackOnce(
          `${config.id}:network`,
          `[CoinGecko Proxy] ${config.id} network failure for ${pathString}. Falling back.`,
        );
        continue;
      }
      break;
    }
  }

  throw lastError;
}

function isUpstreamRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return /CoinGecko 429:/i.test(error.message);
}

function getClientFacingErrorMessage(error: unknown): string {
  if (isUpstreamRateLimitError(error)) {
    return "CoinGecko rate limit exceeded";
  }
  return "CoinGecko upstream unavailable";
}

function getClientFacingErrorStatus(error: unknown): number {
  return isUpstreamRateLimitError(error) ? 429 : 502;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  await connection();
  const { path } = await params;
  const pathString = path.join("/");
  const clientId = getClientIdentifier(request);

  // Rate limiting
  const rateLimit = await checkRateLimit(clientId, RATE_LIMITS.coingecko);
  if (!rateLimit.allowed) {
    return createErrorResponse("Rate limit exceeded", 429, {
      rateLimitRemaining: rateLimit.remaining,
      rateLimitResetAt: rateLimit.resetAt,
    });
  }

  const searchParams = request.nextUrl.searchParams.toString();

  // Cache key includes path and query params
  const cacheKey = `${pathString}:${searchParams}`;
  const cacheTtl = getCacheTtl(pathString);

  try {
    const result = await withProxyCache(cacheKey, { ttlSeconds: cacheTtl, prefix: "coingecko" }, async () =>
      fetchCoinGeckoWithFallback(pathString, searchParams),
    );

    return createProxyResponse(result.data, 200, {
      cacheTtl,
      rateLimitRemaining: rateLimit.remaining,
      fromCache: result.fromCache,
      stale: result.stale,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage }, `[CoinGecko Proxy] Error for ${pathString}`);
    return createErrorResponse(
      getClientFacingErrorMessage(error),
      getClientFacingErrorStatus(error),
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
