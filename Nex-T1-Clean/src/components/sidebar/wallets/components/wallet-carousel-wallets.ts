"use client";

import type { WalletSnapshot } from "@/modules/wallets/profile";

type WalletIdentityLabels = {
  cdpV2Solana: string;
  cdpV2Evm: string;
  eoa: string;
  smartWallet: string;
  wallet: string;
};

function normalizeAddress(address: string | null | undefined): string | null {
  if (typeof address !== "string") return null;
  const trimmed = address.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

function hasLiveCdpBalances(snapshot: WalletSnapshot): boolean {
  if ((snapshot.tokens?.length ?? 0) > 0) return true;
  if (
    typeof snapshot.totals?.estimatedValueUsd === "number" &&
    Number.isFinite(snapshot.totals.estimatedValueUsd) &&
    snapshot.totals.estimatedValueUsd > 0
  ) {
    return true;
  }
  if (
    typeof snapshot.totals?.nativeValueUsd === "number" &&
    Number.isFinite(snapshot.totals.nativeValueUsd) &&
    snapshot.totals.nativeValueUsd > 0
  ) {
    return true;
  }
  return false;
}

function mergeCdpSnapshot(
  base: WalletSnapshot,
  cdp: WalletSnapshot,
): WalletSnapshot {
  const useLiveBalances = hasLiveCdpBalances(cdp);
  const mergedMetadata = {
    ...(base.metadata ?? {}),
    ...(cdp.metadata ?? {}),
    provider: "cdp",
    source: "cdp_v2",
  };

  return {
    ...base,
    provider: "cdp",
    type: base.type || cdp.type,
    label: base.customLabel ?? base.label ?? cdp.label,
    chains: cdp.chains.length > 0 ? cdp.chains : base.chains,
    metadata: mergedMetadata,
    tokens: useLiveBalances
      ? cdp.tokens
      : (base.tokens.length > 0 ? base.tokens : cdp.tokens),
    totals: useLiveBalances
      ? cdp.totals
      : {
          ...base.totals,
          estimatedValueUsd:
            base.totals.estimatedValueUsd ?? cdp.totals.estimatedValueUsd,
          nativeValueUsd:
            base.totals.nativeValueUsd ?? cdp.totals.nativeValueUsd,
        },
  };
}

export function mergeWalletSnapshotsWithCdp(
  baseWallets: WalletSnapshot[],
  cdpSnapshots: WalletSnapshot[],
): WalletSnapshot[] {
  if (!cdpSnapshots.length) return baseWallets;

  const byAddress = new Map<string, WalletSnapshot>();
  for (const cdp of cdpSnapshots) {
    const key = normalizeAddress(cdp.address);
    if (!key) continue;
    byAddress.set(key, cdp);
  }

  const mergedBase = baseWallets.map((wallet) => {
    const key = normalizeAddress(wallet.address);
    if (!key) return wallet;
    const cdp = byAddress.get(key);
    if (!cdp) return wallet;
    byAddress.delete(key);
    return mergeCdpSnapshot(wallet, cdp);
  });

  const appended = Array.from(byAddress.values());
  return [...mergedBase, ...appended];
}

export function resolveWalletIdentityLabel(
  wallet: WalletSnapshot,
  labels?: WalletIdentityLabels,
): string {
  const provider = (wallet.provider ?? "").toLowerCase();
  const kind =
    typeof wallet.metadata?.kind === "string"
      ? wallet.metadata.kind.toLowerCase()
      : "";
  const accountType =
    typeof wallet.metadata?.accountType === "string"
      ? wallet.metadata.accountType.toLowerCase()
      : "";
  const isEvmAddress = typeof wallet.address === "string" && wallet.address.startsWith("0x");

  if (provider === "cdp") {
    if (kind.includes("sol") || !isEvmAddress) {
      return labels?.cdpV2Solana ?? "Nex Wallet (SOL)";
    }
    return labels?.cdpV2Evm ?? "Nex Wallet (EVM)";
  }

  if (accountType === "eoa" || wallet.type === "external_evm" || wallet.type === "external_connected") {
    return labels?.eoa ?? "EOA";
  }

  if (
    wallet.type.includes("smart") ||
    wallet.type.includes("safe") ||
    accountType === "smart"
  ) {
    return labels?.smartWallet ?? "Smart Wallet";
  }

  return labels?.wallet ?? "Wallet";
}
