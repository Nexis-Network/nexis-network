/**
 * AI Tool: polymarket_markets
 *
 * Search, browse, and get details on Polymarket prediction markets.
 * All operations are public (no auth required).
 *
 * Uses: GammaClient for market/event discovery
 */

import {
  createTool,
  createToolSchema,
  stringProp,
  enumProp,
  integerProp,
} from "./create-tool";
import { gammaClient } from "@/server/services/polymarket/gamma-client";
import { clobReadClient } from "@/server/services/polymarket/clob-read-client";
import { logger } from "@/lib/logger";
import type { MarketListPayload, MarketDetailPayload } from "@/server/services/polymarket/types";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = createToolSchema(
  {
    action: enumProp(
      "Action to perform",
      ["search", "trending", "get_event", "get_market"] as const,
    ),
    query: stringProp("Search query for market discovery", { minLength: 1 }),
    eventId: stringProp("Event ID (for get_event action)"),
    conditionId: stringProp("Market condition ID (for get_market action)"),
    tag: stringProp("Filter by tag (e.g., 'politics', 'sports', 'crypto')"),
    limit: integerProp("Maximum number of results to return", {
      minimum: 1,
      maximum: 50,
      default: 10,
    }),
  },
  ["action"],
  { additionalProperties: false },
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PolymarketMarketsInput {
  action: "search" | "trending" | "get_event" | "get_market";
  query?: string;
  eventId?: string;
  conditionId?: string;
  tag?: string;
  limit?: number;
}

type PolymarketMarketsOutput =
  | { kind: "polymarket-markets"; data: MarketListPayload }
  | { kind: "polymarket-market-detail"; data: MarketDetailPayload }
  | { error: string };

// ---------------------------------------------------------------------------
// Tool
// ---------------------------------------------------------------------------

export const polymarketMarkets = createTool<PolymarketMarketsInput, PolymarketMarketsOutput>({
  description:
    "Search, browse, and get details on Polymarket prediction markets and events. " +
    "Use 'trending' for popular markets, 'search' for keyword search, " +
    "'get_event' for event details, 'get_market' for a specific market. " +
    "Returns market data including question, outcomes, volume, and liquidity.",
  schema,
  execute: async (input) => {
    const limit = input.limit ?? 10;

    try {
      switch (input.action) {
        case "search": {
          if (!input.query) {
            return { error: "A search query is required for the 'search' action." };
          }
          const result = await gammaClient.searchMarkets(input.query, limit);

          // Enrich with live prices from CLOB for the first few markets
          await enrichWithPrices(result, 5);

          return { kind: "polymarket-markets", data: result };
        }

        case "trending": {
          const result = await gammaClient.getTrendingMarkets(limit);
          await enrichWithPrices(result, 5);
          return { kind: "polymarket-markets", data: result };
        }

        case "get_event": {
          if (!input.eventId) {
            return { error: "An eventId is required for the 'get_event' action." };
          }
          const event = await gammaClient.getEvent(input.eventId);
          if (!event.markets.length) {
            return { error: `No markets found for event ${input.eventId}` };
          }

          const market = event.markets[0];
          const detail: MarketDetailPayload = {
            event: {
              id: event.id,
              title: event.title,
              description: event.description,
              slug: event.slug,
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
              price: "0",
            })),
          };

          // Enrich outcomes with live prices
          for (const outcome of detail.outcomes) {
            try {
              outcome.midpoint = await clobReadClient.getMidpoint(outcome.tokenId);
              outcome.price = outcome.midpoint;
            } catch {
              // Price unavailable, leave as "0"
            }
          }

          return { kind: "polymarket-market-detail", data: detail };
        }

        case "get_market": {
          if (!input.conditionId) {
            return { error: "A conditionId is required for the 'get_market' action." };
          }
          const detail = await gammaClient.getMarketDetail(input.conditionId);

          // Enrich with live prices
          for (const outcome of detail.outcomes) {
            try {
              outcome.midpoint = await clobReadClient.getMidpoint(outcome.tokenId);
              outcome.price = outcome.midpoint;
            } catch {
              // Price unavailable
            }
          }

          return { kind: "polymarket-market-detail", data: detail };
        }

        default:
          return { error: `Unknown action: ${input.action}` };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      logger.error("[polymarket:markets] tool error", { action: input.action, err });
      return { error: `Failed to fetch markets: ${msg}` };
    }
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Enrich market list with live midpoint prices from CLOB.
 * Only enriches the first N markets to avoid rate limit issues.
 */
async function enrichWithPrices(
  payload: MarketListPayload,
  maxMarkets: number,
): Promise<void> {
  const marketsToEnrich = payload.markets.slice(0, maxMarkets);

  await Promise.allSettled(
    marketsToEnrich.flatMap((market) =>
      market.outcomes.map(async (outcome) => {
        try {
          const midpoint = await clobReadClient.getMidpoint(outcome.tokenId);
          outcome.price = midpoint;
        } catch {
          // Price unavailable, leave as "0"
        }
      }),
    ),
  );
}
