"use client";

import { useMemo } from "react";

import { useProfileAggregate } from "@/hooks/user/use-profile-aggregate";

type WalletKind = "evm" | "solana" | "hyperliquid" | "sui";

function coerceAddressFromMetadata(metadata: Record<string, UntypedJson> | null | undefined): string | null {
  if (!metadata) return null;
  const candidates = [
    metadata.address,
    metadata.signerAddress,
    metadata.engineAccountAddress,
    metadata.engineSmartAccountAddress,
    metadata.walletAddress,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function normalizeKind(value: UntypedJson): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function toNumber(value: UntypedJson): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

export function useProvisionedWalletAddress(kind: WalletKind, chainId?: number | null, cluster?: string | null) {
  const { data: profile } = useProfileAggregate();

  return useMemo(() => {
    const wallets = profile?.wallets ?? [];
    if (!wallets.length) {
      return null;
    }

    const requestedKind = kind.toLowerCase();
    const normalizedCluster = cluster?.toLowerCase().trim();

    for (const wallet of wallets) {
      const address = typeof wallet.address === "string" ? wallet.address.trim() : "";
      const metadata =
        wallet.metadata && typeof wallet.metadata === "object" ? (wallet.metadata as Record<string, UntypedJson>) : null;
      const metadataKind = normalizeKind(metadata?.kind);
      const metadataCluster = normalizeKind(metadata?.cluster);
      const metadataChainId = toNumber(metadata?.chainId);

      if (metadataKind !== requestedKind) {
        continue;
      }

      if (typeof chainId === "number" && metadataChainId && metadataChainId !== chainId) {
        continue;
      }

      if (normalizedCluster && metadataCluster && metadataCluster !== normalizedCluster) {
        continue;
      }

      if (address) {
        return address;
      }

      const derived = coerceAddressFromMetadata(metadata);
      if (derived) {
        return derived;
      }
    }

    return null;
  }, [profile?.wallets, kind, chainId, cluster]);
}
