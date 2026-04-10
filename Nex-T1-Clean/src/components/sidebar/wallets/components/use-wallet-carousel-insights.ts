"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { unwrapApiPayload } from "@/lib/api-platform";
import {
  buildWalletExplorerAddressUrl,
  resolveWalletChainPresentation,
} from "@/lib/wallets/chain-presentation";
import { useWalletNetWorth } from "@/hooks/wallets/use-wallet-networth";
import { useWalletPnL } from "@/hooks/wallets/use-wallet-pnl";
import type { WalletSnapshot } from "@/modules/wallets/profile";

import {
  buildWalletNetWorthSparkline,
  computeWallet24hChangePercent,
} from "./wallet-carousel-metrics";

type WalletPlatform = "evm" | "solana";

type WalletChainContext = {
  platform: WalletPlatform;
  chainId: number | null;
  network: "mainnet" | "devnet";
  chainName: string;
  chainIcon: string;
};

type WalletCarouselInsights = {
  netWorthUsd: number | null;
  change24hPercent: number | null;
  sparkline: number[];
  assetsCount: number;
  tradeVolumeUsd: number | null;
  totalPnlUsd: number | null;
  isLoading: boolean;
};

export function useWalletCarouselInsights(wallet: WalletSnapshot): WalletCarouselInsights {
  const context = useMemo(() => resolveWalletChainContext(wallet), [wallet]);
  const address = wallet.address ?? null;
  const chainId = context.chainId ?? 1;

  const netWorth = useWalletNetWorth({
    platform: context.platform,
    address,
    chainId: context.platform === "evm" ? chainId : undefined,
    network: context.platform === "solana" ? context.network : undefined,
  });

  const pnl = useWalletPnL({
    platform: context.platform,
    address,
    chainId: context.platform === "evm" ? chainId : undefined,
    network: context.platform === "solana" ? context.network : undefined,
    days: 1,
  });

  const volume = useQuery<number | null>({
    queryKey: [
      "wallet-trade-volume",
      address,
      context.platform,
      context.chainId,
      context.network,
    ],
    enabled: Boolean(address),
    staleTime: 60_000,
    queryFn: async () => {
      if (!address) return null;

      if (context.platform === "solana") {
        const qs = new URLSearchParams({
          address,
          network: context.network,
          windowHours: "24",
        });
        const response = await fetch(`/api/tools/wallet/sol/volume?${qs.toString()}`, {
          credentials: "include",
        });
        if (!response.ok) return null;
        const json = (await response.json()) as unknown;
        const payload = unwrapApiPayload<{ volumeUsd?: number | null }>(json);
        return typeof payload?.volumeUsd === "number" && Number.isFinite(payload.volumeUsd)
          ? payload.volumeUsd
          : null;
      }

      const chainHex = `0x${chainId.toString(16)}`;
      const qs = new URLSearchParams({
        address,
        chain: chainHex,
        windowHours: "24",
      });
      const response = await fetch(`/api/tools/wallet/evm/volume?${qs.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      const json = (await response.json()) as unknown;
      const payload = unwrapApiPayload<{ volumeUsd?: number | null }>(json);
      return typeof payload?.volumeUsd === "number" && Number.isFinite(payload.volumeUsd)
        ? payload.volumeUsd
        : null;
    },
  });

  const netWorthUsd = useMemo(() => {
    if (typeof netWorth.data?.netWorthUsd === "number" && Number.isFinite(netWorth.data.netWorthUsd)) {
      return netWorth.data.netWorthUsd;
    }
    if (
      typeof wallet.totals.estimatedValueUsd === "number" &&
      Number.isFinite(wallet.totals.estimatedValueUsd)
    ) {
      return wallet.totals.estimatedValueUsd;
    }
    return null;
  }, [netWorth.data?.netWorthUsd, wallet.totals.estimatedValueUsd]);

  const change24hPercent = useMemo(() => {
    const weighted = computeWallet24hChangePercent(wallet.tokens);
    if (typeof weighted === "number" && Number.isFinite(weighted)) {
      return weighted;
    }
    if (
      typeof wallet.totals.totalPnlPercent === "number" &&
      Number.isFinite(wallet.totals.totalPnlPercent)
    ) {
      return wallet.totals.totalPnlPercent;
    }
    return null;
  }, [wallet.tokens, wallet.totals.totalPnlPercent]);

  const sparkline = useMemo(
    () =>
      buildWalletNetWorthSparkline({
        currentNetWorthUsd: netWorthUsd ?? 0,
        change24hPercent,
        points: 24,
      }),
    [netWorthUsd, change24hPercent],
  );

  const assetsCount = useMemo(() => {
    if (wallet.totals.tokenCount > 0) return wallet.totals.tokenCount;
    return wallet.tokens.filter((token) => token.balance > 0).length;
  }, [wallet.totals.tokenCount, wallet.tokens]);

  const totalPnlUsd = useMemo(() => {
    if (typeof pnl.data?.totalUsd === "number" && Number.isFinite(pnl.data.totalUsd)) {
      return pnl.data.totalUsd;
    }
    if (typeof wallet.totals.totalPnlUsd === "number" && Number.isFinite(wallet.totals.totalPnlUsd)) {
      return wallet.totals.totalPnlUsd;
    }
    return null;
  }, [pnl.data?.totalUsd, wallet.totals.totalPnlUsd]);

  return {
    netWorthUsd,
    change24hPercent,
    sparkline,
    assetsCount,
    tradeVolumeUsd: volume.data ?? null,
    totalPnlUsd,
    isLoading: netWorth.isLoading || pnl.isLoading || volume.isLoading,
  };
}

export function resolveWalletChainContext(wallet: WalletSnapshot): WalletChainContext {
  const kind =
    typeof wallet.metadata?.kind === "string" ? wallet.metadata.kind.toLowerCase() : "";
  const provider = (wallet.provider ?? "").toLowerCase();
  const isSolana =
    kind === "solana" ||
    wallet.type === "external_solana" ||
    provider.includes("solana") ||
    provider.includes("phantom");
  const metadataChainId =
    typeof wallet.metadata?.chainId === "number"
      ? wallet.metadata.chainId
      : typeof wallet.metadata?.chainId === "string"
        ? wallet.metadata.chainId
        : wallet.tokens.find((token) => token.chainId != null)?.chainId ?? null;
  const presentation = resolveWalletChainPresentation({
    platform: isSolana ? "solana" : "evm",
    chainId: metadataChainId,
    network: isSolana ? "mainnet" : null,
  });

  return {
    platform: presentation.platform,
    chainId: presentation.chainId,
    network: presentation.moralisNetwork ?? "mainnet",
    chainName: wallet.chains[0]?.name ?? presentation.chainName,
    chainIcon: wallet.chains[0]?.icon ?? presentation.chainIcon,
  };
}

export function resolveWalletExplorerUrl(wallet: WalletSnapshot): string | null {
  const address = wallet.address?.trim();
  if (!address) return null;

  const context = resolveWalletChainContext(wallet);
  const presentation = resolveWalletChainPresentation({
    platform: context.platform,
    chainId: context.chainId,
    network: context.network,
  });

  return buildWalletExplorerAddressUrl(presentation, address);
}
