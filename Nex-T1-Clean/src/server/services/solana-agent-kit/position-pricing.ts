import "server-only";

import { logger } from "@/lib/logger";
import {
  getCoinPricesByIds,
  getTokenPricesByContracts,
} from "@/server/market/coingecko";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";

import {
  listSolanaAgentKitPositions,
  type SolanaAgentKitPositionRecord,
} from "./repository";

const POSITION_PRICE_STALE_MS =
  Number(process.env.SOLANA_AGENTKIT_POSITION_PRICE_STALE_MS ?? 300_000);
const NATIVE_SOL_POSITION_IDS = new Set(["native-sol", "sol", "solana"]);

type PositionPriceUpdate = {
  id: string;
  current_price_usd: string;
  pnl_usd: string;
  pnl_percent: string;
  updated_at: string;
};

function toFiniteNumber(value: string | number | null | undefined): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function isStale(updatedAt: string, nowMs: number): boolean {
  const updatedAtMs = Date.parse(updatedAt);
  if (!Number.isFinite(updatedAtMs)) {
    return true;
  }

  return nowMs - updatedAtMs >= POSITION_PRICE_STALE_MS;
}

function isNativeSolPosition(position: SolanaAgentKitPositionRecord): boolean {
  const tokenMint = position.token_mint?.trim().toLowerCase();
  const symbol = position.symbol?.trim().toLowerCase();
  return (
    (tokenMint ? NATIVE_SOL_POSITION_IDS.has(tokenMint) : false) ||
    symbol === "sol"
  );
}

function shouldRefreshPosition(
  position: SolanaAgentKitPositionRecord,
  nowMs: number,
): boolean {
  if (position.status !== "open" || !isStale(position.updated_at, nowMs)) {
    return false;
  }

  return (
    toFiniteNumber(position.size) !== null &&
    toFiniteNumber(position.entry_price_usd) !== null &&
    Boolean(position.token_mint || isNativeSolPosition(position))
  );
}

function buildPositionUpdate(
  position: SolanaAgentKitPositionRecord,
  currentPriceUsd: number,
  updatedAt: string,
): PositionPriceUpdate | null {
  const size = toFiniteNumber(position.size);
  const entryPriceUsd = toFiniteNumber(position.entry_price_usd);

  if (size === null || entryPriceUsd === null) {
    return null;
  }

  const pnlUsd = (currentPriceUsd - entryPriceUsd) * size;
  const pnlPercent =
    entryPriceUsd > 0 ? ((currentPriceUsd - entryPriceUsd) / entryPriceUsd) * 100 : 0;

  return {
    id: position.id,
    current_price_usd: currentPriceUsd.toFixed(8),
    pnl_usd: pnlUsd.toFixed(8),
    pnl_percent: pnlPercent.toFixed(4),
    updated_at: updatedAt,
  };
}

async function persistPositionUpdates(updates: PositionPriceUpdate[]): Promise<void> {
  if (updates.length === 0) {
    return;
  }

  const client = createServiceRoleClient();
  await Promise.allSettled(
    updates.map((update) =>
      client
        .from("solana_agentkit_positions")
        .update({
          current_price_usd: update.current_price_usd,
          pnl_usd: update.pnl_usd,
          pnl_percent: update.pnl_percent,
          updated_at: update.updated_at,
        })
        .eq("id", update.id),
    ),
  );
}

function mergeUpdates(
  positions: SolanaAgentKitPositionRecord[],
  updates: PositionPriceUpdate[],
): SolanaAgentKitPositionRecord[] {
  const updatesById = new Map(updates.map((update) => [update.id, update]));

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

export async function listFreshSolanaAgentKitPositions(
  userId: string,
): Promise<SolanaAgentKitPositionRecord[]> {
  const positions = await listSolanaAgentKitPositions(userId);
  const nowMs = Date.now();
  const stalePositions = positions.filter((position) =>
    shouldRefreshPosition(position, nowMs),
  );

  if (stalePositions.length === 0) {
    return positions;
  }

  const nativeSolRequired = stalePositions.some((position) =>
    isNativeSolPosition(position),
  );
  const tokenMints = stalePositions
    .filter((position) => !isNativeSolPosition(position))
    .map((position) => position.token_mint?.trim().toLowerCase() ?? "")
    .filter(Boolean);

  try {
    const [nativePrices, tokenPrices] = await Promise.all([
      nativeSolRequired
        ? getCoinPricesByIds(["solana"])
        : Promise.resolve(
            {} as Record<string, { usd?: number; usd_24h_change?: number }>,
          ),
      tokenMints.length > 0
        ? getTokenPricesByContracts("solana", tokenMints)
        : Promise.resolve(
            {} as Record<string, { usd?: number; usd_24h_change?: number }>,
          ),
    ]);

    const updatedAt = new Date(nowMs).toISOString();
    const updates = stalePositions
      .map((position) => {
        const currentPriceUsd = isNativeSolPosition(position)
          ? nativePrices.solana?.usd ?? null
          : tokenPrices[position.token_mint?.trim().toLowerCase() ?? ""]?.usd ??
            null;

        return currentPriceUsd && Number.isFinite(currentPriceUsd)
          ? buildPositionUpdate(position, currentPriceUsd, updatedAt)
          : null;
      })
      .filter((update): update is PositionPriceUpdate => Boolean(update));

    await persistPositionUpdates(updates);
    return mergeUpdates(positions, updates);
  } catch (error) {
    logger.warn(
      {
        domain: "solana_agentkit_position_pricing",
        operation: "refresh_positions",
        userId,
        error: error instanceof Error ? error.message : String(error),
      },
      "failed to refresh stale Solana AgentKit positions",
    );
    return positions;
  }
}
