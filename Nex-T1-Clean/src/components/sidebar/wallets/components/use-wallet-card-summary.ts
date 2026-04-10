"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  buildWalletCardHoldingSegments,
  type WalletCardHoldingSegment,
  type WalletCardSummaryPayload,
} from "@/lib/wallets/wallet-card-holdings";
import { resolveWalletChainPresentation } from "@/lib/wallets/chain-presentation";
import type { WalletSnapshot } from "@/modules/wallets/profile";

import { resolveWalletAssetType, resolveWalletChainId } from "./wallet-runtime-context";

type WalletCardSummaryResult = {
  summary: WalletCardSummaryPayload | null;
  segments: WalletCardHoldingSegment[];
  isLoading: boolean;
};

export function useWalletCardSummary(wallet: WalletSnapshot): WalletCardSummaryResult {
  const address = wallet.address?.trim() ?? "";
  const platform = useMemo(() => resolveWalletAssetType(wallet), [wallet]);
  const chainId = useMemo(
    () => (platform === "evm" ? resolveWalletChainId(wallet) : null),
    [platform, wallet],
  );
  const presentation = useMemo(
    () =>
      resolveWalletChainPresentation({
        platform,
        chainId,
        network: platform === "solana" ? "mainnet" : null,
      }),
    [chainId, platform],
  );

  const query = useQuery<WalletCardSummaryPayload | null>({
    queryKey: [
      "wallet-card-summary",
      address,
      platform,
      presentation.chainId,
      presentation.moralisNetwork,
    ],
    enabled: Boolean(address),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        address,
        platform,
      });

      if (platform === "evm" && presentation.chainId != null) {
        searchParams.set("chainId", String(presentation.chainId));
      }

      if (platform === "solana" && presentation.moralisNetwork) {
        searchParams.set("network", presentation.moralisNetwork);
      }

      const response = await fetch(`/api/wallets/card-summary?${searchParams.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch wallet card summary");
      }

      const payload = (await response.json()) as {
        data?: WalletCardSummaryPayload;
      };
      return payload.data ?? null;
    },
  });

  const segments = useMemo(
    () => (query.data ? buildWalletCardHoldingSegments(query.data) : []),
    [query.data],
  );

  return {
    summary: query.data ?? null,
    segments,
    isLoading: query.isLoading,
  };
}
