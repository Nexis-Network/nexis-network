import "server-only";

import {
  type RewardIdentitySignal,
  getRewardIdentitySignalsByUserIds,
} from "@/server/services/rewards/reward-signal";
import { type RewardPayoutRecord } from "@/server/services/rewards/reward-payout-repository";
import {
  ensureRewardPayout,
  resolveBaseSmartWalletAddress,
  submitRewardPayout,
} from "@/server/services/rewards/usdc-payout";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

const PAID_REFERRAL_PLAN_SET = new Set(["pro", "trader", "ultra", "enterprise"]);
const REFERRAL_REWARD_AMOUNT_BASE_UNITS = 1_000_000;

function resolveComparableSignal(
  signal: RewardIdentitySignal | undefined,
  field: "ip" | "device",
): string | null {
  if (!signal) {
    return null;
  }

  if (field === "ip") {
    return signal.firstIpHash ?? signal.lastIpHash ?? null;
  }

  return signal.firstDeviceFingerprintHash ?? signal.lastDeviceFingerprintHash ?? null;
}

function resolveReferralBlockReason(
  inviterSignal: RewardIdentitySignal | undefined,
  referredSignal: RewardIdentitySignal | undefined,
): string | null {
  const inviterIp = resolveComparableSignal(inviterSignal, "ip");
  const referredIp = resolveComparableSignal(referredSignal, "ip");
  if (inviterIp && referredIp && inviterIp === referredIp) {
    return "referral_shared_ip";
  }

  const inviterDevice = resolveComparableSignal(inviterSignal, "device");
  const referredDevice = resolveComparableSignal(referredSignal, "device");
  if (inviterDevice && referredDevice && inviterDevice === referredDevice) {
    return "referral_shared_device";
  }

  return null;
}

async function createReferralRewardPayout(params: {
  rewardType: "referral_paid_referrer" | "referral_paid_referred";
  subjectUserId: string;
  counterpartyUserId: string;
  referralConversionId: string;
  walletAddress: string | null;
  blockedReason: string | null;
  metadata: Record<string, UntypedJson>;
}): Promise<RewardPayoutRecord> {
  return ensureRewardPayout({
    rewardType: params.rewardType,
    subjectUserId: params.subjectUserId,
    counterpartyUserId: params.counterpartyUserId,
    referralConversionId: params.referralConversionId,
    networkSlug: "base-mainnet",
    walletAddress: params.walletAddress,
    amountBaseUnits: REFERRAL_REWARD_AMOUNT_BASE_UNITS,
    status: params.blockedReason ? "blocked" : "pending_wallet",
    blockedReason: params.blockedReason,
    ipHash: null,
    deviceFingerprintHash: null,
    transactionHash: null,
    idempotencyKey: `${params.rewardType}:${params.referralConversionId}`,
    metadata: params.metadata,
    submittedAt: null,
    confirmedAt: null,
  });
}

export async function processReferralPaidUsdcRewardsForCustomer(
  customerId: string,
): Promise<void> {
  if (!customerId) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("user_id, plan")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (profileError || !profile?.user_id) {
    if (profileError) {
      throw profileError;
    }
    return;
  }

  const plan = typeof profile.plan === "string" ? profile.plan.toLowerCase() : "";
  if (!PAID_REFERRAL_PLAN_SET.has(plan)) {
    return;
  }

  const { data: conversion, error: conversionError } = await supabase
    .from("referral_conversions")
    .select("id, inviter_user_id, referred_user_id")
    .eq("referred_user_id", profile.user_id)
    .maybeSingle();

  if (conversionError || !conversion?.id) {
    if (conversionError) {
      throw conversionError;
    }
    return;
  }

  const inviterUserId = String(conversion.inviter_user_id);
  const referredUserId = String(conversion.referred_user_id);
  const signals = await getRewardIdentitySignalsByUserIds([inviterUserId, referredUserId]);
  const blockReason = resolveReferralBlockReason(
    signals.get(inviterUserId),
    signals.get(referredUserId),
  );

  const [inviterWalletAddress, referredWalletAddress] = await Promise.all([
    resolveBaseSmartWalletAddress(inviterUserId),
    resolveBaseSmartWalletAddress(referredUserId),
  ]);

  const metadata = {
    customerId,
    plan,
    missingIdentitySignals:
      !signals.get(inviterUserId) || !signals.get(referredUserId),
  };

  const [inviterPayout, referredPayout] = await Promise.all([
    createReferralRewardPayout({
      rewardType: "referral_paid_referrer",
      subjectUserId: inviterUserId,
      counterpartyUserId: referredUserId,
      referralConversionId: String(conversion.id),
      walletAddress: inviterWalletAddress,
      blockedReason: blockReason,
      metadata,
    }),
    createReferralRewardPayout({
      rewardType: "referral_paid_referred",
      subjectUserId: referredUserId,
      counterpartyUserId: inviterUserId,
      referralConversionId: String(conversion.id),
      walletAddress: referredWalletAddress,
      blockedReason: blockReason,
      metadata,
    }),
  ]);

  if (blockReason) {
    return;
  }

  if (inviterWalletAddress) {
    await submitRewardPayout(inviterPayout, inviterWalletAddress);
  }

  if (referredWalletAddress) {
    await submitRewardPayout(referredPayout, referredWalletAddress);
  }
}
