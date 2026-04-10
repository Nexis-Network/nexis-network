/**
 * Jupiter API Proxy Route
 * Proxies requests to https://quote-api.jup.ag with:
 * - Rate limiting (200 req/min per IP)
 * - Response caching with short TTL for quotes
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

import { logger } from '@/lib/logger';
const JUPITER_BASE = "https://quote-api.jup.ag/v6";

// Cache TTL by endpoint pattern (seconds)
const CACHE_TTLS: Record<string, number> = {
  "quote": 10,                // 10 sec - quotes change frequently
  "tokens": 3600,             // 1 hour - token list is stable
  "price": 15,                // 15 sec
  "default": 30,              // 30 sec default
};

function getCacheTtl(path: string): number {
  for (const [pattern, ttl] of Object.entries(CACHE_TTLS)) {
    if (path.includes(pattern)) return ttl;
  }
  return CACHE_TTLS.default;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  await connection();
  const { path } = await params;
  const pathString = path.join("/");
  const clientId = getClientIdentifier(request);

  // Rate limiting
  const rateLimit = await checkRateLimit(clientId, RATE_LIMITS.jupiter);
  if (!rateLimit.allowed) {
    return createErrorResponse("Rate limit exceeded", 429, {
      rateLimitRemaining: rateLimit.remaining,
      rateLimitResetAt: rateLimit.resetAt,
    });
  }

  // Build upstream URL with query params
  const searchParams = request.nextUrl.searchParams.toString();
  const upstreamUrl = `${JUPITER_BASE}/${pathString}${searchParams ? `?${searchParams}` : ""}`;

  // Cache key includes path and query params
  const cacheKey = `${pathString}:${searchParams}`;
  const cacheTtl = getCacheTtl(pathString);

  try {
    const result = await withProxyCache(
      cacheKey,
      { ttlSeconds: cacheTtl, prefix: "jupiter" },
      async () => {
        const response = await fetch(upstreamUrl, {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Jupiter ${response.status}: ${text}`);
        }

        return response.json();
      }
    );

    return createProxyResponse(result.data, 200, {
      cacheTtl,
      rateLimitRemaining: rateLimit.remaining,
      fromCache: result.fromCache,
      stale: result.stale,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy error";
    logger.error(`[Jupiter Proxy] Error for ${pathString}:`, error);
    return createErrorResponse(message, 502);
  }
}

// Jupiter swap endpoint requires POST
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join("/");
  const clientId = getClientIdentifier(request);

  // Rate limiting
  const rateLimit = await checkRateLimit(clientId, RATE_LIMITS.jupiter);
  if (!rateLimit.allowed) {
    return createErrorResponse("Rate limit exceeded", 429, {
      rateLimitRemaining: rateLimit.remaining,
      rateLimitResetAt: rateLimit.resetAt,
    });
  }

  const upstreamUrl = `${JUPITER_BASE}/${pathString}`;

  try {
    const body = await request.json();
    
    const response = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Jupiter ${response.status}: ${text}`);
    }

    const data = await response.json();
    
    return createProxyResponse(data, 200, {
      rateLimitRemaining: rateLimit.remaining,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy error";
    logger.error(`[Jupiter Proxy] POST Error for ${pathString}:`, error);
    return createErrorResponse(message, 502);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
