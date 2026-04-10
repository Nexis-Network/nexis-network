"use server";

import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { logger } from "@/lib/logger";

export interface RecordTxPayload {
  address: string;
  txHash: string;
  chainId: number;
  type: string; // 'swap' | 'lp_create' | 'lp_increase' | 'lp_decrease' | 'lp_claim'
  fromToken?: string;
  toToken?: string;
  fromAmount?: string;
  toAmount?: string;
  metadata?: Record<string, unknown>;
}

export async function recordProtocolTransaction(payload: RecordTxPayload) {
  try {
    const supabase = getSupabaseAdminClient();
    let walletId = null;

    // Resolve wallet ID from address
    const { data: userWallet } = await supabase
      .from("user_wallets")
      .select("id")
      .eq("address", payload.address)
      .maybeSingle();

    if (userWallet) {
      walletId = userWallet.id;
    } else {
      const { data: walletAccount } = await supabase
        .from("wallet_accounts")
        .select("id")
        .or(`address.eq.${payload.address},safe_address.eq.${payload.address}`)
        .maybeSingle();
      if (walletAccount) {
        walletId = walletAccount.id;
      }
    }

    if (!walletId) {
      logger.info(`[recordProtocolTransaction] No registered wallet found for ${payload.address}, skipping db insertion.`);
      return { success: true, skipped: true };
    }

    // Try V2 Schema (enhancement)
    const txDataV2 = {
      wallet_id: walletId,
      chain_id: payload.chainId,
      transaction_hash: payload.txHash,
      from_address: payload.address,
      status: "pending",
      transaction_type: payload.type.includes("swap") ? "swap" : "contract_interaction",
      metadata: {
        ...payload.metadata,
        original_type: payload.type,
        fromToken: payload.fromToken,
        toToken: payload.toToken,
        fromAmount: payload.fromAmount,
        toAmount: payload.toAmount,
        source: "uniswap-integration",
      },
    };

    const { error } = await supabase.from("wallet_transactions").insert(txDataV2);

    if (error) {
      logger.warn(`[recordProtocolTransaction] Insert failed with V2 schema, attempting V1 or V3 schema: ${error.message}`);
      
      // Fallback for V1/V3 Schema variations
      const { error: fallbackError } = await supabase.from("wallet_transactions").upsert({
        account_id: walletId, // V1 used account_id
        chain_id: payload.chainId,
        hash: payload.txHash, // V1 used hash
        direction: "outbound",
        metadata: txDataV2.metadata,
        occurred_at: new Date().toISOString(),
      }, { onConflict: 'chain_id, hash' } as Record<string, unknown>);

      if (fallbackError) {
         logger.error(`[recordProtocolTransaction] Fallback insert failed:`, fallbackError);
         return { success: false, error: fallbackError.message };
      }
    }

    return { success: true };
  } catch (error: unknown) {
    logger.error("[recordProtocolTransaction] Exception:", error);
    return { success: false, error: (error as Error).message };
  }
}
