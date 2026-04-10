import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import {
  cachedQuery,
  CACHE_TTL,
  CACHE_NAMESPACE,
  analyticsCacheKey,
  invalidateCache,
} from "./cache";

export type WalletAnalyticsRecord = {
  id: string;
  user_id: string;
  wallet_id: string;
  wallet_address: string;
  chain_id: number | null;
  total_value_usd: number | null;
  native_value_usd: number | null;
  token_value_usd: number | null;
  nft_value_usd: number | null;
  change_24h_percent: number | null;
  unrealized_pnl_usd: number | null;
  transaction_count: number | null;
  last_transaction_at: string | null;
  metadata: Record<string, UntypedJson> | null;
  created_at: string;
  updated_at: string;
};

export type TokenHoldingRecord = {
  id: string;
  user_id: string;
  wallet_id: string;
  wallet_address: string;
  chain_id: number | null;
  token_address: string;
  token_symbol: string | null;
  token_name: string | null;
  balance: string;
  decimals: number;
  value_usd: number | null;
  price_usd: number | null;
  change_24h_percent: number | null;
  metadata: Record<string, UntypedJson> | null;
  created_at: string;
  updated_at: string;
};

/**
 * Fetch wallet analytics with caching (1 min TTL for fresh data)
 */
export async function getWalletAnalytics(
  userId: string,
  walletId?: string,
  client?: SupabaseClient
): Promise<{ data: WalletAnalyticsRecord[] | null; error: UntypedJson }> {
  const supabase = client ?? getSupabaseAdminClient();
  const cacheKey = analyticsCacheKey(userId, "wallet_analytics", walletId ? { walletId } : undefined);

  return cachedQuery(
    async () => {
      let query = supabase
        .from("wallet_analytics")
        .select("*")
        .eq("user_id", userId);

      if (walletId) {
        query = query.eq("wallet_id", walletId);
      }

      return await query;
    },
    {
      key: cacheKey,
      namespace: CACHE_NAMESPACE.ANALYTICS_DATA,
      ttlSeconds: CACHE_TTL.ANALYTICS_DATA,
      staleTtlSeconds: CACHE_TTL.ANALYTICS_DATA * 2, // 2 minutes stale
      coalesce: true,
    }
  );
}

/**
 * Fetch token holdings with caching (1 min TTL)
 */
export async function getTokenHoldings(
  userId: string,
  walletId?: string,
  client?: SupabaseClient
): Promise<{ data: TokenHoldingRecord[] | null; error: UntypedJson }> {
  const supabase = client ?? getSupabaseAdminClient();
  const cacheKey = analyticsCacheKey(userId, "token_holdings", walletId ? { walletId } : undefined);

  return cachedQuery(
    async () => {
      let query = supabase
        .from("token_holdings")
        .select("*")
        .eq("user_id", userId)
        .order("value_usd", { ascending: false });

      if (walletId) {
        query = query.eq("wallet_id", walletId);
      }

      return await query;
    },
    {
      key: cacheKey,
      namespace: CACHE_NAMESPACE.ANALYTICS_DATA,
      ttlSeconds: CACHE_TTL.ANALYTICS_DATA,
      staleTtlSeconds: CACHE_TTL.ANALYTICS_DATA * 2,
      coalesce: true,
    }
  );
}

/**
 * Fetch top token holdings by value with caching
 */
export async function getTopTokenHoldings(
  userId: string,
  limit: number = 10,
  client?: SupabaseClient
): Promise<{ data: TokenHoldingRecord[] | null; error: UntypedJson }> {
  const supabase = client ?? getSupabaseAdminClient();
  const cacheKey = analyticsCacheKey(userId, "top_tokens", { limit: limit.toString() });

  return cachedQuery(
    async () =>
      await supabase
        .from("token_holdings")
        .select("*")
        .eq("user_id", userId)
        .order("value_usd", { ascending: false })
        .limit(limit),
    {
      key: cacheKey,
      namespace: CACHE_NAMESPACE.ANALYTICS_DATA,
      ttlSeconds: CACHE_TTL.ANALYTICS_DATA,
      staleTtlSeconds: CACHE_TTL.ANALYTICS_DATA * 2,
      coalesce: true,
    }
  );
}

/**
 * Fetch portfolio summary with caching
 */
export async function getPortfolioSummary(
  userId: string,
  client?: SupabaseClient
): Promise<{
  data: {
    totalValueUsd: number;
    nativeValueUsd: number;
    tokenValueUsd: number;
    nftValueUsd: number;
    change24hPercent: number;
    unrealizedPnlUsd: number;
  } | null;
  error: UntypedJson;
}> {
  const supabase = client ?? getSupabaseAdminClient();
  const cacheKey = analyticsCacheKey(userId, "portfolio_summary");

  return cachedQuery(
    async () => {
      const { data, error } = await supabase
        .from("wallet_analytics")
        .select("total_value_usd, native_value_usd, token_value_usd, nft_value_usd, change_24h_percent, unrealized_pnl_usd")
        .eq("user_id", userId);

      if (error || !data) {
        return { data: null, error };
      }

      // Aggregate across all wallets
      const summary = data.reduce(
        (acc, row) => ({
          totalValueUsd: acc.totalValueUsd + (row.total_value_usd ?? 0),
          nativeValueUsd: acc.nativeValueUsd + (row.native_value_usd ?? 0),
          tokenValueUsd: acc.tokenValueUsd + (row.token_value_usd ?? 0),
          nftValueUsd: acc.nftValueUsd + (row.nft_value_usd ?? 0),
          change24hPercent: acc.change24hPercent + (row.change_24h_percent ?? 0),
          unrealizedPnlUsd: acc.unrealizedPnlUsd + (row.unrealized_pnl_usd ?? 0),
        }),
        {
          totalValueUsd: 0,
          nativeValueUsd: 0,
          tokenValueUsd: 0,
          nftValueUsd: 0,
          change24hPercent: 0,
          unrealizedPnlUsd: 0,
        }
      );

      // Average the change percent
      if (data.length > 0) {
        summary.change24hPercent = summary.change24hPercent / data.length;
      }

      return { data: summary, error: null };
    },
    {
      key: cacheKey,
      namespace: CACHE_NAMESPACE.ANALYTICS_DATA,
      ttlSeconds: CACHE_TTL.ANALYTICS_DATA,
      staleTtlSeconds: CACHE_TTL.ANALYTICS_DATA * 2,
      coalesce: true,
    }
  );
}

/**
 * Invalidate analytics cache for a user
 */
export async function invalidateAnalyticsCache(userId: string, type?: string): Promise<void> {
  if (type) {
    const cacheKey = analyticsCacheKey(userId, type);
    await invalidateCache(cacheKey);
  } else {
    // Invalidate all analytics caches for this user
    await Promise.all([
      invalidateCache(analyticsCacheKey(userId, "wallet_analytics")),
      invalidateCache(analyticsCacheKey(userId, "token_holdings")),
      invalidateCache(analyticsCacheKey(userId, "top_tokens")),
      invalidateCache(analyticsCacheKey(userId, "portfolio_summary")),
    ]);
  }
}
