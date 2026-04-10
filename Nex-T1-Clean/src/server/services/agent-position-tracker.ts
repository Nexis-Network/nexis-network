import "server-only";

import { logger } from "@/lib/logger";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentPosition = {
  id: string;
  agentId: string;
  agentWalletId: string;
  tokenAddress: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  chain: string;
  side: "long" | "short";
  entryPriceUsd: number | null;
  currentPriceUsd: number | null;
  quantity: number;
  notionalUsd: number | null;
  unrealizedPnl: number | null;
  pnlPercent: number | null;
  openedAt: string;
  lastUpdated: string;
};

export type TradeParams = {
  agentId: string;
  agentWalletId: string;
  trade: {
    side: "buy" | "sell" | "short" | "cover" | "liquidate";
    baseAsset: string;
    quoteAsset: string;
    amount: number;
    priceUsd?: number;
    notionalUsd?: number;
    pnlUsd?: number;
    chain: string;
    tokenSymbol?: string;
    tokenName?: string;
  };
};

type PositionRow = {
  id: string;
  agent_id: string;
  agent_wallet_id: string;
  token_address: string;
  token_symbol: string | null;
  token_name: string | null;
  chain: string;
  side: "long" | "short";
  entry_price_usd: number | null;
  current_price_usd: number | null;
  quantity: number;
  notional_usd: number | null;
  unrealized_pnl: number | null;
  pnl_percent: number | null;
  opened_at: string;
  last_updated: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToPosition(row: PositionRow): AgentPosition {
  return {
    id: row.id,
    agentId: row.agent_id,
    agentWalletId: row.agent_wallet_id,
    tokenAddress: row.token_address,
    tokenSymbol: row.token_symbol,
    tokenName: row.token_name,
    chain: row.chain,
    side: row.side,
    entryPriceUsd: row.entry_price_usd,
    currentPriceUsd: row.current_price_usd,
    quantity: row.quantity,
    notionalUsd: row.notional_usd,
    unrealizedPnl: row.unrealized_pnl,
    pnlPercent: row.pnl_percent,
    openedAt: row.opened_at,
    lastUpdated: row.last_updated,
  };
}

/**
 * Compute a weighted average entry price when increasing a position.
 *
 *   newAvg = (existingQty * existingPrice + addedQty * addedPrice) / (existingQty + addedQty)
 */
function weightedAveragePrice(
  existingQty: number,
  existingPrice: number | null,
  addedQty: number,
  addedPrice: number | null,
): number | null {
  const ep = existingPrice ?? 0;
  const ap = addedPrice ?? 0;
  const totalQty = existingQty + addedQty;
  if (totalQty === 0) return null;
  return (existingQty * ep + addedQty * ap) / totalQty;
}

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Update or create a position based on a completed trade.
 *
 * - buy:       Increase long position quantity, recalculate weighted average entry price.
 * - sell:      Decrease long position quantity; delete if quantity reaches 0.
 * - short:     Increase short position quantity.
 * - cover:     Decrease short position quantity; delete if fully covered.
 * - liquidate: Close position entirely.
 */
export async function updatePositionsFromTrade(
  params: TradeParams,
): Promise<void> {
  const { agentId, agentWalletId, trade } = params;
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  logger.debug("update_positions_from_trade", {
    agentId,
    side: trade.side,
    baseAsset: trade.baseAsset,
    amount: String(trade.amount),
  });

  // Determine position side for the asset
  const positionSide: "long" | "short" =
    trade.side === "short" ? "short" : "long";

  // Check for existing position
  const { data: existingRows, error: fetchError } = await supabase
    .from("agent_positions")
    .select("*")
    .eq("agent_id", agentId)
    .eq("agent_wallet_id", agentWalletId)
    .eq("token_address", trade.baseAsset)
    .eq("chain", trade.chain)
    .eq("side", positionSide)
    .limit(1);

  if (fetchError) {
    logger.error("position_fetch_failed", {
      agentId,
      error: fetchError.message,
    });
    throw new Error(`Failed to fetch existing position: ${fetchError.message}`);
  }

  const existing = (existingRows?.[0] ?? null) as PositionRow | null;

  // --- LIQUIDATE: Close position entirely ---
  if (trade.side === "liquidate") {
    if (existing) {
      const { error: delError } = await supabase
        .from("agent_positions")
        .delete()
        .eq("id", existing.id);

      if (delError) {
        logger.error("position_liquidate_failed", {
          positionId: existing.id,
          error: delError.message,
        });
      } else {
        logger.info("position_liquidated", {
          agentId,
          positionId: existing.id,
          token: trade.baseAsset,
        });
      }
    }
    return;
  }

  // --- COVER: Decrease short position ---
  if (trade.side === "cover") {
    if (!existing) {
      logger.warn("cover_no_existing_short", {
        agentId,
        token: trade.baseAsset,
      });
      return;
    }

    const newQty = existing.quantity - trade.amount;

    if (newQty <= 0) {
      // Position fully covered -- delete
      const { error: delError } = await supabase
        .from("agent_positions")
        .delete()
        .eq("id", existing.id);

      if (delError) {
        logger.error("position_cover_delete_failed", {
          positionId: existing.id,
          error: delError.message,
        });
      } else {
        logger.info("position_fully_covered", {
          agentId,
          positionId: existing.id,
        });
      }
      return;
    }

    const notionalUsd =
      trade.priceUsd != null ? newQty * trade.priceUsd : existing.notional_usd;

    const { error: updateError } = await supabase
      .from("agent_positions")
      .update({
        quantity: newQty,
        notional_usd: notionalUsd,
        last_updated: now,
      })
      .eq("id", existing.id);

    if (updateError) {
      logger.error("position_cover_update_failed", {
        positionId: existing.id,
        error: updateError.message,
      });
    }
    return;
  }

  // --- SELL: Decrease long position ---
  if (trade.side === "sell") {
    if (!existing) {
      logger.warn("sell_no_existing_long", {
        agentId,
        token: trade.baseAsset,
      });
      return;
    }

    const newQty = existing.quantity - trade.amount;

    if (newQty <= 0) {
      // Position fully sold -- delete
      const { error: delError } = await supabase
        .from("agent_positions")
        .delete()
        .eq("id", existing.id);

      if (delError) {
        logger.error("position_sell_delete_failed", {
          positionId: existing.id,
          error: delError.message,
        });
      } else {
        logger.info("position_fully_sold", {
          agentId,
          positionId: existing.id,
        });
      }
      return;
    }

    const notionalUsd =
      trade.priceUsd != null ? newQty * trade.priceUsd : existing.notional_usd;

    const { error: updateError } = await supabase
      .from("agent_positions")
      .update({
        quantity: newQty,
        notional_usd: notionalUsd,
        last_updated: now,
      })
      .eq("id", existing.id);

    if (updateError) {
      logger.error("position_sell_update_failed", {
        positionId: existing.id,
        error: updateError.message,
      });
    }
    return;
  }

  // --- BUY / SHORT: Increase position ---
  if (existing) {
    const newQty = existing.quantity + trade.amount;
    const newEntryPrice = weightedAveragePrice(
      existing.quantity,
      existing.entry_price_usd,
      trade.amount,
      trade.priceUsd ?? null,
    );
    const notionalUsd =
      trade.priceUsd != null ? newQty * trade.priceUsd : existing.notional_usd;

    const { error: updateError } = await supabase
      .from("agent_positions")
      .update({
        quantity: newQty,
        entry_price_usd: newEntryPrice,
        notional_usd: notionalUsd,
        current_price_usd: trade.priceUsd ?? existing.current_price_usd,
        last_updated: now,
      })
      .eq("id", existing.id);

    if (updateError) {
      logger.error("position_increase_failed", {
        positionId: existing.id,
        error: updateError.message,
      });
      throw new Error(
        `Failed to increase position: ${updateError.message}`,
      );
    }

    logger.debug("position_increased", {
      positionId: existing.id,
      newQty: String(newQty),
      side: positionSide,
    });
  } else {
    // Create new position
    const notionalUsd =
      trade.priceUsd != null ? trade.amount * trade.priceUsd : (trade.notionalUsd ?? null);

    const { error: insertError } = await supabase
      .from("agent_positions")
      .insert({
        agent_id: agentId,
        agent_wallet_id: agentWalletId,
        token_address: trade.baseAsset,
        token_symbol: trade.tokenSymbol ?? null,
        token_name: trade.tokenName ?? null,
        chain: trade.chain,
        side: positionSide,
        entry_price_usd: trade.priceUsd ?? null,
        current_price_usd: trade.priceUsd ?? null,
        quantity: trade.amount,
        notional_usd: notionalUsd,
        unrealized_pnl: 0,
        pnl_percent: 0,
        opened_at: now,
        last_updated: now,
      });

    if (insertError) {
      logger.error("position_create_failed", {
        agentId,
        token: trade.baseAsset,
        error: insertError.message,
      });
      throw new Error(`Failed to create position: ${insertError.message}`);
    }

    logger.info("position_opened", {
      agentId,
      token: trade.baseAsset,
      side: positionSide,
      quantity: String(trade.amount),
    });
  }
}

/**
 * Get all open positions for an agent, ordered by notional value descending.
 */
export async function getOpenPositions(
  agentId: string,
): Promise<AgentPosition[]> {
  const supabase = getSupabaseAdminClient();

  const { data: rows, error } = await supabase
    .from("agent_positions")
    .select("*")
    .eq("agent_id", agentId)
    .order("notional_usd", { ascending: false, nullsFirst: false });

  if (error) {
    logger.error("get_open_positions_failed", {
      agentId,
      error: error.message,
    });
    throw new Error(`Failed to fetch open positions: ${error.message}`);
  }

  return ((rows ?? []) as PositionRow[]).map(rowToPosition);
}

/**
 * Refresh current prices and P&L for all open positions of an agent.
 *
 * For each position:
 * 1. Look up the latest price from the token's latest wallet snapshot data
 *    (agent_wallet_snapshots -> snapshot_data -> tokens).
 * 2. Recalculate unrealized P&L and pnl_percent.
 * 3. Batch-update the positions.
 * 4. Sync unrealized_pnl_usd on agent_performance_rollup.
 */
export async function refreshPositionPrices(
  agentId: string,
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const positions = await getOpenPositions(agentId);

  if (positions.length === 0) {
    return;
  }

  // Build a price map from the latest wallet snapshots
  const priceMap = await buildPriceMapFromSnapshots(agentId);

  let totalUnrealizedPnl = 0;

  // Compute updated values for each position
  type PositionUpdate = {
    id: string;
    currentPrice: number;
    notionalUsd: number;
    unrealizedPnl: number | null;
    pnlPercent: number | null;
  };

  const updates: PositionUpdate[] = [];

  for (const position of positions) {
    const lookupKey = `${position.chain}:${position.tokenAddress.toLowerCase()}`;
    const currentPrice = priceMap.get(lookupKey) ?? position.currentPriceUsd;

    if (currentPrice == null) {
      continue;
    }

    const notionalUsd = position.quantity * currentPrice;
    let unrealizedPnl: number | null = null;
    let pnlPercent: number | null = null;

    if (position.entryPriceUsd != null && position.entryPriceUsd > 0) {
      if (position.side === "long") {
        unrealizedPnl =
          (currentPrice - position.entryPriceUsd) * position.quantity;
      } else {
        // Short: profit when price drops
        unrealizedPnl =
          (position.entryPriceUsd - currentPrice) * position.quantity;
      }
      pnlPercent =
        ((currentPrice - position.entryPriceUsd) / position.entryPriceUsd) *
        100;
      if (position.side === "short") {
        pnlPercent = -pnlPercent;
      }
    }

    totalUnrealizedPnl += unrealizedPnl ?? 0;
    updates.push({ id: position.id, currentPrice, notionalUsd, unrealizedPnl, pnlPercent });
  }

  // Batch updates in groups of 10 for controlled parallelism
  const BATCH_SIZE = 10;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (update) => {
        const { error: updateError } = await supabase
          .from("agent_positions")
          .update({
            current_price_usd: update.currentPrice,
            notional_usd: update.notionalUsd,
            unrealized_pnl: update.unrealizedPnl,
            pnl_percent: update.pnlPercent,
            last_updated: new Date().toISOString(),
          })
          .eq("id", update.id);

        if (updateError) {
          logger.warn("position_price_refresh_failed", {
            positionId: update.id,
            error: updateError.message,
          });
        }
      }),
    );
  }

  // Sync unrealized P&L to the rollup table
  const { error: rollupError } = await supabase
    .from("agent_performance_rollup")
    .update({
      unrealized_pnl_usd: totalUnrealizedPnl,
      updated_at: new Date().toISOString(),
    })
    .eq("agent_id", agentId);

  if (rollupError) {
    logger.warn("rollup_unrealized_pnl_sync_failed", {
      agentId,
      error: rollupError.message,
    });
  }

  logger.debug("position_prices_refreshed", {
    agentId,
    positionCount: String(positions.length),
    totalUnrealizedPnl: String(totalUnrealizedPnl),
  });
}

/**
 * Close all open positions for an agent. Used during wallet transfers
 * or agent decommissioning where the new wallet starts with a fresh slate.
 */
export async function closeAllPositions(agentId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("agent_positions")
    .delete()
    .eq("agent_id", agentId);

  if (error) {
    logger.error("close_all_positions_failed", {
      agentId,
      error: error.message,
    });
    throw new Error(`Failed to close all positions: ${error.message}`);
  }

  logger.info("all_positions_closed", { agentId });
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Build a price lookup map from the most recent agent wallet snapshots.
 * Returns a Map keyed by `{chain}:{tokenAddressLower}` with the latest USD price.
 */
async function buildPriceMapFromSnapshots(
  agentId: string,
): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>();
  const supabase = getSupabaseAdminClient();

  // Fetch the most recent snapshot per wallet (limit to last hour for freshness)
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: snapshots, error } = await supabase
    .from("agent_wallet_snapshots")
    .select("platform, tokens")
    .eq("agent_id", agentId)
    .gte("snapshot_at", cutoff)
    .order("snapshot_at", { ascending: false })
    .limit(20);

  if (error) {
    logger.warn("price_map_snapshot_fetch_failed", {
      agentId,
      error: error.message,
    });
    return priceMap;
  }

  for (const snap of snapshots ?? []) {
    const chain = String(snap.platform ?? "evm");
    const tokens = (snap.tokens ?? []) as Array<{
      token_address?: string;
      usd_price?: number;
    }>;

    for (const token of tokens) {
      if (!token.token_address || token.usd_price == null) continue;
      const key = `${chain}:${token.token_address.toLowerCase()}`;
      // Only set if not already present (first = most recent snapshot)
      if (!priceMap.has(key)) {
        priceMap.set(key, Number(token.usd_price));
      }
    }
  }

  return priceMap;
}
