import "server-only";

import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

export type RewardPayoutStatus =
  | "pending_wallet"
  | "blocked"
  | "submitted"
  | "confirmed"
  | "failed";

export type RewardPayoutRecord = {
  id: string;
  rewardType: string;
  subjectUserId: string;
  counterpartyUserId: string | null;
  referralConversionId: string | null;
  networkSlug: string;
  walletAddress: string | null;
  amountBaseUnits: number;
  status: RewardPayoutStatus;
  blockedReason: string | null;
  ipHash: string | null;
  deviceFingerprintHash: string | null;
  transactionHash: string | null;
  idempotencyKey: string;
  metadata: Record<string, UntypedJson>;
  submittedAt: string | null;
  confirmedAt: string | null;
};

type RewardPayoutInsert = Omit<RewardPayoutRecord, "id">;

function fromRow(row: Record<string, UntypedJson>): RewardPayoutRecord {
  return {
    id: String(row.id),
    rewardType: String(row.reward_type),
    subjectUserId: String(row.subject_user_id),
    counterpartyUserId:
      typeof row.counterparty_user_id === "string" ? row.counterparty_user_id : null,
    referralConversionId:
      typeof row.referral_conversion_id === "string" ? row.referral_conversion_id : null,
    networkSlug: typeof row.network_slug === "string" ? row.network_slug : "base-mainnet",
    walletAddress: typeof row.wallet_address === "string" ? row.wallet_address : null,
    amountBaseUnits: Number(row.amount_base_units ?? 0),
    status: String(row.status) as RewardPayoutStatus,
    blockedReason: typeof row.blocked_reason === "string" ? row.blocked_reason : null,
    ipHash: typeof row.ip_hash === "string" ? row.ip_hash : null,
    deviceFingerprintHash:
      typeof row.device_fingerprint_hash === "string" ? row.device_fingerprint_hash : null,
    transactionHash: typeof row.transaction_hash === "string" ? row.transaction_hash : null,
    idempotencyKey: String(row.idempotency_key),
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, UntypedJson>)
        : {},
    submittedAt: typeof row.submitted_at === "string" ? row.submitted_at : null,
    confirmedAt: typeof row.confirmed_at === "string" ? row.confirmed_at : null,
  };
}

function toRow(record: RewardPayoutInsert | RewardPayoutRecord) {
  return {
    reward_type: record.rewardType,
    subject_user_id: record.subjectUserId,
    counterparty_user_id: record.counterpartyUserId,
    referral_conversion_id: record.referralConversionId,
    network_slug: record.networkSlug,
    wallet_address: record.walletAddress,
    amount_base_units: record.amountBaseUnits,
    status: record.status,
    blocked_reason: record.blockedReason,
    ip_hash: record.ipHash,
    device_fingerprint_hash: record.deviceFingerprintHash,
    transaction_hash: record.transactionHash,
    idempotency_key: record.idempotencyKey,
    metadata: record.metadata,
    submitted_at: record.submittedAt,
    confirmed_at: record.confirmedAt,
    updated_at: new Date().toISOString(),
  };
}

export async function findRewardPayoutByIdempotencyKey(
  idempotencyKey: string,
): Promise<RewardPayoutRecord | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("usdc_reward_payouts")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? fromRow(data as Record<string, UntypedJson>) : null;
}

export async function createRewardPayout(
  record: RewardPayoutInsert,
): Promise<RewardPayoutRecord> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("usdc_reward_payouts")
    .insert({
      ...toRow(record),
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return fromRow(data as Record<string, UntypedJson>);
}

export async function updateRewardPayout(
  payoutId: string,
  record: RewardPayoutRecord,
): Promise<RewardPayoutRecord> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("usdc_reward_payouts")
    .update(toRow(record))
    .eq("id", payoutId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return fromRow(data as Record<string, UntypedJson>);
}
