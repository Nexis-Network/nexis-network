/**
 * AI Tool: polymarket_orderbook
 *
 * Get real-time orderbook, prices, spreads, midpoints, and price history
 * for Polymarket markets. All operations are public (no auth required).
 *
 * Uses: ClobReadClient for orderbook and pricing data
 */

import {
  createTool,
  createToolSchema,
  stringProp,
  enumProp,
  integerProp,
} from "./create-tool";
import { clobReadClient } from "@/server/services/polymarket/clob-read-client";
import { logger } from "@/lib/logger";
import type {
  OrderbookPayload,
  PriceChartPayload,
} from "@/server/services/polymarket/types";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = createToolSchema(
  {
    action: enumProp(
      "Action to perform",
      ["orderbook", "price", "midpoint", "spread", "price_history"] as const,
    ),
    tokenId: stringProp("Polymarket token ID (outcome token)", { minLength: 1 }),
    side: enumProp("Order side (for price action)", ["BUY", "SELL"] as const),
    startTs: integerProp("Start timestamp in seconds (for price_history)"),
    endTs: integerProp("End timestamp in seconds (for price_history)"),
    fidelity: enumProp(
      "Time interval for price history",
      ["1m", "5m", "15m", "1h", "4h", "1d"] as const,
      "1h",
    ),
  },
  ["action", "tokenId"],
  { additionalProperties: false },
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PolymarketOrderbookInput {
  action: "orderbook" | "price" | "midpoint" | "spread" | "price_history";
  tokenId: string;
  side?: "BUY" | "SELL";
  startTs?: number;
  endTs?: number;
  fidelity?: string;
}

type PolymarketOrderbookOutput =
  | { kind: "polymarket-orderbook"; data: OrderbookPayload }
  | { kind: "polymarket-price-chart"; data: PriceChartPayload }
  | { kind: "polymarket-price-data"; data: { tokenId: string; value: string; type: string } }
  | { error: string };

// ---------------------------------------------------------------------------
// Tool
// ---------------------------------------------------------------------------

export const polymarketOrderbook = createTool<PolymarketOrderbookInput, PolymarketOrderbookOutput>({
  description:
    "Get real-time orderbook, prices, spreads, and midpoints for Polymarket markets. " +
    "Use 'orderbook' for full depth, 'price' for best bid/ask, " +
    "'midpoint' for mid price, 'spread' for bid-ask spread, " +
    "or 'price_history' for historical prices with configurable fidelity.",
  schema,
  execute: async (input) => {
    try {
      switch (input.action) {
        case "orderbook": {
          const data = await clobReadClient.getOrderbookPayload(input.tokenId);
          return { kind: "polymarket-orderbook", data };
        }

        case "price": {
          const side = input.side ?? "BUY";
          const price = await clobReadClient.getPrice(input.tokenId, side);
          return {
            kind: "polymarket-price-data",
            data: { tokenId: input.tokenId, value: price, type: `best_${side.toLowerCase()}` },
          };
        }

        case "midpoint": {
          const mid = await clobReadClient.getMidpoint(input.tokenId);
          return {
            kind: "polymarket-price-data",
            data: { tokenId: input.tokenId, value: mid, type: "midpoint" },
          };
        }

        case "spread": {
          const spread = await clobReadClient.getSpread(input.tokenId);
          return {
            kind: "polymarket-price-data",
            data: { tokenId: input.tokenId, value: spread, type: "spread" },
          };
        }

        case "price_history": {
          const fidelity = input.fidelity ?? "1h";
          const data = await clobReadClient.getPriceChartPayload(
            input.tokenId,
            fidelity,
            input.startTs,
            input.endTs,
          );
          return { kind: "polymarket-price-chart", data };
        }

        default:
          return { error: `Unknown action: ${input.action}` };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      logger.error("[polymarket:orderbook] tool error", { action: input.action, err });
      return { error: `Failed to fetch orderbook data: ${msg}` };
    }
  },
});
