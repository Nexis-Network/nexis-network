/**
 * Polymarket Geoblock Service
 *
 * Checks geographic eligibility before any trading action.
 * Endpoint: GET https://polymarket.com/api/geoblock
 *
 * Returns { blocked, ip, country, region }
 *
 * Source: https://docs.polymarket.com/api-reference/geoblock
 */

import { logger } from "@/lib/logger";
import { withRedisCache } from "@/server/services/redis/redis-cache";
import {
  POLYMARKET_GEOBLOCK_URL,
  POLYMARKET_CACHE_TTL,
  POLYMARKET_CLOSE_ONLY_COUNTRIES,
} from "./constants";
import type { GeoblockResponse, GeoblockStatus } from "./types";

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class GeoblockService {
  /**
   * Check if the requesting user is geoblocked from trading on Polymarket.
   *
   * The geoblock endpoint is on polymarket.com (not the API servers).
   * We forward the user's IP via X-Forwarded-For to get an accurate result.
   *
   * Results are cached per IP for 5 minutes to avoid hammering the endpoint.
   */
  async check(clientIp?: string): Promise<GeoblockStatus> {
    const cacheKey = `poly:geoblock:${clientIp ?? "unknown"}`;

    // Only cache successful responses. On errors, throw from the callback so
    // withRedisCache does NOT cache the result, then catch below to return a
    // fail-closed response. This prevents a transient blip from blocking an
    // IP for the entire cache TTL.
    try {
      return await withRedisCache(
        cacheKey,
        async () => {
          const headers: Record<string, string> = {
            Accept: "application/json",
          };

          if (clientIp) {
            headers["X-Forwarded-For"] = clientIp;
          }

          const res = await fetch(POLYMARKET_GEOBLOCK_URL, {
            method: "GET",
            headers,
            signal: AbortSignal.timeout(5_000),
          });

          if (!res.ok) {
            // Throw to prevent caching the error response
            throw new Error(`Geoblock endpoint returned ${res.status}`);
          }

          const data: GeoblockResponse = await res.json();

          const closeOnly = POLYMARKET_CLOSE_ONLY_COUNTRIES.includes(
            data.country as (typeof POLYMARKET_CLOSE_ONLY_COUNTRIES)[number],
          );

          return {
            blocked: data.blocked,
            closeOnly,
            country: data.country,
            region: data.region,
          };
        },
        POLYMARKET_CACHE_TTL.GEOBLOCK,
      );
    } catch (error) {
      logger.error("[polymarket:geoblock] check failed — failing closed", error);
      // Fail CLOSED: deny trading when geoblock check cannot complete.
      // NOT cached — next request will retry the check.
      return {
        blocked: true,
        closeOnly: false,
        country: "unknown",
        region: "unknown",
      };
    }
  }

  /**
   * Enforce geoblock: throws if the user is blocked from trading.
   * For close-only regions, returns the status so the caller can
   * decide whether to allow cancels/sells.
   */
  async enforce(clientIp?: string): Promise<GeoblockStatus> {
    const status = await this.check(clientIp);

    if (status.blocked) {
      throw new GeoblockError(
        `Trading is not available in your region (${status.country}).`,
        status,
      );
    }

    return status;
  }
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class GeoblockError extends Error {
  readonly status: GeoblockStatus;

  constructor(message: string, status: GeoblockStatus) {
    super(message);
    this.name = "GeoblockError";
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const geoblockService = new GeoblockService();
export { GeoblockService };
