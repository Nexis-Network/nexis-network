import { NextResponse } from "next/server";

import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { mintCdpJwt } from "@/server/auth/cdp-jwt-bridge";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { apiResponse } from "@/lib/api-platform";
import { redis } from "@/server/services/redis";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/error";

/**
 * POST /api/auth/cdp/token
 *
 * Exchange a valid Supabase session for a short-lived RS256 JWT
 * that CDP Custom Auth can verify via our JWKS endpoint.
 *
 * Flow:
 * 1. Verify Supabase session (cookies / Authorization header)
 * 2. Check Redis cache for existing CDP token
 * 3. If miss, mint new RS256 JWT (sub = supabase user.id)
 * 4. Cache in Redis with TTL slightly shorter than token expiry
 * 5. Return { token } to client
 */

const CDP_TOKEN_CACHE_PREFIX = "cdp:jwt:";
// Cache 30s shorter than token TTL to avoid serving about-to-expire tokens
const CACHE_TTL_BUFFER_SECONDS = 30;

export async function POST(request: Request): Promise<NextResponse> {
  return timeApiRoute("auth_cdp_token", async () => {
    try {
      const { context } = await resolveSupabaseContext(undefined, { request });

      if (!context) {
        return apiResponse.unauthorized("Valid Supabase session required");
      }

      const { userId, email } = context;
      logger.info({ userId }, "cdp_token_mint_start");
      const cacheKey = `${CDP_TOKEN_CACHE_PREFIX}${userId}`;
      const ttlSeconds = Number(process.env.CDP_JWT_TTL_SECONDS ?? 300);
      const cacheTtl = Math.max(ttlSeconds - CACHE_TTL_BUFFER_SECONDS, 60);

      // Try cached token first
      try {
        const cached = await redis.get<string>(cacheKey);
        if (cached) {
          logger.info({ userId }, "cdp_token_mint_success_cached");
          return NextResponse.json(
            { success: true, data: { token: cached } },
            {
              status: 200,
              headers: {
                "Cache-Control": "private, no-store",
              },
            },
          );
        }
      } catch (error) {
        logger.warn(
          {
            userId,
            err: error instanceof Error ? error : undefined,
            errorMessage: getErrorMessage(error, "Cache read error"),
          },
          "cdp_token_cache_read_failed",
        );
      }

      // Mint new RS256 JWT
      const token = await mintCdpJwt(userId, email);

      // Cache fire-and-forget
      redis.setex(cacheKey, cacheTtl, token).catch((error) => {
        logger.warn(
          {
            userId,
            err: error instanceof Error ? error : undefined,
            errorMessage: getErrorMessage(error, "Cache write error"),
          },
          "cdp_token_cache_write_failed",
        );
      });

      logger.info({ userId, cacheTtl }, "cdp_token_mint_success");

      return NextResponse.json(
        { success: true, data: { token } },
        {
          status: 200,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    } catch (error) {
      const message = getErrorMessage(error, "Failed to mint CDP token");
      logger.error(
        {
          err: error instanceof Error ? error : undefined,
          errorMessage: message,
        },
        "cdp_token_mint_fail",
      );

      // Don't leak internal error details
      return apiResponse.error(
        "CDP_TOKEN_ERROR",
        "Failed to generate authentication token",
        500,
      );
    }
  });
}
