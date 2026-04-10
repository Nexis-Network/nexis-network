import "server-only";

import { getAddress, type Address } from "viem";

import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { provisionCdpWalletsForUser } from "@/server/services/cdp/provision";

const CDP_EVM_WALLET_ID = "cdp:evm:smart";

async function fetchSmartWalletAddress(userId: string): Promise<Address | null> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("wallet_accounts")
    .select("address")
    .eq("user_id", userId)
    .eq("wallet_id", CDP_EVM_WALLET_ID)
    .eq("status", "ready")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (typeof data?.address !== "string" || data.address.trim().length === 0) {
    return null;
  }

  return getAddress(data.address);
}

export async function ensureSmartWalletAddress(
  userId: string,
  email?: string | null,
): Promise<Address> {
  const existing = await fetchSmartWalletAddress(userId);
  if (existing) {
    return existing;
  }

  const provisioned = await provisionCdpWalletsForUser({
    userId,
    email: email ?? null,
  });

  if (provisioned.evmSmartAccountAddress) {
    return getAddress(provisioned.evmSmartAccountAddress);
  }

  const afterProvision = await fetchSmartWalletAddress(userId);
  if (!afterProvision) {
    throw new Error("CDP smart wallet is not ready for ENS claiming.");
  }

  return afterProvision;
}

export async function setWalletLabel(
  userId: string,
  walletAddress: Address,
  ensName: string,
): Promise<void> {
  const service = createServiceRoleClient();
  const { error } = await service
    .from("wallet_accounts")
    .update({
      label: ensName,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("wallet_id", CDP_EVM_WALLET_ID)
    .ilike("address", walletAddress);

  if (error) {
    throw new Error(error.message);
  }
}

export async function setProfileUsername(
  userId: string,
  label: string,
  onboardingCompleted: boolean,
): Promise<void> {
  const service = createServiceRoleClient();
  const { error } = await service.from("profiles").upsert({
    id: userId,
    username: label,
    onboarding_completed: onboardingCompleted,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }
}
