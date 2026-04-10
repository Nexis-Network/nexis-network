import "server-only";

import { createServiceRoleClient } from "@/server/services/supabase/service-role";

type Row = Record<string, unknown>;

function clone<T>(value: T): T {
  return value == null ? value : JSON.parse(JSON.stringify(value)) as T;
}

function normalizeRow<T extends Row>(value: unknown): T | null {
  return value && typeof value === "object" ? clone(value as T) : null;
}

function normalizeRows<T extends Row>(value: unknown): T[] {
  return Array.isArray(value) ? clone(value as T[]) : [];
}

function uniqueUserIds(rows: Array<{ user_id?: unknown }>): string[] {
  return Array.from(
    new Set(
      rows
        .map((row) => (typeof row.user_id === "string" ? row.user_id : null))
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

export function createAiInsightRepository() {
  const supabase = createServiceRoleClient();

  return {
    async savePortfolioSnapshot<T extends Row>(row: T): Promise<T> {
      const { data, error } = await supabase
        .from("ai_portfolio_snapshots")
        .upsert(row, { onConflict: "user_id,input_hash" })
        .select("*")
        .single();

      if (error) {
        throw new Error(`Failed to save AI portfolio snapshot: ${error.message}`);
      }

      return clone(data as T);
    },

    async saveAssetMarketSnapshot<T extends Row>(row: T): Promise<T> {
      const { data, error } = await supabase
        .from("asset_market_snapshots")
        .upsert(row, { onConflict: "asset_key,input_hash" })
        .select("*")
        .single();

      if (error) {
        throw new Error(`Failed to save asset market snapshot: ${error.message}`);
      }

      return clone(data as T);
    },

    async saveInsight<T extends Row>(row: T): Promise<T> {
      const { data, error } = await supabase
        .from("ai_insights")
        .upsert(row, { onConflict: "scope,input_hash" })
        .select("*")
        .single();

      if (error) {
        throw new Error(`Failed to save AI insight: ${error.message}`);
      }

      return clone(data as T);
    },

    async findInsightByScopeAndInputHash(scope: string, inputHash: string) {
      const { data, error } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("scope", scope)
        .eq("input_hash", inputHash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to read AI insight by hash: ${error.message}`);
      }

      return normalizeRow(data);
    },

    async findLatestPortfolioInsightByUser(userId: string) {
      const { data, error } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("scope", "portfolio")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to read latest portfolio insight: ${error.message}`);
      }

      return normalizeRow(data);
    },

    async findLatestPortfolioFallbackInsightByUser(userId: string) {
      const { data, error } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("scope", "portfolio")
        .eq("user_id", userId)
        .eq("category", "fallback_news")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to read latest portfolio fallback insight: ${error.message}`);
      }

      return normalizeRow(data);
    },

    async findLatestAssetInsightByAssetKey(assetKey: string) {
      const { data, error } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("scope", "asset")
        .eq("asset_key", assetKey)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to read latest asset insight: ${error.message}`);
      }

      return normalizeRow(data);
    },

    async listTrackedPortfolioUsers({ limit = 200, offset = 0 } = {}) {
      const { data, error } = await supabase
        .from("wallet_accounts")
        .select("user_id")
        .not("user_id", "is", null)
        .order("user_id", { ascending: true })
        .range(offset, offset + Math.max(limit, 1) - 1);

      if (error) {
        throw new Error(`Failed to list tracked portfolio users: ${error.message}`);
      }

      return uniqueUserIds(normalizeRows<{ user_id?: unknown }>(data));
    },

    async listWalletAccountsByUserId(userId: string) {
      const { data, error } = await supabase
        .from("wallet_accounts")
        .select("id,user_id,wallet_id,address,safe_address,chain_id,platform,wallet_type,provider,metadata")
        .eq("user_id", userId);

      if (error) {
        throw new Error(`Failed to list wallet accounts: ${error.message}`);
      }

      return normalizeRows(data);
    },

    async listWalletSnapshotsByWalletAccountIds(
      walletAccountIds: string[],
      options?: { since?: string | undefined },
    ) {
      if (walletAccountIds.length === 0) {
        return [];
      }

      let query = supabase
        .from("wallet_snapshots")
        .select("id,wallet_account_id,network_slug,total_value_usd,positions_json,captured_at")
        .in("wallet_account_id", walletAccountIds)
        .order("captured_at", { ascending: false });

      if (options?.since) {
        query = query.gte("captured_at", options.since);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Failed to list wallet snapshots: ${error.message}`);
      }

      return normalizeRows(data);
    },

    async listWalletSnapshotsByWalletAddresses(
      walletAddresses: string[],
      options?: { since?: string | undefined },
    ) {
      if (walletAddresses.length === 0) {
        return [];
      }

      let query = supabase
        .from("wallet_snapshots")
        .select("id,wallet_address,chain_namespace,net_worth_usd,snapshot_at")
        .in("wallet_address", walletAddresses)
        .order("snapshot_at", { ascending: false });

      if (options?.since) {
        query = query.gte("snapshot_at", options.since);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Failed to list wallet snapshots by address: ${error.message}`);
      }

      return normalizeRows(data);
    },
  };
}

export type AiInsightRepository = ReturnType<typeof createAiInsightRepository>;
