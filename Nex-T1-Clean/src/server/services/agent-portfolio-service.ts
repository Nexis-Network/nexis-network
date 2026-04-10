import "server-only";

import { logger } from "@/lib/logger";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { redis, isRedisConfigured } from "@/server/services/redis";
import {
  fetchWalletPortfolioSnapshot,
  type WalletPortfolioSnapshot,
  type Erc20TokenBalanceWithPrice,
} from "@/server/portfolio/wallet-data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentPortfolioSnapshot = {
  agentId: string;
  totalNetWorthUsd: number;
  wallets: Array<{
    walletId: string;
    address: string;
    platform: "evm" | "solana";
    netWorthUsd: number;
    nativeBalance: string;
    nativeUsd: number;
    tokens: Erc20TokenBalanceWithPrice[];
    pnl: {
      realizedUsd: number;
      unrealizedUsd: number;
      totalUsd: number;
      roiPercent: number;
    };
  }>;
  lastRefreshed: string;
};

export type AgentPortfolioHistory = {
  agentId: string;
  dataPoints: Array<{
    timestamp: string;
    netWorthUsd: number;
    evmValueUsd: number;
    solanaValueUsd: number;
  }>;
};

type AgentWalletRow = {
  id: string;
  agent_id: string;
  owner_id: string;
  generation: number;
  wallet_id: string;
  address: string;
  chain_id: number | null;
  platform: string;
  cdp_sub: string;
  status: string;
  label: string | null;
  metadata: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PORTFOLIO_CACHE_TTL_S = 60;

function cacheKey(agentId: string): string {
  return `agent:${agentId}:portfolio`;
}

/**
 * Map a numeric EVM chain ID to the hex string that `fetchWalletPortfolioSnapshot`
 * expects (e.g. 8453 -> "0x2105"). For Solana wallets, returns "solana".
 */
function toSnapshotChainParam(
  platform: string,
  chainId: number | null,
): string | number {
  if (platform === "solana") return "solana";
  if (chainId === null) return 1; // default to Ethereum mainnet
  return `0x${chainId.toString(16)}`;
}

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Fetch the aggregated portfolio for an agent across all its active wallets.
 *
 * 1. Check Redis cache.
 * 2. On miss: query `agent_wallets` for active wallets, fetch snapshots in
 *    parallel, persist each snapshot and update the rollup, then cache.
 */
export async function fetchAgentPortfolio(
  agentId: string,
): Promise<AgentPortfolioSnapshot> {
  // 1. Redis cache check
  if (isRedisConfigured) {
    try {
      const cached = await redis.get<AgentPortfolioSnapshot>(cacheKey(agentId));
      if (cached) {
        logger.debug("agent_portfolio_cache_hit", { agentId });
        return cached;
      }
    } catch (err) {
      logger.warn("agent_portfolio_cache_read_failed", {
        agentId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 2. Fetch active wallets from Supabase
  const supabase = getSupabaseAdminClient();

  const { data: walletRows, error: walletError } = await supabase
    .from("agent_wallets")
    .select("*")
    .eq("agent_id", agentId)
    .eq("status", "active");

  if (walletError) {
    logger.error("agent_wallets_fetch_failed", {
      agentId,
      error: walletError.message,
    });
    throw new Error(`Failed to fetch agent wallets: ${walletError.message}`);
  }

  const wallets = (walletRows ?? []) as AgentWalletRow[];

  if (wallets.length === 0) {
    const empty: AgentPortfolioSnapshot = {
      agentId,
      totalNetWorthUsd: 0,
      wallets: [],
      lastRefreshed: new Date().toISOString(),
    };
    return empty;
  }

  // 3. Fetch portfolio snapshots in parallel (allSettled for resilience)
  const results = await Promise.allSettled(
    wallets.map(async (wallet) => {
      const chainParam = toSnapshotChainParam(wallet.platform, wallet.chain_id);
      const snapshot = await fetchWalletPortfolioSnapshot({
        address: wallet.address,
        chainId: chainParam,
      });
      return { wallet, snapshot };
    }),
  );

  const walletSnapshots: AgentPortfolioSnapshot["wallets"] = [];

  for (const result of results) {
    if (result.status === "rejected") {
      logger.error("agent_wallet_snapshot_failed", {
        agentId,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      });
      continue;
    }

    const { wallet, snapshot } = result.value;
    const platform: "evm" | "solana" =
      wallet.platform === "solana" ? "solana" : "evm";

    // Derive native asset USD value as the difference between total net worth
    // and the sum of all ERC-20/SPL token USD values. This avoids the previous
    // bug where we incorrectly used the first token's price as the native price.
    const tokenValueSum = snapshot.tokens.reduce(
      (sum, t) => sum + (t.usd_value ?? 0),
      0,
    );
    const nativeUsd = Math.max(0, snapshot.netWorthUsd - tokenValueSum);

    walletSnapshots.push({
      walletId: wallet.id,
      address: wallet.address,
      platform,
      netWorthUsd: snapshot.netWorthUsd,
      nativeBalance: snapshot.native.balance,
      nativeUsd,
      tokens: snapshot.tokens,
      pnl: {
        realizedUsd: snapshot.profitability.total_realized_pnl_usd,
        unrealizedUsd: snapshot.profitability.total_unrealized_pnl_usd,
        totalUsd: snapshot.profitability.total_pnl_usd,
        roiPercent: snapshot.profitability.total_pnl_percentage,
      },
    });

    // 4. Persist each wallet snapshot (fire-and-forget, do not block aggregation)
    persistAgentWalletSnapshot(wallet.id, agentId, wallet.platform, snapshot).catch(
      (err) => {
        logger.error("agent_wallet_snapshot_persist_failed", {
          agentWalletId: wallet.id,
          agentId,
          error: err instanceof Error ? err.message : String(err),
        });
      },
    );
  }

  // 5. Update agent_performance_rollup with portfolio-level aggregates
  const totalNetWorthUsd = walletSnapshots.reduce(
    (acc, w) => acc + w.netWorthUsd,
    0,
  );
  const totalUnrealizedPnl = walletSnapshots.reduce(
    (acc, w) => acc + w.pnl.unrealizedUsd,
    0,
  );
  const totalPnl = walletSnapshots.reduce(
    (acc, w) => acc + w.pnl.totalUsd,
    0,
  );

  updatePerformanceRollupPortfolio(agentId, {
    portfolioValueUsd: totalNetWorthUsd,
    unrealizedPnlUsd: totalUnrealizedPnl,
    totalPnlUsd: totalPnl,
  }).catch((err) => {
    logger.error("agent_rollup_update_failed", {
      agentId,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  // 6. Build final snapshot
  const portfolioSnapshot: AgentPortfolioSnapshot = {
    agentId,
    totalNetWorthUsd,
    wallets: walletSnapshots,
    lastRefreshed: new Date().toISOString(),
  };

  // 7. Cache result
  if (isRedisConfigured) {
    try {
      await redis.set(cacheKey(agentId), portfolioSnapshot, {
        ex: PORTFOLIO_CACHE_TTL_S,
      });
    } catch (err) {
      logger.warn("agent_portfolio_cache_write_failed", {
        agentId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return portfolioSnapshot;
}

/**
 * Retrieve historical portfolio data points for an agent, bucketed by day.
 */
export async function getAgentPortfolioHistory(
  agentId: string,
  days: number,
): Promise<AgentPortfolioHistory> {
  const supabase = getSupabaseAdminClient();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const { data: rows, error } = await supabase
    .from("agent_wallet_snapshots")
    .select("snapshot_at, net_worth_usd, platform")
    .eq("agent_id", agentId)
    .gte("snapshot_at", cutoff.toISOString())
    .order("snapshot_at", { ascending: true });

  if (error) {
    logger.error("agent_portfolio_history_fetch_failed", {
      agentId,
      error: error.message,
    });
    return { agentId, dataPoints: [] };
  }

  if (!rows || rows.length === 0) {
    return { agentId, dataPoints: [] };
  }

  // Group by date bucket and aggregate
  const bucketMap = new Map<
    string,
    { netWorthUsd: number; evmValueUsd: number; solanaValueUsd: number }
  >();

  for (const row of rows) {
    const date = new Date(row.snapshot_at as string)
      .toISOString()
      .split("T")[0] as string;
    const netWorth = Number(row.net_worth_usd ?? 0);
    const platform = String(row.platform ?? "evm");

    const existing = bucketMap.get(date) ?? {
      netWorthUsd: 0,
      evmValueUsd: 0,
      solanaValueUsd: 0,
    };

    existing.netWorthUsd += netWorth;
    if (platform === "solana") {
      existing.solanaValueUsd += netWorth;
    } else {
      existing.evmValueUsd += netWorth;
    }

    bucketMap.set(date, existing);
  }

  // Fill gaps with previous day's value
  const sortedDates = Array.from(bucketMap.keys()).sort();
  const dataPoints: AgentPortfolioHistory["dataPoints"] = [];
  let previousValue = { netWorthUsd: 0, evmValueUsd: 0, solanaValueUsd: 0 };

  if (sortedDates.length > 0) {
    const startDate = new Date(cutoff.toISOString().split("T")[0] as string);
    const endDate = new Date();

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split("T")[0] as string;
      const bucket = bucketMap.get(dateStr);

      if (bucket) {
        previousValue = bucket;
      }

      dataPoints.push({
        timestamp: new Date(dateStr).toISOString(),
        netWorthUsd: previousValue.netWorthUsd,
        evmValueUsd: previousValue.evmValueUsd,
        solanaValueUsd: previousValue.solanaValueUsd,
      });
    }
  }

  return { agentId, dataPoints };
}

/**
 * Persist a single wallet snapshot to the `agent_wallet_snapshots` table.
 * Uses ON CONFLICT for idempotency when the same wallet is snapshotted
 * multiple times within the same second.
 */
export async function persistAgentWalletSnapshot(
  agentWalletId: string,
  agentId: string,
  platform: string,
  snapshot: WalletPortfolioSnapshot,
): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const record = {
    agent_wallet_id: agentWalletId,
    agent_id: agentId,
    platform,
    net_worth_usd: snapshot.netWorthUsd,
    native_balance: snapshot.native.balance,
    native_usd: Math.max(
      0,
      snapshot.netWorthUsd -
        snapshot.tokens.reduce((sum, t) => sum + (t.usd_value ?? 0), 0),
    ),
    tokens: snapshot.tokens,
    defi_positions: { profitability: snapshot.profitability },
    provenance: "moralis",
    snapshot_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("agent_wallet_snapshots")
    .upsert(record, {
      onConflict: "agent_wallet_id,snapshot_at",
    });

  if (error) {
    logger.error("persist_agent_wallet_snapshot_failed", {
      agentWalletId,
      agentId,
      error: error.message,
    });
    throw new Error(
      `Failed to persist agent wallet snapshot: ${error.message}`,
    );
  }

  logger.debug("agent_wallet_snapshot_persisted", {
    agentWalletId,
    agentId,
    netWorthUsd: String(snapshot.netWorthUsd),
  });
}

/**
 * Force-refresh agent portfolio by invalidating the Redis cache and
 * re-fetching all wallet data.
 */
export async function refreshAgentPortfolio(
  agentId: string,
): Promise<AgentPortfolioSnapshot> {
  if (isRedisConfigured) {
    try {
      await redis.del(cacheKey(agentId));
      logger.debug("agent_portfolio_cache_invalidated", { agentId });
    } catch (err) {
      logger.warn("agent_portfolio_cache_del_failed", {
        agentId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return fetchAgentPortfolio(agentId);
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Update the `agent_performance_rollup` row with portfolio-level values.
 * These columns extend the trade-driven rollup with portfolio analytics.
 *
 * Note: The rollup row is expected to exist (created on first trade or
 * agent provisioning). If it does not exist, this performs an upsert with
 * only the portfolio fields populated.
 */
async function updatePerformanceRollupPortfolio(
  agentId: string,
  values: {
    portfolioValueUsd: number;
    unrealizedPnlUsd: number;
    totalPnlUsd: number;
  },
): Promise<void> {
  const supabase = getSupabaseAdminClient();

  // Attempt to update the existing rollup row. If no row exists, the update
  // returns 0 rows affected which is acceptable -- the rollup row will be
  // created on the first trade execution via the trigger function.
  const { error } = await supabase
    .from("agent_performance_rollup")
    .update({
      portfolio_value_usd: values.portfolioValueUsd,
      aum_usd: values.portfolioValueUsd,
      unrealized_pnl_usd: values.unrealizedPnlUsd,
      total_pnl_usd: values.totalPnlUsd,
      updated_at: new Date().toISOString(),
    })
    .eq("agent_id", agentId);

  if (error) {
    logger.warn("agent_rollup_portfolio_update_failed", {
      agentId,
      error: error.message,
    });
  }
}
