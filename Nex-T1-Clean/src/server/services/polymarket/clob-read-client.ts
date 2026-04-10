/**
 * Polymarket CLOB Read-Only Client
 *
 * Handles public read operations: orderbook, prices, midpoints, spreads,
 * tick sizes, neg risk status, and price history. No auth required.
 *
 * Base URL: https://clob.polymarket.com
 * Source: https://docs.polymarket.com/trading/clients/public
 */

import { logger } from "@/lib/logger";
import { withRedisCache } from "@/server/services/redis/redis-cache";
import { POLYMARKET_CLOB_URL, POLYMARKET_CACHE_TTL } from "./constants";
import type {
  OrderBookSummary,
  BookParams,
  MarketPrice,
  PriceHistoryParams,
  OrderbookPayload,
  PriceChartPayload,
  OrderSide,
} from "./types";
import type { PolymarketTickSize } from "./constants";

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

class ClobReadClient {
  private readonly baseUrl: string;

  constructor(baseUrl = POLYMARKET_CLOB_URL) {
    this.baseUrl = baseUrl;
  }

  // ── Primitives ──────────────────────────────────────────────────────────

  private async fetch<T>(
    path: string,
    params?: Record<string, string>,
    options?: { method?: string; body?: unknown },
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") url.searchParams.set(k, v);
      }
    }

    const init: RequestInit = {
      method: options?.method ?? "GET",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10_000),
    };

    if (options?.body) {
      init.body = JSON.stringify(options.body);
    }

    const res = await fetch(url.toString(), init);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error(`[polymarket:clob-read] ${res.status} ${path}`, { text });
      throw new Error(`CLOB API ${res.status}: ${text.slice(0, 200)}`);
    }

    return res.json() as Promise<T>;
  }

  // ── Server Health ───────────────────────────────────────────────────────

  async getOk(): Promise<boolean> {
    const res = await this.fetch<string>("/ok");
    return res === "OK";
  }

  async getServerTime(): Promise<number> {
    return this.fetch<number>("/time");
  }

  // ── Order Book ──────────────────────────────────────────────────────────

  async getOrderBook(tokenId: string): Promise<OrderBookSummary> {
    return this.fetch<OrderBookSummary>("/book", { token_id: tokenId });
  }

  async getOrderBooks(params: BookParams[]): Promise<OrderBookSummary[]> {
    return this.fetch<OrderBookSummary[]>("/books", undefined, {
      method: "POST",
      body: params,
    });
  }

  // ── Prices ──────────────────────────────────────────────────────────────

  async getMidpoint(tokenId: string): Promise<string> {
    const result = await this.fetch<{ mid: string }>("/midpoint", {
      token_id: tokenId,
    });
    return result.mid;
  }

  async getPrice(tokenId: string, side: OrderSide): Promise<string> {
    const result = await this.fetch<{ price: string }>("/price", {
      token_id: tokenId,
      side,
    });
    return result.price;
  }

  async getSpread(tokenId: string): Promise<string> {
    const result = await this.fetch<{ spread: string }>("/spread", {
      token_id: tokenId,
    });
    return result.spread;
  }

  async getLastTradePrice(tokenId: string): Promise<string> {
    const result = await this.fetch<{ price: string }>("/last-trade-price", {
      token_id: tokenId,
    });
    return result.price;
  }

  // ── Market Metadata ─────────────────────────────────────────────────────

  async getTickSize(tokenId: string): Promise<PolymarketTickSize> {
    const result = await this.fetch<{ minimum_tick_size: string }>(
      `/tick-size/${encodeURIComponent(tokenId)}`,
    );
    return result.minimum_tick_size as PolymarketTickSize;
  }

  async getNegRisk(tokenId: string): Promise<boolean> {
    const result = await this.fetch<{ neg_risk: boolean }>(
      `/neg-risk/${encodeURIComponent(tokenId)}`,
    );
    return result.neg_risk;
  }

  async getFeeRateBps(tokenId: string): Promise<number> {
    const result = await this.fetch<{ fee_rate_bps: string }>(
      `/fee-rate-bps/${encodeURIComponent(tokenId)}`,
    );
    return Number(result.fee_rate_bps);
  }

  // ── Price History ───────────────────────────────────────────────────────

  async getPriceHistory(params: PriceHistoryParams): Promise<MarketPrice[]> {
    const queryParams: Record<string, string> = { market: params.market };
    if (params.startTs) queryParams.startTs = String(params.startTs);
    if (params.endTs) queryParams.endTs = String(params.endTs);
    if (params.fidelity) queryParams.fidelity = String(params.fidelity);

    const result = await this.fetch<{ history: MarketPrice[] }>(
      "/prices-history",
      queryParams,
    );
    return result.history;
  }

  // ── Cached Convenience Methods (used by AI tools) ───────────────────────

  async getOrderbookPayload(tokenId: string): Promise<OrderbookPayload> {
    const cacheKey = `poly:clob:book:${tokenId}`;
    return withRedisCache(
      cacheKey,
      async () => {
        const [book, lastPrice] = await Promise.all([
          this.getOrderBook(tokenId),
          this.getLastTradePrice(tokenId).catch(() => undefined),
        ]);

        const bestBid = book.bids[0]?.price ?? "0";
        const bestAsk = book.asks[0]?.price ?? "0";
        const midpoint =
          bestBid !== "0" && bestAsk !== "0"
            ? String((Number(bestBid) + Number(bestAsk)) / 2)
            : "0";
        const spread =
          bestBid !== "0" && bestAsk !== "0"
            ? String(Number(bestAsk) - Number(bestBid))
            : "0";

        return {
          tokenId,
          market: book.market,
          bids: book.bids,
          asks: book.asks,
          spread,
          midpoint,
          lastPrice,
          hash: book.hash,
          timestamp: book.timestamp,
        };
      },
      POLYMARKET_CACHE_TTL.ORDERBOOK,
    );
  }

  async getPriceChartPayload(
    tokenId: string,
    fidelity = "1h",
    startTs?: number,
    endTs?: number,
  ): Promise<PriceChartPayload> {
    const cacheKey = `poly:clob:prices:${tokenId}:${fidelity}:${startTs ?? ""}:${endTs ?? ""}`;
    return withRedisCache(
      cacheKey,
      async () => {
        const prices = await this.getPriceHistory({
          market: tokenId,
          startTs,
          endTs,
          fidelity: this.fidelityToSeconds(fidelity),
        });

        return { tokenId, prices, fidelity };
      },
      POLYMARKET_CACHE_TTL.PRICE,
    );
  }

  /**
   * Get market parameters needed for order creation: tick size + negRisk.
   */
  async getMarketParams(
    tokenId: string,
  ): Promise<{ tickSize: PolymarketTickSize; negRisk: boolean; feeRateBps: number }> {
    const cacheKey = `poly:clob:params:${tokenId}`;
    return withRedisCache(
      cacheKey,
      async () => {
        const [tickSize, negRisk, feeRateBps] = await Promise.all([
          this.getTickSize(tokenId),
          this.getNegRisk(tokenId),
          this.getFeeRateBps(tokenId),
        ]);
        return { tickSize, negRisk, feeRateBps };
      },
      POLYMARKET_CACHE_TTL.MARKET_DETAIL,
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private fidelityToSeconds(fidelity: string): number {
    const map: Record<string, number> = {
      "1m": 60,
      "5m": 300,
      "15m": 900,
      "30m": 1800,
      "1h": 3600,
      "4h": 14400,
      "1d": 86400,
      "1w": 604800,
    };
    return map[fidelity] ?? 3600;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const clobReadClient = new ClobReadClient();
export { ClobReadClient };
