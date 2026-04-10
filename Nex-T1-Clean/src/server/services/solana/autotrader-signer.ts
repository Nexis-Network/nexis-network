import "server-only";

import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { Keypair } from "@solana/web3.js";
import { normalizeSolanaAddress } from "@/server/moralis/validation";
import bs58 from "bs58";

import { logger } from "@/lib/logger";

export const SOLANA_MAINNET_CHAIN_ID = 101;
export const SOLANA_DEVNET_CHAIN_ID = 102;

export type SolanaSigningMode = "non_custodial" | "custodial_legacy";

type SolanaAutotradeSigningErrorReason =
  | "missing_wallet"
  | "wallet_not_owned"
  | "wallet_chain_mismatch"
  | "chain_id_unresolved"
  | "no_session_key"
  | "invalid_session_key"
  | "legacy_signer_missing"
  | "legacy_signer_invalid"
  | "wallet_ownership_lookup_failed";

type SolanaWalletRow = {
  chain_id: number | null;
  cluster: string | null;
  wallet_type: string | null;
};

type SolanaSessionKeyRow = {
  id: string;
  encrypted_session_private_key: string;
};

export type SolanaAutotraderSigner = {
  signer: Keypair;
  source: "non_custodial" | "custodial_legacy";
  walletAddress: string;
  chainId: number;
};

export type SolanaAutotraderSignerResult =
  | {
      ok: true;
      signer: SolanaAutotraderSigner;
    }
  | {
      ok: false;
      reason: SolanaAutotradeSigningErrorReason;
      detail?: string;
    };

function mapClusterToChainId(cluster: "mainnet-beta" | "devnet"): number {
  return cluster === "devnet" ? SOLANA_DEVNET_CHAIN_ID : SOLANA_MAINNET_CHAIN_ID;
}

function isSolanaWalletOwnedByUser(records: SolanaWalletRow[] | null, chainId: number): boolean {
  if (!Array.isArray(records) || records.length === 0) {
    return false;
  }

  const cluster = chainId === SOLANA_DEVNET_CHAIN_ID ? "devnet" : "mainnet";

  return records.some((row) => {
    if (row.wallet_type && !String(row.wallet_type).toLowerCase().includes("solana")) {
      return false;
    }
    if (row.chain_id != null && row.chain_id === chainId) {
      return true;
    }
    if (row.chain_id == null && row.cluster && row.cluster.toLowerCase().includes(cluster)) {
      return true;
    }
    return false;
  });
}

function decodeSolanaSecretKey(raw: string): Uint8Array {
  const trimmed = raw.trim();

  const parsedArray = (value: UntypedJson): value is number[] => {
    if (!Array.isArray(value) || value.length !== 64) return false;
    return value.every((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 255);
  };

  try {
    if (!trimmed) {
      throw new Error("empty key payload");
    }

    try {
      const byHex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
      if (/^[0-9a-fA-F]+$/.test(byHex) && byHex.length === 128) {
        const bytes = new Uint8Array(32);
        for (let i = 0; i < byHex.length; i += 2) {
          bytes[i / 2] = Number.parseInt(byHex.slice(i, i + 2), 16);
        }
        return bytes;
      }
    } catch {
      // continue
    }

    try {
      const decoded = bs58.decode(trimmed);
      if (decoded.length === 64) {
        return decoded;
      }
    } catch {
      // continue
    }

    try {
      const decodedBase64 = Buffer.from(trimmed, "base64");
      if (decodedBase64.length === 64) {
        return decodedBase64;
      }
    } catch {
      // continue
    }

    const parsed = JSON.parse(trimmed);
    if (parsedArray(parsed)) {
      return Uint8Array.from(parsed);
    }

    const decodedFromRaw = Buffer.from(trimmed, "base64");
    if (decodedFromRaw.length === 64) {
      return decodedFromRaw;
    }

    throw new Error("Unsupported or malformed solana secret key format");
  } catch (error) {
    throw new Error(`Unable to decode Solana secret key: ${error instanceof Error ? error.message : "invalid"}`);
  }
}

function decodeSessionKey(row: SolanaSessionKeyRow): Keypair {
  const raw = row.encrypted_session_private_key?.trim();
  if (!raw) {
    throw new Error("Session key material is empty");
  }

  const secretKey = decodeSolanaSecretKey(raw);
  return Keypair.fromSecretKey(secretKey);
}

function resolveSolanaOwnerWalletAndChain(
  records: SolanaWalletRow[] | null,
  cluster: "mainnet-beta" | "devnet",
  chainId?: number,
): { chainId: number; isOwned: boolean } {
  const effectiveChainId = chainId && chainId > 0 ? chainId : mapClusterToChainId(cluster);
  return {
    chainId: effectiveChainId,
    isOwned: isSolanaWalletOwnedByUser(records, effectiveChainId),
  };
}

async function resolveNonCustodialSigner(
  userId: string,
  walletAddress: string,
  cluster: "mainnet-beta" | "devnet",
  chainId?: number,
): Promise<SolanaAutotraderSignerResult> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "wallet_ownership_lookup_failed",
      detail: "Database client unavailable",
    };
  }

  let normalizedWallet = walletAddress;
  try {
    normalizedWallet = normalizeSolanaAddress(walletAddress);
  } catch {
    return {
      ok: false,
      reason: "wallet_not_owned",
      detail: "Invalid Solana wallet address",
    };
  }

  let ownedWalletRows: SolanaWalletRow[] | null = null;
  const ownerResult = await supabase
    .from("user_wallets")
    .select("chain_id,cluster,wallet_type")
    .eq("user_id", userId)
    .ilike("address", normalizedWallet);

  if (ownerResult.error) {
    logger.error(
      "[autotrader][signer] wallet ownership lookup failed",
      ownerResult.error.message,
      { userId, walletAddress: normalizedWallet },
    );
    return {
      ok: false,
      reason: "wallet_ownership_lookup_failed",
      detail: "Failed to verify wallet ownership",
    };
  }

  if (Array.isArray(ownerResult.data) && ownerResult.data.length > 0) {
    ownedWalletRows = ownerResult.data as SolanaWalletRow[];
  }

  const resolvedChain = resolveSolanaOwnerWalletAndChain(ownedWalletRows, cluster, chainId);
  if (!resolvedChain.isOwned) {
    return {
      ok: false,
      reason: ownerResult.data?.length ? "wallet_chain_mismatch" : "wallet_not_owned",
      detail: ownerResult.data?.length
        ? "Wallet does not match requested cluster/chain"
        : "Wallet not found for user",
    };
  }

  if (!Number.isInteger(resolvedChain.chainId) || resolvedChain.chainId <= 0) {
    return {
      ok: false,
      reason: "chain_id_unresolved",
      detail: "Could not resolve Solana chain id",
    };
  }

  const keyResult = await supabase.rpc("get_active_session_key", {
    p_user_id: userId,
    p_wallet_address: normalizedWallet.toLowerCase(),
    p_chain_id: resolvedChain.chainId,
  });

  if (keyResult.error) {
    logger.warn("[autotrader][signer] session key lookup failed", keyResult.error.message, {
      userId,
      walletAddress: normalizedWallet,
      chainId: resolvedChain.chainId,
    });
    return {
      ok: false,
      reason: "no_session_key",
      detail: "No active non-custodial session key found",
    };
  }

  const rows = keyResult.data as unknown as SolanaSessionKeyRow[];
  if (!Array.isArray(rows) || rows.length === 0 || !rows[0]?.encrypted_session_private_key) {
    return {
      ok: false,
      reason: "no_session_key",
      detail: "No active non-custodial session key found",
    };
  }

  try {
    return {
      ok: true,
      signer: {
        signer: decodeSessionKey(rows[0]),
        source: "non_custodial",
        walletAddress: normalizedWallet,
        chainId: resolvedChain.chainId,
      },
    };
  } catch {
    return {
      ok: false,
      reason: "invalid_session_key",
      detail: "Stored session key payload is invalid",
    };
  }
}

function decodeSolanaSecretKeyB58(b58: string): Keypair {
  const bytes = bs58.decode(b58.trim());
  if (bytes.length !== 64) {
    throw new Error("SOLANA_AUTOTRADER_PRIVATE_KEY_B58 must decode to 64 bytes");
  }
  return Keypair.fromSecretKey(bytes);
}

export function getSolanaAutotraderSigner(): Keypair | null {
  const raw = process.env.SOLANA_AUTOTRADER_PRIVATE_KEY_B58?.trim();
  if (!raw) return null;
  return decodeSolanaSecretKeyB58(raw);
}

export function resolveSolanaClusterChainId(
  cluster: "mainnet-beta" | "devnet",
  chainId?: number,
): number {
  return chainId && Number.isInteger(chainId) && chainId > 0 ? chainId : mapClusterToChainId(cluster);
}

export async function resolveSolanaAutotradeSigner(
  input: {
    userId: string;
    cluster: "mainnet-beta" | "devnet";
    signingMode: SolanaSigningMode;
    walletAddress?: string;
    chainId?: number;
  },
): Promise<SolanaAutotraderSignerResult> {
  if (input.signingMode === "custodial_legacy") {
    try {
      const signer = getSolanaAutotraderSigner();
      if (!signer) {
        return {
          ok: false,
          reason: "legacy_signer_missing",
          detail: "SOLANA_AUTOTRADER_PRIVATE_KEY_B58 is not configured",
        };
      }
      return {
        ok: true,
        signer: {
          signer,
          source: "custodial_legacy",
          walletAddress: signer.publicKey.toBase58(),
          chainId: resolveSolanaClusterChainId(input.cluster, input.chainId),
        },
      };
    } catch {
      return {
        ok: false,
        reason: "legacy_signer_invalid",
        detail: "SOLANA_AUTOTRADER_PRIVATE_KEY_B58 is invalid",
      };
    }
  }

  if (!input.walletAddress) {
    return {
      ok: false,
      reason: "missing_wallet",
      detail: "Wallet address is required for non-custodial execution",
    };
  }

  return resolveNonCustodialSigner(
    input.userId,
    input.walletAddress,
    input.cluster,
    input.chainId,
  );
}
