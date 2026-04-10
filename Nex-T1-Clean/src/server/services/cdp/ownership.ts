import "server-only";

import { logger } from "@/lib/logger";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

type WalletAccountOwnershipRow = {
  address: string | null;
  platform: string | null;
  safe_address?: string | null;
  wallet_type?: string | null;
  provider?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type OwnedCdpWalletMatch = {
  address: string;
  platform: "evm" | "solana" | null;
};

function normalizeComparableAddress(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("0x") ? trimmed.toLowerCase() : trimmed;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function isCdpWalletAccount(row: WalletAccountOwnershipRow): boolean {
  const metadata = asRecord(row.metadata);
  const rowProvider = typeof row.provider === "string" ? row.provider.toLowerCase() : "";
  const rowWalletType = typeof row.wallet_type === "string" ? row.wallet_type.toLowerCase() : "";
  const source = typeof metadata?.source === "string" ? metadata.source.toLowerCase() : "";
  const provider = typeof metadata?.provider === "string" ? metadata.provider.toLowerCase() : "";
  const walletType = typeof metadata?.walletType === "string" ? metadata.walletType.toLowerCase() : "";

  return (
    rowProvider === "cdp" ||
    rowWalletType === "cdp" ||
    source === "cdp" ||
    source === "cdp_v2" ||
    provider === "cdp" ||
    walletType.includes("cdp")
  );
}

function getWalletAddressCandidates(row: WalletAccountOwnershipRow): string[] {
  const metadata = asRecord(row.metadata);
  const candidates = [
    row.address,
    row.safe_address ?? null,
    typeof metadata?.smartAccountAddress === "string" ? metadata.smartAccountAddress : null,
    typeof metadata?.smart_account_address === "string" ? metadata.smart_account_address : null,
    typeof metadata?.signerAddress === "string" ? metadata.signerAddress : null,
    typeof metadata?.signer_address === "string" ? metadata.signer_address : null,
    typeof metadata?.walletAddress === "string" ? metadata.walletAddress : null,
    typeof metadata?.wallet_address === "string" ? metadata.wallet_address : null,
    typeof metadata?.ownerEoa === "string" ? metadata.ownerEoa : null,
    typeof metadata?.owner_eoa === "string" ? metadata.owner_eoa : null,
    typeof metadata?.engineSmartAccountAddress === "string" ? metadata.engineSmartAccountAddress : null,
    typeof metadata?.engine_smart_account_address === "string"
      ? metadata.engine_smart_account_address
      : null,
    typeof metadata?.engineAccountAddress === "string" ? metadata.engineAccountAddress : null,
    typeof metadata?.engine_account_address === "string" ? metadata.engine_account_address : null,
  ];

  return candidates.filter((candidate): candidate is string => Boolean(normalizeComparableAddress(candidate)));
}

export async function resolveOwnedCdpWallet(
  userId: string,
  address: string,
  options?: { agentId?: string },
): Promise<OwnedCdpWalletMatch | null> {
  const supabase = getSupabaseAdminClient();
  const normalizedAddress = normalizeComparableAddress(address);

  if (!normalizedAddress) {
    return null;
  }

  if (options?.agentId) {
    const { data, error } = await supabase
      .from("agent_wallets")
      .select("address, agent:agent!inner(owner_user_id)")
      .eq("agent.owner_user_id", userId)
      .eq("agent_id", options.agentId)
      .eq("status", "active");

    if (error) {
      logger.error("cdp_ops_ownership_check_failed", {
        userId,
        address,
        agentId: options.agentId,
        error: error.message,
      });
      return null;
    }

    const match = (data ?? []).find((row) => {
      const candidate = normalizeComparableAddress((row as { address?: string | null }).address ?? null);
      return candidate === normalizedAddress;
    });

    if (!match) {
      return null;
    }

    return {
      address: (match as { address?: string | null }).address?.trim() ?? address.trim(),
      platform: "evm",
    };
  }

  const { data, error } = await supabase
    .from("wallet_accounts")
    .select("address,platform,safe_address,wallet_type,provider,metadata")
    .eq("user_id", userId);

  if (error) {
    logger.error("cdp_ops_ownership_check_failed", {
      userId,
      address,
      error: error.message,
    });
    return null;
  }

  const rows = (data ?? []) as WalletAccountOwnershipRow[];
  const match = rows.find((row) => {
    if (!isCdpWalletAccount(row)) {
      return false;
    }

    return getWalletAddressCandidates(row).some((candidate) => {
      return normalizeComparableAddress(candidate) === normalizedAddress;
    });
  });

  const canonicalAddress = typeof match?.address === "string" ? match.address.trim() : null;
  if (!match || !canonicalAddress) {
    return null;
  }

  return {
    address: canonicalAddress,
    platform:
      match.platform === "evm" || match.platform === "solana"
        ? match.platform
        : null,
  };
}

export async function verifyCdpWalletOwnership(
  userId: string,
  address: string,
  options?: { agentId?: string },
): Promise<boolean> {
  const resolved = await resolveOwnedCdpWallet(userId, address, options);
  return resolved !== null;
}
