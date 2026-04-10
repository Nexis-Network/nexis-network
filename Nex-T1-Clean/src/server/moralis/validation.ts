import "server-only";

import bs58 from "bs58";
import { getAddress, isAddress } from "viem";

export type SolanaNetwork = "mainnet" | "devnet";
export type MoralisChainFilter = `0x${string}` | "solana";

export function normalizeEvmAddress(input: string): string {
  const trimmed = input.trim();
  if (!isAddress(trimmed)) {
    throw new Error("Invalid EVM address");
  }
  return getAddress(trimmed);
}

export function normalizeEvmChain(input: string | number | null | undefined, fallback: `0x${string}` = "0x1"): `0x${string}` {
  if (typeof input === "number" && Number.isFinite(input) && input > 0) {
    return `0x${Math.trunc(input).toString(16)}` as `0x${string}`;
  }

  const raw = typeof input === "string" ? input.trim().toLowerCase() : "";
  if (!raw) return fallback;

  if (/^0x[0-9a-f]+$/.test(raw)) {
    return raw as `0x${string}`;
  }

  // Allow common chain aliases where Moralis accepts a chain name (best-effort).
  // Prefer passing hex chain ids elsewhere for consistency.
  const alias: Record<string, `0x${string}`> = {
    eth: "0x1",
    ethereum: "0x1",
    sepolia: "0xaa36a7",
    "ethereum-sepolia": "0xaa36a7",
    "ethereum sepolia": "0xaa36a7",
    base: "0x2105",
    "base-sepolia": "0x14a34",
    "base sepolia": "0x14a34",
    arbitrum: "0xa4b1",
    optimism: "0xa",
    polygon: "0x89",
    bsc: "0x38",
    avalanche: "0xa86a",
    avax: "0xa86a",
  };
  const mapped = alias[raw];
  if (mapped) return mapped;

  throw new Error("Invalid EVM chain");
}

/**
 * Moralis "Discovery" and "Trending tokens" endpoints support EVM chain ids AND `solana`.
 * Docs: https://docs.moralis.com/web3-data-api/evm/reference/get-trending-tokens
 */
export function normalizeMoralisChainFilter(
  input: string | number | null | undefined,
  fallback: MoralisChainFilter = "0x1",
): MoralisChainFilter {
  const raw = typeof input === "string" ? input.trim().toLowerCase() : "";
  if (raw === "solana") return "solana";
  if (!raw && typeof input !== "number") return fallback;
  return normalizeEvmChain(input, (fallback === "solana" ? "0x1" : fallback) as `0x${string}`);
}

export function normalizeSolanaNetwork(input: string | null | undefined, fallback: SolanaNetwork = "mainnet"): SolanaNetwork {
  const raw = (input ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === "mainnet" || raw === "devnet") return raw;
  throw new Error("Invalid Solana network");
}

export function normalizeSolanaAddress(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Invalid Solana address");
  }

  try {
    const bytes = bs58.decode(trimmed);
    if (bytes.length !== 32) {
      throw new Error("Invalid Solana address");
    }
  } catch {
    throw new Error("Invalid Solana address");
  }

  return trimmed;
}
