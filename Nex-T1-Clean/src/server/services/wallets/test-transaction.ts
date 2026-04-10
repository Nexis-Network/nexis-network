import "server-only";

import { createHash } from "crypto";

import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

export type WalletTestChainType = "evm" | "solana" | "stellar";

export type WalletTestTransactionInput = {
  userId: string;
  walletId: string;
  chainType: WalletTestChainType;
  to: string;
  amount: string;
};

export type WalletTestTransactionResult = {
  chainType: WalletTestChainType;
  txId: string;
  status: "simulated_success" | "simulated_failure";
  simulated: true;
};

function normalizeString(value: string): string {
  return value.trim();
}

export function isWalletTestTransactionEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  return (
    process.env.E2E_TEST_MODE === "true" ||
    process.env.NEXT_PUBLIC_TEST_MODE === "true"
  );
}

export function buildDeterministicTestTxId(params: {
  chainType: WalletTestChainType;
  userId: string;
  walletId: string;
  to: string;
  amount: string;
}): string {
  const seed = [
    params.chainType,
    normalizeString(params.userId),
    normalizeString(params.walletId),
    normalizeString(params.to),
    normalizeString(params.amount),
  ].join("|");
  const digest = createHash("sha256").update(seed).digest("hex");

  if (params.chainType === "evm") {
    return `0x${digest.slice(0, 64)}`;
  }

  return `sim_${params.chainType}_${digest.slice(0, 48)}`;
}

async function assertWalletOwnership(params: {
  userId: string;
  walletId: string;
  chainType: WalletTestChainType;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const walletId = normalizeString(params.walletId);

  const { data: accountRow, error: accountError } = await supabase
    .from("wallet_accounts")
    .select("id,wallet_id,wallet_type,platform,metadata")
    .eq("user_id", params.userId)
    .or(`wallet_id.eq.${walletId},id.eq.${walletId}`)
    .limit(1)
    .maybeSingle();

  if (accountError) {
    throw new Error(`wallet_lookup_failed:${accountError.message}`);
  }

  if (accountRow) {
    const walletType =
      typeof accountRow.wallet_type === "string"
        ? accountRow.wallet_type.toLowerCase()
        : "";
    const platform =
      typeof accountRow.platform === "string"
        ? accountRow.platform.toLowerCase()
        : "";
    const metadata =
      accountRow.metadata &&
      typeof accountRow.metadata === "object" &&
      !Array.isArray(accountRow.metadata)
        ? (accountRow.metadata as Record<string, unknown>)
        : {};
    const metadataKind =
      typeof metadata.kind === "string" ? metadata.kind.toLowerCase() : "";

    const isCrossmint = walletType === "crossmint";
    const isSafe = walletType === "safe" || walletType === "smart_wallet";

    if (params.chainType === "evm" && !isSafe && platform !== "evm") {
      throw new Error("wallet_chain_mismatch");
    }
    if (params.chainType === "solana" && !isCrossmint) {
      throw new Error("wallet_chain_mismatch");
    }
    if (params.chainType === "solana" && metadataKind && metadataKind !== "solana") {
      throw new Error("wallet_chain_mismatch");
    }
    if (params.chainType === "stellar" && !isCrossmint) {
      throw new Error("wallet_chain_mismatch");
    }
    if (params.chainType === "stellar" && metadataKind && metadataKind !== "stellar") {
      throw new Error("wallet_chain_mismatch");
    }
    return;
  }

  const { data: registeredRow, error: registeredError } = await supabase
    .from("user_wallets")
    .select("id,wallet_type")
    .eq("user_id", params.userId)
    .eq("id", walletId)
    .limit(1)
    .maybeSingle();

  if (registeredError) {
    throw new Error(`wallet_lookup_failed:${registeredError.message}`);
  }

  if (!registeredRow) {
    throw new Error("wallet_not_found");
  }

  const walletType =
    typeof registeredRow.wallet_type === "string"
      ? registeredRow.wallet_type.toLowerCase()
      : "";
  if (params.chainType === "evm" && walletType.includes("solana")) {
    throw new Error("wallet_chain_mismatch");
  }
  if (params.chainType === "solana" && !walletType.includes("solana")) {
    throw new Error("wallet_chain_mismatch");
  }
  if (params.chainType === "stellar") {
    throw new Error("wallet_chain_mismatch");
  }
}

function shouldSimulateFailure(amount: string): boolean {
  const normalized = normalizeString(amount);
  if (!normalized) return true;
  if (!/^\d+(\.\d+)?$/u.test(normalized)) return true;
  if (normalized === "0" || normalized === "0.0") return true;

  // Deterministic failure trigger for UI and E2E verification.
  return normalized.endsWith("13");
}

export async function runWalletTestTransaction(
  input: WalletTestTransactionInput,
): Promise<WalletTestTransactionResult> {
  if (!isWalletTestTransactionEnabled()) {
    throw new Error("wallet_test_transactions_disabled");
  }

  await assertWalletOwnership({
    userId: input.userId,
    walletId: input.walletId,
    chainType: input.chainType,
  });

  const txId = buildDeterministicTestTxId({
    chainType: input.chainType,
    userId: input.userId,
    walletId: input.walletId,
    to: input.to,
    amount: input.amount,
  });

  if (shouldSimulateFailure(input.amount)) {
    return {
      chainType: input.chainType,
      txId,
      status: "simulated_failure",
      simulated: true,
    };
  }

  return {
    chainType: input.chainType,
    txId,
    status: "simulated_success",
    simulated: true,
  };
}

