import "server-only";

import { type Hex, createWalletClient, erc20Abi, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

import {
  createRewardPayout,
  findRewardPayoutByIdempotencyKey,
  type RewardPayoutRecord,
  updateRewardPayout,
} from "@/server/services/rewards/reward-payout-repository";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

function getRewardTreasuryConfig() {
  const privateKey = process.env.USDC_REWARD_TREASURY_PRIVATE_KEY?.trim();
  if (!privateKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("USDC_REWARD_TREASURY_PRIVATE_KEY is required in production.");
    }
    return null;
  }

  return {
    privateKey: (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as Hex,
    rpcUrl: process.env.BASE_RPC_URL?.trim() || "https://mainnet.base.org",
  };
}

export async function resolveBaseSmartWalletAddress(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("wallet_accounts")
    .select("address")
    .eq("user_id", userId)
    .eq("network_slug", "base-mainnet")
    .eq("wallet_type", "cdp-smart")
    .eq("status", "ready")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return typeof data?.address === "string" ? data.address : null;
}

export async function ensureRewardPayout(
  payout: Omit<RewardPayoutRecord, "id">,
): Promise<RewardPayoutRecord> {
  const existing = await findRewardPayoutByIdempotencyKey(payout.idempotencyKey);
  if (existing) {
    return existing;
  }

  return createRewardPayout(payout);
}

export async function submitRewardPayout(
  payout: RewardPayoutRecord,
  walletAddress: string,
): Promise<RewardPayoutRecord> {
  if (payout.status !== "pending_wallet") {
    return payout;
  }

  const treasuryConfig = getRewardTreasuryConfig();
  if (!treasuryConfig) {
    return updateRewardPayout(payout.id, {
      ...payout,
      walletAddress,
      status: "failed",
      metadata: {
        ...payout.metadata,
        error: "usdc_reward_treasury_unconfigured",
      },
    });
  }

  const transport = http(treasuryConfig.rpcUrl);
  const walletClient = createWalletClient({
    account: privateKeyToAccount(treasuryConfig.privateKey),
    chain: base,
    transport,
  });

  const transactionHash = await walletClient.writeContract({
    address: BASE_USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "transfer",
    args: [walletAddress as Hex, BigInt(payout.amountBaseUnits)],
  });

  return updateRewardPayout(payout.id, {
    ...payout,
    walletAddress,
    status: "submitted",
    transactionHash,
    submittedAt: payout.submittedAt ?? new Date().toISOString(),
  });
}
