/**
 * AI Tool: polymarket_bridge
 *
 * Check deposit addresses, supported assets, and transaction status
 * for the Polymarket bridge (USDC deposits/withdrawals).
 *
 * Uses: BridgeClient for bridge operations
 */

import {
  createTool,
  createToolSchema,
  stringProp,
  enumProp,
} from "./create-tool";
import { bridgeClient } from "@/server/services/polymarket/bridge-client";
import { logger } from "@/lib/logger";
import type {
  BridgeStatusPayload,
  DepositInfoPayload,
} from "@/server/services/polymarket/types";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = createToolSchema(
  {
    action: enumProp(
      "Action to perform",
      ["deposit_address", "supported_assets", "status"] as const,
    ),
    address: stringProp("Polymarket wallet address (for deposit_address action)"),
    depositAddress: stringProp("Deposit address to check status for (from deposit_address response)"),
  },
  ["action"],
  { additionalProperties: false },
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PolymarketBridgeInput {
  action: "deposit_address" | "supported_assets" | "status";
  address?: string;
  depositAddress?: string;
}

type PolymarketBridgeOutput =
  | { kind: "polymarket-deposit-info"; data: DepositInfoPayload }
  | { kind: "polymarket-bridge-status"; data: BridgeStatusPayload }
  | { kind: "polymarket-supported-assets"; data: { assets: Array<{ symbol: string; chainId: string; minimumDeposit: string }> } }
  | { error: string };

// ---------------------------------------------------------------------------
// Tool
// ---------------------------------------------------------------------------

export const polymarketBridge = createTool<PolymarketBridgeInput, PolymarketBridgeOutput>({
  description:
    "Check deposit addresses, supported assets, and transaction status for " +
    "the Polymarket bridge. Use 'deposit_address' to generate deposit addresses " +
    "for your Polymarket wallet, 'supported_assets' to see what tokens can be deposited, " +
    "or 'status' to track a pending deposit.",
  schema,
  execute: async (input) => {
    try {
      switch (input.action) {
        case "deposit_address": {
          if (!input.address) {
            return { error: "A wallet address is required for the 'deposit_address' action." };
          }
          const data = await bridgeClient.getDepositInfoPayload(input.address);
          return { kind: "polymarket-deposit-info", data };
        }

        case "supported_assets": {
          const assets = await bridgeClient.getSupportedAssets();
          return {
            kind: "polymarket-supported-assets",
            data: {
              assets: assets.map((a) => ({
                symbol: a.symbol,
                chainId: a.chainId,
                minimumDeposit: a.minimumDeposit,
              })),
            },
          };
        }

        case "status": {
          if (!input.depositAddress) {
            return {
              error: "A depositAddress is required for the 'status' action. " +
                "Use the address returned by 'deposit_address', not your wallet address.",
            };
          }
          const data = await bridgeClient.getBridgeStatusPayload(input.depositAddress);
          return { kind: "polymarket-bridge-status", data };
        }

        default:
          return { error: `Unknown action: ${input.action}` };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      logger.error("[polymarket:bridge] tool error", { action: input.action, err });
      return { error: `Bridge operation failed: ${msg}` };
    }
  },
});
