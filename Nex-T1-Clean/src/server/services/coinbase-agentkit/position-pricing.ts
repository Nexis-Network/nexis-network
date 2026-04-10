import "server-only";

import { logger } from "@/lib/logger";
import {
  getCoinPricesByIds,
  getTokenPricesByContracts,
} from "@/server/market/coingecko";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";

import {
  listCoinbaseAgentKitPositions,
  type CoinbaseAgentKitPositionRecord,
} from "./repository";

const POSITION_PRICE_STALE_MS =
  Number(process.env.COINBASE_AGENTKIT_POSITION_PRICE_STALE_MS ?? 300_000);

const CHAIN_TO_PLATFORM: Record<number, string> = {
  1: "ethereum",
  8453: "base",
  84532: "base",
  42161: "arbitrum-one",
  10: "optimistic-ethereum",
  137: "polygon-pos",
};

function toFiniteNumber(value: string | number | null | undefined): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function isStale(updatedAt: string, nowMs: number): boolean {
  const updatedAtMs = Date.parse(updatedAt);
  return !Number.isFinite(updatedAtMs) || nowMs - updatedAtMs >= POSITION_PRICE_STALE_MS;
}

function shouldRefresh(position: CoinbaseAgentKitPositionRecord, nowMs: number): boolean {
  return (
    position.status === "open" &&
    Boolean(position.token_address) &&
    toFiniteNumber(position.size) !== null &&
    toFiniteNumber(position.entry_price_usd) !== null &&
    isStale(position.updated_at, nowMs)
  );
}

function isPriceUpdate(
  value: {
    id: string;
    current_price_usd: string;
    pnl_usd: string;
    pnl_percent: string;
    updated_at: string;
  } | null,
): value is {
  id: string;
  current_price_usd: string;
  pnl_usd: string;
  pnl_percent: string;
  updated_at: string;
} {
  return value !== null;
}

export async function listFreshCoinbaseAgentKitPositions(
  userId: string,
): Promise<CoinbaseAgentKitPositionRecord[]> {
  const positions = await listCoinbaseAgentKitPositions(userId);
  const nowMs = Date.now();
  const stalePositions = positions.filter((position) => shouldRefresh(position, nowMs));

  if (stalePositions.length === 0) {
    return positions;
  }

  const updatedAt = new Date(nowMs).toISOString();
  const updates = await Promise.all(
    stalePositions.map(async (position) => {
      try {
        const chainId = position.chain_id ?? 8453;
        const platform = CHAIN_TO_PLATFORM[chainId];
        if (!platform || !position.token_address) {
          return null;
        }

        const [nativePrice, tokenPrices] = await Promise.all([
          getCoinPricesByIds(["ethereum"]),
          getTokenPricesByContracts(platform, [position.token_address]),
        ]);

        const price =
          tokenPrices[position.token_address.toLowerCase()]?.usd ??
          nativePrice.ethereum?.usd ??
          null;
        const size = toFiniteNumber(position.size);
        const entry = toFiniteNumber(position.entry_price_usd);

        if (!price || size === null || entry === null) {
          return null;
        }

        const pnlUsd = (price - entry) * size;
        const pnlPercent = entry > 0 ? ((price - entry) / entry) * 100 : 0;

        return {
          id: position.id,
          current_price_usd: price.toFixed(8),
          pnl_usd: pnlUsd.toFixed(8),
          pnl_percent: pnlPercent.toFixed(4),
          updated_at: updatedAt,
        };
      } catch {
        return null;
      }
    }),
  );

  const validUpdates = updates.filter(isPriceUpdate);
  if (validUpdates.length === 0) {
    return positions;
  }

  try {
    const client = createServiceRoleClient();
    await Promise.all(
      validUpdates.map((update) =>
        client
          .from("coinbase_agentkit_positions")
          .update({
            current_price_usd: update.current_price_usd,
            pnl_usd: update.pnl_usd,
            pnl_percent: update.pnl_percent,
            updated_at: update.updated_at,
          })
          .eq("id", update.id),
      ),
    );
  } catch (error) {
    logger.warn(
      {
        domain: "coinbase_agentkit_position_pricing",
        operation: "persist_updates",
        userId,
        error: error instanceof Error ? error.message : String(error),
      },
      "failed to persist Coinbase AgentKit position price refresh",
    );
  }

  const updatesById = new Map(validUpdates.map((update) => [update.id, update]));
  return positions.map((position) => {
    const update = updatesById.get(position.id);
    if (!update) {
      return position;
    }
    return {
      ...position,
      current_price_usd: update.current_price_usd,
      pnl_usd: update.pnl_usd,
      pnl_percent: update.pnl_percent,
      updated_at: update.updated_at,
    };
  });
}
