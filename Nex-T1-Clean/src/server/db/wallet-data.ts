import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import {
  cachedQuery,
  CACHE_TTL,
  CACHE_NAMESPACE,
  walletDataCacheKey,
  invalidateCache,
} from "./cache";

export type WalletAccountRecord = {
  id: string;
  user_id: string;
  chain_id: number;
  wallet_type: string;
  address: string | null;
  safe_address: string | null;
  status: string;
  provider: string | null;
  platform: string | null;
  label: string | null;
  metadata: Record<string, UntypedJson> | null;
  created_at: string;
  updated_at: string;
};

export type UserWalletRecord = {
  id: string;
  user_id: string;
  address: string;
  wallet_type: string;
  chain_id: number | null;
  cluster: string | null;
  label: string | null;
  metadata: Record<string, UntypedJson> | null;
  created_at: string;
  updated_at: string;
};

/**
 * Fetch user wallet accounts with caching
 */
export async function getUserWalletAccounts(
  userId: string,
  client?: SupabaseClient
): Promise<{ data: WalletAccountRecord[] | null; error: UntypedJson }> {
  const supabase = client ?? getSupabaseAdminClient();
  const cacheKey = walletDataCacheKey(userId);

  return cachedQuery(
    async () =>
      await supabase
        .from("wallet_accounts")
        .select("*")
        .eq("user_id", userId),
    {
      key: cacheKey,
      namespace: CACHE_NAMESPACE.WALLET_DATA,
      ttlSeconds: CACHE_TTL.WALLET_DATA,
      staleTtlSeconds: CACHE_TTL.WALLET_DATA * 2, // 10 minutes stale
      coalesce: true,
    }
  );
}

/**
 * Fetch Safe wallet accounts with caching
 */
export async function getSafeWalletAccounts(
  userId: string,
  client?: SupabaseClient
): Promise<{ data: WalletAccountRecord[] | null; error: UntypedJson }> {
  const supabase = client ?? getSupabaseAdminClient();
  const cacheKey = `${walletDataCacheKey(userId)}:safe`;

  return cachedQuery(
    async () =>
      await supabase
        .from("wallet_accounts")
        .select("*")
        .eq("user_id", userId)
        .in("wallet_type", ["safe", "smart_wallet"]),
    {
      key: cacheKey,
      namespace: CACHE_NAMESPACE.WALLET_DATA,
      ttlSeconds: CACHE_TTL.WALLET_DATA,
      staleTtlSeconds: CACHE_TTL.WALLET_DATA * 2,
      coalesce: true,
    }
  );
}

/**
 * Fetch registered user wallets with caching
 */
export async function getRegisteredUserWallets(
  userId: string,
  client?: SupabaseClient
): Promise<{ data: UserWalletRecord[] | null; error: UntypedJson }> {
  const supabase = client ?? getSupabaseAdminClient();
  const cacheKey = `${walletDataCacheKey(userId)}:registered`;

  return cachedQuery(
    async () =>
      await supabase
        .from("user_wallets")
        .select("*")
        .eq("user_id", userId),
    {
      key: cacheKey,
      namespace: CACHE_NAMESPACE.WALLET_DATA,
      ttlSeconds: CACHE_TTL.WALLET_DATA,
      staleTtlSeconds: CACHE_TTL.WALLET_DATA * 2,
      coalesce: true,
    }
  );
}

/**
 * Fetch wallet account by address with caching
 */
export async function getWalletAccountByAddress(
  userId: string,
  address: string,
  client?: SupabaseClient
): Promise<{ data: WalletAccountRecord | null; error: UntypedJson }> {
  const supabase = client ?? getSupabaseAdminClient();
  const cacheKey = walletDataCacheKey(userId, address);

  return cachedQuery(
    async () =>
      await supabase
        .from("wallet_accounts")
        .select("*")
        .eq("user_id", userId)
        .or(`address.eq.${address},safe_address.eq.${address}`)
        .single(),
    {
      key: cacheKey,
      namespace: CACHE_NAMESPACE.WALLET_DATA,
      ttlSeconds: CACHE_TTL.WALLET_DATA,
      staleTtlSeconds: CACHE_TTL.WALLET_DATA * 2,
      coalesce: true,
    }
  );
}

/**
 * Update wallet account and invalidate cache
 */
export async function updateWalletAccount(
  userId: string,
  walletId: string,
  updates: Partial<WalletAccountRecord>,
  client?: SupabaseClient
): Promise<{ data: WalletAccountRecord | null; error: UntypedJson }> {
  const supabase = client ?? getSupabaseAdminClient();

  const result = await supabase
    .from("wallet_accounts")
    .update(updates)
    .eq("id", walletId)
    .eq("user_id", userId)
    .select()
    .single();

  // Invalidate all wallet caches for this user
  await invalidateWalletDataCache(userId);

  return result as { data: WalletAccountRecord | null; error: UntypedJson };
}

/**
 * Update user wallet and invalidate cache
 */
export async function updateUserWallet(
  userId: string,
  walletId: string,
  updates: Partial<UserWalletRecord>,
  client?: SupabaseClient
): Promise<{ data: UserWalletRecord | null; error: UntypedJson }> {
  const supabase = client ?? getSupabaseAdminClient();

  const result = await supabase
    .from("user_wallets")
    .update(updates)
    .eq("id", walletId)
    .eq("user_id", userId)
    .select()
    .single();

  // Invalidate all wallet caches for this user
  await invalidateWalletDataCache(userId);

  return result as { data: UserWalletRecord | null; error: UntypedJson };
}

/**
 * Invalidate all wallet data cache for a user
 */
export async function invalidateWalletDataCache(userId: string): Promise<void> {
  const baseKey = walletDataCacheKey(userId);
  // Invalidate all wallet-related keys for this user
  await Promise.all([
    invalidateCache(baseKey),
    invalidateCache(`${baseKey}:safe`),
    invalidateCache(`${baseKey}:registered`),
  ]);
}
