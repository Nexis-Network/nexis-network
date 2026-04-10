/**
 * AI Tool: polymarket_trade
 *
 * Preview orders on Polymarket prediction markets.
 * Live execution and cancellation are blocked in this build.
 *
 * Security:
 * - Geoblock check runs before preview requests
 * - Preview tokens stay short-lived and server-side only
 * - Live execution, cancellation, and order logging are disabled here
 *
 * Uses: GeoblockService, ClobReadClient
 */

import { nanoid } from "nanoid";
import {
  createTool,
  createToolSchema,
  stringProp,
  enumProp,
  numberProp,
} from "./create-tool";
import { clobReadClient } from "@/server/services/polymarket/clob-read-client";
import { geoblockService, GeoblockError } from "@/server/services/polymarket/geoblock-service";
import { logger } from "@/lib/logger";
import type {
  TradePreviewPayload,
  OrderStatusPayload,
  GeoBlockedPayload,
} from "@/server/services/polymarket/types";

// ---------------------------------------------------------------------------
// HITL Approval Token Store (in-memory, short-lived)
// ---------------------------------------------------------------------------

const MAX_APPROVAL_TOKENS = 10_000;
const approvalTokens = new Map<string, { userId: string; preview: TradePreviewPayload; expiresAt: number }>();
const LIVE_TRADING_DISABLED_MESSAGE =
  "Polymarket live execution is disabled in this build. Use preview-only workflows until centralized approval is available.";

function createApprovalToken(userId: string, preview: TradePreviewPayload): string {
  // Evict oldest entry if at capacity to prevent memory exhaustion
  if (approvalTokens.size >= MAX_APPROVAL_TOKENS) {
    const oldestKey = approvalTokens.keys().next().value;
    if (oldestKey) approvalTokens.delete(oldestKey);
  }

  const token = nanoid(32);
  approvalTokens.set(token, {
    userId,
    preview,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });
  return token;
}

// Cleanup expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of approvalTokens) {
    if (val.expiresAt < now) approvalTokens.delete(key);
  }
}, 60_000);

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = createToolSchema(
  {
    action: enumProp(
      "Action to perform",
      ["preview", "execute", "cancel", "cancel_all"] as const,
    ),
    tokenId: stringProp("Polymarket token ID for the outcome to trade"),
    side: enumProp("Order side", ["BUY", "SELL"] as const),
    price: numberProp("Order price (0 to 1 range)", { minimum: 0, maximum: 1 }),
    size: numberProp("Order size (number of shares)", { minimum: 0.01, maximum: 1_000_000 }),
    orderType: enumProp(
      "Order type",
      ["GTC", "GTD", "FOK", "FAK"] as const,
      "GTC",
    ),
    orderId: stringProp("Order ID (for cancel action)"),
    approvalToken: stringProp("HITL approval token (for execute action, obtained from preview)"),
  },
  ["action"],
  { additionalProperties: false },
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PolymarketTradeInput {
  action: "preview" | "execute" | "cancel" | "cancel_all";
  tokenId?: string;
  side?: "BUY" | "SELL";
  price?: number;
  size?: number;
  orderType?: "GTC" | "GTD" | "FOK" | "FAK";
  orderId?: string;
  approvalToken?: string;
}

type PolymarketTradeOutput =
  | { kind: "polymarket-trade-preview"; data: TradePreviewPayload }
  | { kind: "polymarket-order-status"; data: OrderStatusPayload }
  | { kind: "polymarket-blocked"; data: GeoBlockedPayload }
  | { error: string };

function buildBlockedTradeOutput(action: PolymarketTradeInput["action"]): PolymarketTradeOutput {
  return {
    kind: "polymarket-blocked",
    data: {
      blocked: true,
      closeOnly: false,
      country: "disabled",
      reason:
        action === "cancel" || action === "cancel_all"
          ? "Order cancellation is disabled in this build."
          : LIVE_TRADING_DISABLED_MESSAGE,
    },
  };
}

// ---------------------------------------------------------------------------
// Tool
// ---------------------------------------------------------------------------

export const polymarketTrade = createTool<PolymarketTradeInput, PolymarketTradeOutput>({
  description:
    "Preview Polymarket orders and return approval tokens for read-only review. " +
    "Live execution, cancellation, and cancel-all operations are disabled in this build. " +
    "Trading requires centralized approval before any future execution path can be re-enabled. " +
    "Automatically checks geographic eligibility for preview requests.",
  schema,
  execute: async (input, context) => {
    const userId = context?.userId;
    if (!userId) {
      return { error: "Authentication required for trading operations." };
    }

    try {
      // Geoblock check for preview requests only. Live execution paths are blocked below.
      if (input.action === "preview") {
        try {
          const geoStatus = await geoblockService.enforce();

          // Handle close-only status
          if (geoStatus.closeOnly && input.side === "BUY") {
            return {
              kind: "polymarket-blocked",
              data: {
                blocked: false,
                closeOnly: true,
                country: geoStatus.country,
                reason:
                  "Your region is in close-only mode. You can sell existing positions " +
                  "and cancel orders, but cannot open new positions.",
              },
            };
          }
        } catch (err) {
          if (err instanceof GeoblockError) {
            return {
              kind: "polymarket-blocked",
              data: {
                blocked: true,
                closeOnly: false,
                country: err.status.country,
                reason: err.message,
              },
            };
          }
          throw err;
        }
      }

      switch (input.action) {
        case "preview": {
          if (!input.tokenId || !input.side || input.price === undefined || !input.size) {
            return {
              error: "tokenId, side, price, and size are required for order preview.",
            };
          }

          // Fetch market parameters
          const params = await clobReadClient.getMarketParams(input.tokenId);

          // Validate price against tick size
          const tickSize = Number(params.tickSize);
          const priceSteps = Math.round(input.price / tickSize);
          const normalizedPrice = priceSteps * tickSize;

          if (Math.abs(normalizedPrice - input.price) > Number.EPSILON) {
            return {
              error: `Price ${input.price} does not conform to tick size ${params.tickSize}. ` +
                `Nearest valid price: ${normalizedPrice}`,
            };
          }

          // Calculate estimates
          const cost = input.side === "BUY"
            ? (input.price * input.size).toFixed(6)
            : "0";
          const feeRate = params.feeRateBps / 10000;
          const fees = (Number(cost) * feeRate).toFixed(6);
          const total = (Number(cost) + Number(fees)).toFixed(6);
          const potentialPayout = input.side === "BUY"
            ? ((1 - input.price) * input.size).toFixed(6)
            : (input.price * input.size).toFixed(6);

          // Build the preview object first, then create the approval token
          // atomically with the full preview (avoids storing an empty placeholder)
          const previewData: Omit<TradePreviewPayload, "approvalToken"> = {
            market: {
              conditionId: "",
              question: "",
            },
            order: {
              tokenId: input.tokenId,
              side: input.side,
              price: normalizedPrice,
              size: input.size,
              orderType: (input.orderType ?? "GTC") as TradePreviewPayload["order"]["orderType"],
              tickSize: params.tickSize,
              negRisk: params.negRisk,
            },
            estimate: {
              cost,
              fees,
              total,
              potentialPayout,
            },
          };

          const preview: TradePreviewPayload = {
            ...previewData,
            approvalToken: "",
          };
          preview.approvalToken = createApprovalToken(userId, preview);

          return { kind: "polymarket-trade-preview", data: preview };
        }

        case "execute":
          return buildBlockedTradeOutput(input.action);

        case "cancel": {
          return buildBlockedTradeOutput(input.action);
        }

        case "cancel_all":
          return buildBlockedTradeOutput(input.action);

        default:
          return { error: `Unknown action: ${input.action}` };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      logger.error("[polymarket:trade] tool error", { action: input.action, err });
      return { error: `Trade operation failed: ${msg}` };
    }
  },
});
