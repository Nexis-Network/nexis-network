/**
 * Polymarket Gamma API Client
 *
 * Handles market and event discovery. All endpoints are public (no auth).
 * Base URL: https://gamma-api.polymarket.com
 *
 * Source: https://docs.polymarket.com/developers/gamma-markets-api/overview
 */

import { logger } from "@/lib/logger";
import { withRedisCache } from "@/server/services/redis/redis-cache";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import {
  POLYMARKET_GAMMA_URL,
  POLYMARKET_CACHE_TTL,
} from "./constants";
import type {
  GammaEvent,
  GammaMarket,
  GammaSearchParams,
  MarketListPayload,
  MarketDetailPayload,
} from "./types";

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

class GammaClient {
  private readonly baseUrl: string;

  constructor(baseUrl = POLYMARKET_GAMMA_URL) {
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
      logger.error(`[polymarket:gamma] ${res.status} ${path}`, { text });
      throw new Error(`Gamma API ${res.status}: ${text.slice(0, 200)}`);
    }

    return res.json() as Promise<T>;
  }

  // ── Events ──────────────────────────────────────────────────────────────

  async getEvents(params: GammaSearchParams = {}): Promise<GammaEvent[]> {
    const queryParams: Record<string, string> = {};
    if (params.query) queryParams.query = params.query;
    if (params.tag) queryParams.tag = params.tag;
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.offset) queryParams.offset = String(params.offset);
    if (params.closed !== undefined) queryParams.closed = String(params.closed);
    if (params.active !== undefined) queryParams.active = String(params.active);
    if (params.order) queryParams.order = params.order;
    if (params.ascending !== undefined) queryParams.ascending = String(params.ascending);

    return this.fetch<GammaEvent[]>("/events", queryParams);
  }

  async getEvent(eventId: string): Promise<GammaEvent> {
    return this.fetch<GammaEvent>(`/events/${encodeURIComponent(eventId)}`);
  }

  // ── Markets ─────────────────────────────────────────────────────────────

  async getMarkets(params: GammaSearchParams = {}): Promise<GammaMarket[]> {
    const queryParams: Record<string, string> = {};
    if (params.query) queryParams.query = params.query;
    if (params.tag) queryParams.tag = params.tag;
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.offset) queryParams.offset = String(params.offset);
    if (params.closed !== undefined) queryParams.closed = String(params.closed);
    if (params.active !== undefined) queryParams.active = String(params.active);

    return this.fetch<GammaMarket[]>("/markets", queryParams);
  }

  async getMarket(conditionId: string): Promise<GammaMarket> {
    return this.fetch<GammaMarket>(`/markets/${encodeURIComponent(conditionId)}`);
  }

  // ── Search ──────────────────────────────────────────────────────────────

  async search(query: string, limit = 10): Promise<GammaMarket[]> {
    return this.fetch<GammaMarket[]>("/public-search", {
      query,
      limit: String(limit),
    });
  }

  // ── Cached Convenience Methods (used by AI tools) ───────────────────────

  async getTrendingMarkets(limit = 10): Promise<MarketListPayload> {
    const cacheKey = `poly:gamma:trending:${limit}`;
    return withRedisCache(
      cacheKey,
      async () => {
        const events = await this.getEvents({
          active: true,
          closed: false,
          order: "volume",
          ascending: false,
          limit,
        });

        // Persist raw market data to Supabase cache (fire-and-forget)
        const allMarkets = events.flatMap((e) =>
          e.markets.map((m) => ({ event: e, market: m })),
        );
        this.persistToMarketCache(allMarkets).catch(() => {});

        const markets = events.flatMap((e) =>
          e.markets
            .filter((m) => m.active && !m.closed)
            .map((m) => ({
              conditionId: m.conditionId,
              question: m.question,
              slug: m.slug,
              outcomes: m.tokens.map((t) => ({
                name: t.outcome,
                tokenId: t.token_id,
                price: "0", // Prices come from CLOB, not Gamma
              })),
              volume: m.volume,
              liquidity: m.liquidity,
              endDate: m.endDate,
              negRisk: m.negRisk,
              image: m.image,
              tags: e.tags,
            })),
        );

        return {
          markets: markets.slice(0, limit),
          total: markets.length,
          hasMore: markets.length > limit,
        };
      },
      POLYMARKET_CACHE_TTL.MARKETS,
    );
  }

  async searchMarkets(query: string, limit = 10): Promise<MarketListPayload> {
    const cacheKey = `poly:gamma:search:${query}:${limit}`;
    return withRedisCache(
      cacheKey,
      async () => {
        const results = await this.search(query, limit);

        // Persist to Supabase market cache (fire-and-forget)
        const cacheEntries = results.map((m) => ({ event: null, market: m }));
        this.persistToMarketCache(cacheEntries).catch(() => {});

        const markets = results.map((m) => ({
          conditionId: m.conditionId,
          question: m.question,
          slug: m.slug,
          outcomes: m.tokens.map((t) => ({
            name: t.outcome,
            tokenId: t.token_id,
            price: "0",
          })),
          volume: m.volume,
          liquidity: m.liquidity,
          endDate: m.endDate,
          negRisk: m.negRisk,
          image: m.image,
          tags: undefined,
        }));

        return {
          markets,
          total: markets.length,
          hasMore: false,
        };
      },
      POLYMARKET_CACHE_TTL.MARKETS,
    );
  }

  async getMarketDetail(conditionId: string): Promise<MarketDetailPayload> {
    const cacheKey = `poly:gamma:detail:${conditionId}`;
    return withRedisCache(
      cacheKey,
      async () => {
        const market = await this.getMarket(conditionId);

        // Persist to Supabase market cache (fire-and-forget)
        this.persistToMarketCache([{ event: null, market }]).catch(() => {});

        return {
          event: {
            id: "", // Event ID not available from market endpoint
            title: market.question,
            description: "",
            slug: market.slug,
          },
          market: {
            conditionId: market.conditionId,
            question: market.question,
            slug: market.slug,
            active: market.active,
            closed: market.closed,
            negRisk: market.negRisk,
            volume: market.volume,
            liquidity: market.liquidity,
            endDate: market.endDate,
          },
          outcomes: market.tokens.map((t) => ({
            name: t.outcome,
            tokenId: t.token_id,
            price: "0", // Prices come from CLOB
          })),
        };
      },
      POLYMARKET_CACHE_TTL.MARKET_DETAIL,
    );
  }

  // ── Supabase Market Cache Persistence ───────────────────────────────────

  /**
   * Persist market data to the polymarket_market_cache table.
   * This runs as fire-and-forget to avoid blocking the API response.
   * Uses upsert (ON CONFLICT) so stale entries are refreshed.
   */
  private async persistToMarketCache(
    entries: Array<{ event: GammaEvent | null; market: GammaMarket }>,
  ): Promise<void> {
    if (entries.length === 0) return;

    try {
      const adminSupabase = getSupabaseAdminClient();

      const rows = entries.map(({ event, market }) => ({
        condition_id: market.conditionId,
        event_id: event?.id ?? null,
        question: market.question,
        slug: market.slug,
        outcomes: market.tokens.map((t) => t.outcome),
        volume: Number(market.volume) || 0,
        liquidity: Number(market.liquidity) || 0,
        end_date: market.endDate ?? null,
        neg_risk: market.negRisk,
        tokens: market.tokens,
        tags: event?.tags ?? null,
        cached_at: new Date().toISOString(),
      }));

      const { error } = await adminSupabase
        .from("polymarket_market_cache")
        .upsert(rows, { onConflict: "condition_id" });

      if (error) {
        logger.warn("[polymarket:gamma] Failed to persist market cache", { error });
      } else {
        logger.debug("[polymarket:gamma] Persisted %d markets to cache", rows.length);
      }
    } catch (err) {
      logger.warn("[polymarket:gamma] Market cache persistence error", { err });
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const gammaClient = new GammaClient();
export { GammaClient };
