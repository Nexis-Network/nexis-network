"use client";

import { useMemo } from "react";

import { useResolvedCdpWallets } from "@/lib/cdp/use-resolved-cdp-wallets";
import { useConnectEoaWallet } from "@/lib/hooks/wallet/use-connect-eoa-wallet";
import { useUserWallets } from "@/lib/hooks/wallets/profile/use-user-wallets";
import { useProfileAggregate } from "@/lib/hooks/user/use-profile-aggregate";
import { resolveUserAvatarSeed } from "@/lib/user/avatar-preferences";
import type { WalletPortfolio } from "@/lib/user/profile";

export type AvatarWalletKind = "EOA" | "EVM" | "Solana";

export type AvatarWalletOption = {
  id: string;
  address: string;
  kind: AvatarWalletKind;
  netWorthUsd: number | null;
  source: "embedded" | "eoa";
};

type UsePreferredAvatarOptions = {
  includeConnectedEoa?: boolean;
};

type UsePreferredAvatarResult = {
  avatarSeed: string;
  identitySeed: string;
  preferredAddress: string | null;
  activeEmbeddedAddress: string | null;
  walletOptions: AvatarWalletOption[];
};

const PREFERRED_KIND_ORDER: Record<AvatarWalletKind, number> = {
  EOA: 0,
  EVM: 1,
  Solana: 2,
};

function normalizeAddress(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveWalletNetWorthUsd(wallet: WalletPortfolio): number | null {
  if (typeof wallet.netWorthUsd === "number" && Number.isFinite(wallet.netWorthUsd)) {
    return wallet.netWorthUsd;
  }
  const totals = wallet.analytics?.totals;
  if (typeof totals?.valueUsd === "number" && Number.isFinite(totals.valueUsd)) {
    return totals.valueUsd;
  }
  return null;
}

function inferWalletKind(wallet: WalletPortfolio, address: string): AvatarWalletKind {
  const accountType =
    typeof wallet.metadata?.accountType === "string"
      ? wallet.metadata.accountType.trim().toLowerCase()
      : "";

  if (accountType.includes("eoa")) return "EOA";
  if (address.startsWith("0x")) return "EVM";
  return "Solana";
}

function isCdpEmbeddedWallet(wallet: WalletPortfolio): boolean {
  const providerName = (wallet.providerName ?? "").toLowerCase();
  const metadataProvider =
    typeof wallet.metadata?.provider === "string"
      ? wallet.metadata.provider.toLowerCase()
      : "";
  const metadataSource =
    typeof wallet.metadata?.source === "string"
      ? wallet.metadata.source.toLowerCase()
      : "";

  return wallet.walletType === "embedded" && (
    metadataSource === "cdp" ||
    metadataProvider === "cdp" ||
    providerName.includes("cdp") ||
    providerName.includes("coinbase")
  );
}

function toAvatarWalletOption(wallet: WalletPortfolio): AvatarWalletOption | null {
  const address = normalizeAddress(wallet.address);
  if (!address) return null;
  if (!isCdpEmbeddedWallet(wallet)) return null;

  return {
    id: wallet.walletId,
    address,
    kind: inferWalletKind(wallet, address),
    netWorthUsd: resolveWalletNetWorthUsd(wallet),
    source: "embedded",
  };
}

export function usePreferredAvatar(
  options: UsePreferredAvatarOptions = {},
): UsePreferredAvatarResult {
  const includeConnectedEoa = options.includeConnectedEoa ?? true;
  const { data: profile } = useProfileAggregate();
  const { data: userWallets } = useUserWallets();
  const { address: connectedEoaAddress } = useConnectEoaWallet();
  const cdpWallets = useResolvedCdpWallets({
    fallbackWallets: userWallets?.wallets,
  });

  const identitySeed = profile?.identity?.avatarSeed ?? resolveUserAvatarSeed(profile?.identity, "anon");

  const walletOptions = useMemo<AvatarWalletOption[]>(() => {
    const dedupe = new Map<string, AvatarWalletOption>();
    const wallets = Array.isArray(userWallets?.wallets) ? userWallets.wallets : [];

    for (const wallet of wallets) {
      const entry = toAvatarWalletOption(wallet);
      if (!entry) continue;
      const key = entry.address.toLowerCase();
      if (!dedupe.has(key)) {
        dedupe.set(key, entry);
      }
    }

    const normalizedEoa = normalizeAddress(connectedEoaAddress);
    if (includeConnectedEoa && normalizedEoa) {
      const key = normalizedEoa.toLowerCase();
      if (!dedupe.has(key)) {
        dedupe.set(key, {
          id: `eoa-${key}`,
          address: normalizedEoa,
          kind: "EOA",
          netWorthUsd: null,
          source: "eoa",
        });
      }
    }

    return Array.from(dedupe.values()).sort((a, b) => {
      const kindSort = PREFERRED_KIND_ORDER[a.kind] - PREFERRED_KIND_ORDER[b.kind];
      if (kindSort !== 0) return kindSort;
      return a.address.localeCompare(b.address);
    });
  }, [connectedEoaAddress, includeConnectedEoa, userWallets?.wallets]);

  const activeEmbeddedAddress = useMemo(() => {
    return (
      normalizeAddress(cdpWallets.evmAddress) ??
      normalizeAddress(cdpWallets.solanaAddress) ??
      walletOptions.find((wallet) => wallet.source === "embedded")?.address ??
      null
    );
  }, [cdpWallets.evmAddress, cdpWallets.solanaAddress, walletOptions]);

  const preferredAddress = useMemo(() => {
    return (
      activeEmbeddedAddress ??
      normalizeAddress(connectedEoaAddress) ??
      walletOptions[0]?.address ??
      null
    );
  }, [activeEmbeddedAddress, connectedEoaAddress, walletOptions]);

  return {
    avatarSeed: preferredAddress ?? identitySeed,
    identitySeed,
    preferredAddress,
    activeEmbeddedAddress,
    walletOptions,
  };
}
