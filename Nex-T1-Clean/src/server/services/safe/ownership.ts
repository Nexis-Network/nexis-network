import { type Address } from "viem";

import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { isNonZeroEVMAddress } from "@/lib/utils/token-utils";

export type SafeOwnershipRecord = {
  chainId: number;
  safeAddress: Address;
  status: string;
  metadata: Record<string, UntypedJson> | null;
};

export async function assertUserOwnsSafeWallet(params: {
  userId: string;
  chainId: number;
  safeAddress: string;
  requireReady?: boolean;
}): Promise<SafeOwnershipRecord> {
  const safeAddress = params.safeAddress.trim();
  if (!isNonZeroEVMAddress(safeAddress)) {
    throw new Error("invalid_safe_address");
  }

  const supabase = getSupabaseAdminClient();
  const primaryLookup = await supabase
    .from("wallet_accounts")
    .select("chain_id,safe_address,address,status,metadata")
    .eq("user_id", params.userId)
    .eq("chain_id", params.chainId)
    .eq("safe_address", safeAddress)
    .in("wallet_type", ["safe", "dao_safe"])
    .maybeSingle();

  const { data, error } =
    primaryLookup.data
      ? primaryLookup
      : await supabase
          .from("wallet_accounts")
          .select("chain_id,safe_address,address,status,metadata")
          .eq("user_id", params.userId)
          .eq("chain_id", params.chainId)
          .eq("address", safeAddress)
          .in("wallet_type", ["safe", "dao_safe"])
          .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("safe_not_found");
  }

  const status = String(data.status ?? "");
  if (params.requireReady && status !== "ready") {
    throw new Error("safe_not_ready");
  }

  return {
    chainId: data.chain_id as number,
    safeAddress: (data.safe_address ?? data.address) as Address,
    status,
    metadata: (data.metadata as Record<string, UntypedJson> | null) ?? null,
  };
}
