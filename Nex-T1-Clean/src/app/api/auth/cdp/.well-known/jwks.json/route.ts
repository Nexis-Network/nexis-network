import { NextResponse } from "next/server";

import { getCdpJwks } from "@/server/auth/cdp-jwt-bridge";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/error";

/**
 * GET /api/auth/cdp/.well-known/jwks.json
 *
 * Serve the RSA public key(s) as a standard JWK Set.
 * CDP's servers fetch this endpoint to verify the RS256 JWTs
 * we issue in the /api/auth/cdp/token route.
 *
 * - Public endpoint (no auth required)
 * - CORS: allow any origin (CDP servers need access)
 * - Cache: 1 hour CDN + stale-while-revalidate
 */

const CACHE_MAX_AGE = 3600; // 1 hour
const STALE_WHILE_REVALIDATE = 86400; // 24 hours

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET(): Promise<NextResponse> {
  try {
    logger.info({}, "cdp_jwks_serve_start");
    const jwks = await getCdpJwks();

    logger.info({ keyCount: Array.isArray(jwks.keys) ? jwks.keys.length : 0 }, "cdp_jwks_serve_success");

    return NextResponse.json(jwks, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    logger.error(
      {
        err: error instanceof Error ? error : undefined,
        errorMessage: getErrorMessage(error, "Failed to serve JWKS"),
      },
      "cdp_jwks_serve_fail",
    );

    return NextResponse.json(
      { error: "JWKS unavailable" },
      {
        status: 503,
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "no-store",
        },
      },
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
