import type { WalletPortfolio } from "@/lib/user/profile";
import {
  getDefaultCdpEvmCapability,
  getNetworkCapabilityByChainId,
  type ResolvedNetworkCapability,
} from "@/lib/networks/capabilities";
import { getWalletChainHint, getWalletMetadata } from "@/lib/portfolio/wallet-metadata";
import { toPortfolioRequestChainId } from "@/lib/portfolio/chain-filter";

import {
  getCdpEmbeddedEvmChainPresentation,
  resolveCdpEmbeddedEvmChainId,
} from "./cdp-chain-support";

function normalizeAddress(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

function matchesWalletAddress(wallet: WalletPortfolio, address: string): boolean {
  const normalizedTarget = normalizeAddress(address);
  if (!normalizedTarget) {
    return false;
  }

  const metadata = getWalletMetadata(wallet);
  const directAddress = normalizeAddress(wallet.address);
  const smartAccountAddress =
    typeof metadata?.smartAccountAddress === "string"
      ? normalizeAddress(metadata.smartAccountAddress)
      : null;

  return directAddress === normalizedTarget || smartAccountAddress === normalizedTarget;
}

export function findMatchingWalletPortfolio(
  wallets: WalletPortfolio[] | null | undefined,
  address: string | null | undefined,
): WalletPortfolio | null {
  if (!Array.isArray(wallets) || !address) {
    return null;
  }

  return wallets.find((wallet) => matchesWalletAddress(wallet, address)) ?? null;
}

export function resolveCdpEmbeddedEvmSelectionChainId(args: {
  address: string | null | undefined;
  preferredChainId?: number | string | null;
  wallets?: WalletPortfolio[] | null;
}): number {
  const preferredChainId = parseChainId(args.preferredChainId);
  if (preferredChainId) {
    return resolveCdpEmbeddedEvmChainId(preferredChainId);
  }

  const matchedWallet = findMatchingWalletPortfolio(args.wallets, args.address);
  const matchedChainId = matchedWallet ? extractWalletChainId(matchedWallet) : null;
  return resolveCdpEmbeddedEvmChainId(matchedChainId);
}

export function resolveCdpEmbeddedEvmSelectionPresentation(args: {
  address: string | null | undefined;
  preferredChainId?: number | string | null;
  wallets?: WalletPortfolio[] | null;
}): {
  chainId: number;
  icon: string | null;
  name: string;
  type: "mainnet" | "testnet";
} {
  return getCdpEmbeddedEvmChainPresentation(
    resolveCdpEmbeddedEvmSelectionChainId(args),
  );
}

export function resolveCdpEmbeddedEvmSelectionCapability(args: {
  address: string | null | undefined;
  preferredChainId?: number | string | null;
  wallets?: WalletPortfolio[] | null;
}): ResolvedNetworkCapability {
  return (
    getNetworkCapabilityByChainId(resolveCdpEmbeddedEvmSelectionChainId(args)) ??
    getDefaultCdpEvmCapability()
  );
}

function extractWalletChainId(wallet: WalletPortfolio): number | null {
  const metadata = getWalletMetadata(wallet);
  const chainHint = getWalletChainHint(metadata);
  if (chainHint == null) {
    return null;
  }

  const resolved = toPortfolioRequestChainId(chainHint, {
    walletType: wallet.walletType ?? null,
    providerName: wallet.providerName ?? null,
    metadata,
  });

  return typeof resolved === "number" ? resolved : null;
}

function parseChainId(value: number | string | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = trimmed.startsWith("0x")
    ? Number.parseInt(trimmed, 16)
    : Number.parseInt(trimmed, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
