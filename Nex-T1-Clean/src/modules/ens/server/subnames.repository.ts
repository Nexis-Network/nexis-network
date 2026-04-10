import "server-only";

import { createServiceRoleClient } from "@/server/services/supabase/service-role";

import type { EnsClaimStatus, UserEnsSubnameRecord } from "./subnames.types";

const ENS_STATUS_SELECT = [
  "id",
  "user_id",
  "wallet_address",
  "label",
  "ens_name",
  "chain_id",
  "status",
  "mainnet_claim_tx_hash",
  "mainnet_reverse_tx_hash",
  "base_reverse_tx_hash",
  "base_reverse_user_op_hash",
  "signature_expiry",
  "mainnet_reverse_signature",
  "base_reverse_signature",
  "mainnet_claimed_at",
  "reverse_name_set_at",
  "last_error",
  "metadata",
  "created_at",
  "updated_at",
].join(",");

type ClaimUpsertInput = {
  wallet_address: string;
  label: string;
  ens_name: string;
  status: EnsClaimStatus;
  chain_id?: number;
  mainnet_claim_tx_hash?: string | null;
  mainnet_reverse_tx_hash?: string | null;
  base_reverse_tx_hash?: string | null;
  base_reverse_user_op_hash?: string | null;
  signature_expiry?: string | null;
  mainnet_reverse_signature?: string | null;
  base_reverse_signature?: string | null;
  mainnet_claimed_at?: string | null;
  reverse_name_set_at?: string | null;
  last_error?: string | null;
  metadata?: Record<string, UntypedJson>;
};

type ClaimPatchInput = Partial<ClaimUpsertInput>;

export async function getClaimRecord(
  userId: string,
): Promise<UserEnsSubnameRecord | null> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("user_ens_subnames")
    .select(ENS_STATUS_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as UserEnsSubnameRecord | null) ?? null;
}

export async function getCurrentProfileLabel(userId: string): Promise<string | null> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return typeof data?.username === "string" ? data.username : null;
}

export async function lookupEnsSubnameByAddress(
  walletAddress: string,
): Promise<string | null> {
  const normalizedAddress =
    typeof walletAddress === "string" ? walletAddress.trim().toLowerCase() : "";

  if (!normalizedAddress) {
    return null;
  }

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("user_ens_subnames")
    .select("ens_name")
    .ilike("wallet_address", normalizedAddress)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return typeof data?.ens_name === "string" ? data.ens_name : null;
}

export async function isLabelReservedByAnotherUser(
  userId: string,
  label: string,
): Promise<boolean> {
  const service = createServiceRoleClient();
  const [{ data: conflictingProfile }, { data: conflictingClaim }] =
    await Promise.all([
      service
        .from("profiles")
        .select("id")
        .ilike("username", label)
        .neq("id", userId)
        .maybeSingle(),
      service
        .from("user_ens_subnames")
        .select("user_id,status")
        .eq("label", label)
        .neq("user_id", userId)
        .neq("status", "failed")
        .maybeSingle(),
    ]);

  return Boolean(conflictingProfile || conflictingClaim);
}

export async function upsertClaimRecord(
  userId: string,
  input: ClaimUpsertInput,
): Promise<UserEnsSubnameRecord> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("user_ens_subnames")
    .upsert(
      {
        user_id: userId,
        wallet_address: input.wallet_address,
        label: input.label,
        ens_name: input.ens_name,
        chain_id: input.chain_id ?? 1,
        status: input.status,
        mainnet_claim_tx_hash: input.mainnet_claim_tx_hash ?? null,
        mainnet_reverse_tx_hash: input.mainnet_reverse_tx_hash ?? null,
        base_reverse_tx_hash: input.base_reverse_tx_hash ?? null,
        base_reverse_user_op_hash: input.base_reverse_user_op_hash ?? null,
        signature_expiry: input.signature_expiry ?? null,
        mainnet_reverse_signature: input.mainnet_reverse_signature ?? null,
        base_reverse_signature: input.base_reverse_signature ?? null,
        mainnet_claimed_at: input.mainnet_claimed_at ?? null,
        reverse_name_set_at: input.reverse_name_set_at ?? null,
        last_error: input.last_error ?? null,
        metadata: input.metadata ?? {},
      } satisfies Record<string, UntypedJson>,
      { onConflict: "user_id" },
    )
    .select(ENS_STATUS_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to upsert ENS claim.");
  }

  return data as unknown as UserEnsSubnameRecord;
}

export async function updateClaimRecord(
  userId: string,
  patch: ClaimPatchInput,
): Promise<UserEnsSubnameRecord> {
  const service = createServiceRoleClient();
  const normalizedPatch = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => typeof value !== "undefined"),
  );
  const { data, error } = await service
    .from("user_ens_subnames")
    .update(normalizedPatch as Record<string, UntypedJson>)
    .eq("user_id", userId)
    .select(ENS_STATUS_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update ENS claim.");
  }

  return data as unknown as UserEnsSubnameRecord;
}
