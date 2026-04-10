"use server";

import { createClient } from "@/server/services/supabase/server";
import { invalidateUserWalletsCache } from "@/server/wallets/user-wallets";
import { revalidatePath } from "next/cache";
import { provisionSafeWallet } from "@/server/services/safe/provision";
import { getSafeTargetChains } from "@/server/services/safe/chains"; // Correct import path assumption? Needs check.

import { logger } from '@/lib/logger';
// Actually chains are in services/safe/chains.ts


export async function renameWallet(walletId: string, name: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database unavailable" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  logger.debug(`[renameWallet] Renaming wallet ${walletId} to "${name}" for user ${user.id}`);

  try {
    if (walletId.startsWith("registered_")) {
        // Format: registered_{type}_{address}
        const address = walletId.split("_").pop();
        if(!address) return { success: false, error: "Invalid wallet ID format" };

        const { error } = await supabase
            .from("user_wallets")
            .update({ label: name })
            .eq("user_id", user.id)
            .eq("address", address);
            
        if (error) throw error;

    } else if (walletId.startsWith("safe_")) {
        // Format: safe_{chainId}_{address}
        const parts = walletId.split("_");
        // safe_8453_0x...
        const address = parts[2] || parts[1]; // fallback if format varies, but usually safe_chainId_address
        if(!address) return { success: false, error: "Invalid wallet ID format" };

        // Need to identify the record. For Safe, we used "wallet_accounts" table for "safe" type.
        // We can try to match by safe_address or address.
        const { error } = await supabase
            .from("wallet_accounts")
            .update({ label: name })
            .eq("user_id", user.id)
            .or(`safe_address.eq.${address},address.eq.${address}`);
            
        if (error) throw error;
    } else {
        // External or other types? 
        // If it's the connected EOA, we might not have a DB record unless it's registered.
        // For now, support persisted wallets.
        return { success: false, error: "Wallet type not supported for renaming" };
    }

    // Invalidate cache
    await invalidateUserWalletsCache(user.id);
    
    return { success: true };
  } catch (error) {
    logger.error("[renameWallet] Error:", error);
    return { success: false, error: "Failed to update wallet name" };
    return { success: false, error: "Failed to update wallet name" };
  }
}

export async function createSafeWallet(chainId: number): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database unavailable" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    await provisionSafeWallet(user.id, chainId, user.email);
    
    // Invalidate server cache
    await invalidateUserWalletsCache(user.id);
    
    // Revalidate relevant paths
    revalidatePath("/portfolio");
    revalidatePath("/settings/wallets");
    revalidatePath("/settings"); // For good measure if there are summaries there
    
    return { success: true };
  } catch (error) {
    logger.error("[createSafeWallet] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create wallet" };
  }
}

export async function createDevWallet(chainId: number): Promise<{ success: boolean; error?: string }> {
  // if (process.env.NODE_ENV !== "development") {
  //   return { success: false, error: "Dev mode only" };
  // }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database unavailable" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    // Generate a random valid EVM address
    const randomBytes = new Uint8Array(20);
    crypto.getRandomValues(randomBytes);
    const mockAddress = `0x${Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;

    // Insert mock wallet directly
    const { error } = await supabase.from("wallet_accounts").insert({
      user_id: user.id,
      chain_id: chainId,
      wallet_type: "safe",
      address: mockAddress,
      safe_address: mockAddress,
      status: "ready",
      provider: "safe",
      platform: "evm",
      metadata: { 
        label: "Dev Safe", 
        isDev: true,
        owners: [], 
        ownerKinds: [],
        threshold: 1,
        modules: {},
        enabledModules: []
      }
    });

    if (error) throw error;

    // Invalidate server cache
    await invalidateUserWalletsCache(user.id);
    
    // Revalidate relevant paths
    revalidatePath("/portfolio");
    revalidatePath("/settings");
    
    return { success: true };
  } catch (error) {
    logger.error("[createDevWallet] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create dev wallet" };
  }
}

export async function getAvailableSafeChains(): Promise<{ chainId: number; label: string; icon?: string }[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get all target chains
  // We need to import getSafeTargetChains dynamically or statically?
  // It's a server util, so we can import it.
  const allChains = getSafeTargetChains();
  
  // Get existing safe wallets
  const { data: wallets } = await supabase
    .from("wallet_accounts")
    .select("chain_id")
    .eq("user_id", user.id)
    .eq("wallet_type", "safe");

  const existingChainIds = new Set(wallets?.map(w => w.chain_id) ?? []);

  return allChains
    .filter(c => !existingChainIds.has(c.chainId))
    .map(c => ({ chainId: c.chainId, label: c.label }));
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeBreakdown(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== "object") return undefined;

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return undefined;

  const normalized: Record<string, number> = {};
  for (const [chain, amount] of entries) {
    const parsed = toFiniteNumber(amount);
    if (parsed != null) {
      normalized[chain] = parsed;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export async function fetchWalletPnL(address: string, type: "evm" | "solana" | "safe"): Promise<{ totalUsd: number; breakdown?: Record<string, number> }> {
  // Simple validation
  if (!address) return { totalUsd: 0 };

  try {
    if (type === "solana") {
      const { getWalletNetWorth } = await import("@/server/market/birdeye");
      const data = await getWalletNetWorth(address);
      return { totalUsd: data.totalUsd };
    } else {
      try {
        // EVM (Safe or EOA) via Moralis
        const { getMoralisWalletNetWorth } = await import("@/server/market/moralis");
        const response = await getMoralisWalletNetWorth(address);
        const totalUsd = toFiniteNumber(response?.data?.totalUsd) ?? 0;
        const breakdown = normalizeBreakdown(response?.data?.chains);
        return breakdown ? { totalUsd, breakdown } : { totalUsd };
      } catch (error) {
        logger.warn(`[fetchWalletPnL] EVM net worth unavailable for ${address}`, {
          type,
          error: error instanceof Error ? error.message : String(error),
        });
        return { totalUsd: 0 };
      }
    }
  } catch (error) {
    logger.error(`[fetchWalletPnL] Failed for ${address} (${type})`, error);
    return { totalUsd: 0 };
  }
}
