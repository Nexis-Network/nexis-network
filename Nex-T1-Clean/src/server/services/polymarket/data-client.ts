/**
 * Polymarket Data API Client
 *
 * Handles user positions, trade history, and analytics.
 * All endpoints are public (queried by address).
 *
 * Base URL: https://data-api.polymarket.com
 */

import { logger } from "@/lib/logger";
import { withRedisCache } from "@/server/services/redis/redis-cache";
import { POLYMARKET_DATA_URL, POLYMARKET_CACHE_TTL } from "./constants";
import type {
  UserPosition,
  UserTrade,
  PositionsPayload,
  TradesPayload,
} from "./types";

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

class DataClient {
  private readonly baseUrl: string;

  constructor(baseUrl = POLYMARKET_DATA_URL) {
    this.baseUrl = baseUrl;
  }

  // ── Primitives ──────────────────────────────────────────────────────────

  private async fetch<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") url.searchParams.set(k, v);
      }
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error(`[polymarket:data] ${res.status} ${path}`, { text });
      throw new Error(`Data API ${res.status}: ${text.slice(0, 200)}`);
    }

    return res.json() as Promise<T>;
  }

  // ── Positions ───────────────────────────────────────────────────────────

  async getPositions(address: string): Promise<UserPosition[]> {
    return this.fetch<UserPosition[]>("/positions", { user: address });
  }

  async getClosedPositions(address: string): Promise<UserPosition[]> {
    return this.fetch<UserPosition[]>("/closed-positions", { user: address });
  }

  // ── Trades ──────────────────────────────────────────────────────────────

  async getTrades(
    address: string,
    params?: { limit?: number; offset?: number; conditionId?: string },
  ): Promise<UserTrade[]> {
    const queryParams: Record<string, string> = { user: address };
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.conditionId) queryParams.conditionId = params.conditionId;

    return this.fetch<UserTrade[]>("/trades", queryParams);
  }

  // ── Cached Convenience Methods (used by AI tools) ───────────────────────

  async getPositionsPayload(address: string): Promise<PositionsPayload> {
    const cacheKey = `poly:data:positions:${address}`;
    return withRedisCache(
      cacheKey,
      async () => {
        const positions = await this.getPositions(address);

        let totalValue = 0;
        let unrealizedPnl = 0;

        for (const p of positions) {
          totalValue += Number(p.currentValue || 0);
          unrealizedPnl += Number(p.unrealizedPnl || 0);
        }

        return {
          positions,
          totalValue: totalValue.toFixed(2),
          unrealizedPnl: unrealizedPnl.toFixed(2),
        };
      },
      POLYMARKET_CACHE_TTL.POSITIONS,
    );
  }

  async getTradesPayload(
    address: string,
    limit = 20,
    conditionId?: string,
  ): Promise<TradesPayload> {
    const cacheKey = `poly:data:trades:${address}:${limit}:${conditionId ?? "all"}`;
    return withRedisCache(
      cacheKey,
      async () => {
        const trades = await this.getTrades(address, { limit, conditionId });
        return {
          trades,
          total: trades.length,
        };
      },
      POLYMARKET_CACHE_TTL.POSITIONS,
    );
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const dataClient = new DataClient();
export { DataClient };
