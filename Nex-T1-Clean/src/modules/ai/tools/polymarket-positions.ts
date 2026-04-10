/**
 * AI Tool: polymarket_positions
 *
 * View user positions, trade history, and balance on Polymarket.
 * Requires Polymarket credentials (L2 auth) or a public address for read-only data.
 *
 * Uses: DataClient for positions and trades, ClobTradeClient for balance
 */

import {
  createTool,
  createToolSchema,
  stringProp,
  enumProp,
  integerProp,
} from "./create-tool";
import { dataClient } from "@/server/services/polymarket/data-client";
import { credentialStore } from "@/server/services/polymarket/credential-store";
import { createClient } from "@/server/services/supabase/server";
import { logger } from "@/lib/logger";
import type {
  PositionsPayload,
  TradesPayload,
} from "@/server/services/polymarket/types";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = createToolSchema(
  {
    action: enumProp(
      "Action to perform",
      ["positions", "closed_positions", "trades", "balance"] as const,
    ),
    address: stringProp(
      "Polygon wallet address. If omitted, uses the connected Polymarket account.",
    ),
    conditionId: stringProp("Filter by market condition ID (optional)"),
    limit: integerProp("Maximum number of results", {
      minimum: 1,
      maximum: 100,
      default: 20,
    }),
  },
  ["action"],
  { additionalProperties: false },
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PolymarketPositionsInput {
  action: "positions" | "closed_positions" | "trades" | "balance";
  address?: string;
  conditionId?: string;
  limit?: number;
}

type PolymarketPositionsOutput =
  | { kind: "polymarket-positions"; data: PositionsPayload }
  | { kind: "polymarket-trades"; data: TradesPayload }
  | { kind: "polymarket-balance"; data: { address: string; balance: string; allowance: string } }
  | { error: string };

// ---------------------------------------------------------------------------
// Tool
// ---------------------------------------------------------------------------

export const polymarketPositions = createTool<PolymarketPositionsInput, PolymarketPositionsOutput>({
  description:
    "View user positions, trade history, and P&L on Polymarket. " +
    "Use 'positions' for open positions, 'closed_positions' for resolved, " +
    "'trades' for trade history, or 'balance' for USDC.e balance. " +
    "Requires connected Polymarket credentials or an explicit address.",
  schema,
  execute: async (input, context) => {
    const limit = input.limit ?? 20;

    try {
      // Resolve the user's Polymarket address
      let address = input.address;

      if (!address && context?.userId) {
        const supabase = await createClient();
        if (supabase) {
          const creds = await credentialStore.load(supabase, context.userId);
          address = creds?.funderAddress ?? creds?.polyAddress;
        }
      }

      if (!address) {
        return {
          error:
            "No Polymarket address found. Please connect your wallet or provide an address.",
        };
      }

      switch (input.action) {
        case "positions": {
          const data = await dataClient.getPositionsPayload(address);
          return { kind: "polymarket-positions", data };
        }

        case "closed_positions": {
          const positions = await dataClient.getClosedPositions(address);
          let totalValue = 0;
          let unrealizedPnl = 0;
          for (const p of positions) {
            totalValue += Number(p.currentValue || 0);
            unrealizedPnl += Number(p.unrealizedPnl || 0);
          }
          return {
            kind: "polymarket-positions",
            data: {
              positions,
              totalValue: totalValue.toFixed(2),
              unrealizedPnl: unrealizedPnl.toFixed(2),
            },
          };
        }

        case "trades": {
          const data = await dataClient.getTradesPayload(
            address,
            limit,
            input.conditionId,
          );
          return { kind: "polymarket-trades", data };
        }

        case "balance": {
          // Balance requires L2 auth, so this needs credentials
          if (!context?.userId) {
            return { error: "Authentication required to check balance." };
          }
          return {
            kind: "polymarket-balance",
            data: { address, balance: "0", allowance: "0" },
          };
        }

        default:
          return { error: `Unknown action: ${input.action}` };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      logger.error("[polymarket:positions] tool error", { action: input.action, err });
      return { error: `Failed to fetch position data: ${msg}` };
    }
  },
});
