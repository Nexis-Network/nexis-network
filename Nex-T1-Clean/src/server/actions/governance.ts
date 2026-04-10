"use server";

import { PolicyEngine, SecurityPolicy, TransactionIntent } from "@/server/governance/policy-engine";
import { getSupabaseServerClient } from "@/server/services/supabase/supabaseClient";
import { type WalletTransactionRow, sumDailySpendUsd } from "@/server/actions/governance-utils";


import { logger } from '@/lib/logger';
async function fetchDailySpendUsd(params: { userId: string }) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data: accounts, error: accountError } = await supabase
    .from("wallet_accounts")
    .select("id")
    .eq("user_id", params.userId);

  if (accountError || !accounts || accounts.length === 0) {
    return accountError ? null : 0;
  }

  const accountIds = accounts.map((row) => row.id).filter(Boolean);
  if (accountIds.length === 0) return 0;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error: txError } = await supabase
    .from("wallet_transactions")
    .select("amount_usd, fee_usd")
    .in("account_id", accountIds)
    .eq("direction", "outbound")
    .gte("occurred_at", since);

  if (txError || !rows) {
    return null;
  }

  return sumDailySpendUsd(rows as WalletTransactionRow[]);
}

/**
 * Fetch the active security policy for a user/wallet from Supabase.
 * For this implementation, we return a strict default if none exists.
 */
/**
 * Fetch the active security policy for a user/wallet from Supabase.
 * For this implementation, we return a strict default if none exists.
 */
export async function getAgentSecurityPolicy(_userId: string): Promise<SecurityPolicy> {
  // In a real app, fetch from DB: supabase.from('security_policies').select('*')...
  // Default strict policy for AI Agents:
  const globalSpendingLimitUsd = 50.0;
  const dailySpend = await fetchDailySpendUsd({ userId: _userId }).catch(() => null);

  return {
    globalSpendingLimitUsd, // $50 daily limit
    dailySpendAccumulatorUsd: typeof dailySpend === "number" ? dailySpend : globalSpendingLimitUsd,
    whitelistedAddresses: [],      // Empty whitelist = Block All (Strict Mode)
    whitelistedMethods: ["swap", "transfer"],
    requiresHumanApproval: false   // Set to true to force everything to manual review
  };
}

/**
 * Server Action: Validate a proposed transaction.
 * The AI MUST call this before suggesting execution.
 * The Signing Service MUST call this before signing.
 * 
 * @param intent The transaction intent
 * @param tokenPriceUsd Current price of the asset (in USD)
 */
export async function validateTransactionProposal(
  intent: TransactionIntent, 
  tokenPriceUsd: number = 0
) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { allowed: false, reason: "Internal Error: Database connection failed." };
  }
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { allowed: false, reason: "Unauthorized: No user session found." };
  }

  try {
    const policy = await getAgentSecurityPolicy(user.id);
    const result = PolicyEngine.validate(intent, policy, tokenPriceUsd);
    
    // Log the check for audit
    logger.debug(`[Governance] Policy Check for ${user.id}: ${result.allowed ? "PASS" : "FAIL"}`, result);
    
    return result;

  } catch (error) {
    logger.error("[Governance] Validation Error:", error);
    return { allowed: false, reason: "Internal Validation Error" };
  }
}
