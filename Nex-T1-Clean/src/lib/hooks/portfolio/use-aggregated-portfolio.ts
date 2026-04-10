"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { WalletPortfolio } from "@/lib/user/profile";
import { isNonZeroEVMAddress } from "@/lib/utils/token-utils";
import { unwrapApiPayload } from "@/lib/api-platform";

export function useAggregatedSafeValue(wallets: WalletPortfolio[], filterChainId?: string) {
  const safeWallets = useMemo(
    () =>
      wallets.filter((w) => {
        const meta = w.metadata as Record<string, UntypedJson> | undefined;
        const isSafeProvider = meta?.provider === "safe";
        const isSafeType = w.providerName?.toLowerCase().includes("safe");

        if (filterChainId && filterChainId !== "all") {
          const chainId = String(meta?.chainId);
          if (chainId !== filterChainId) return false;
        }

        return isSafeProvider || isSafeType;
      }),
    [wallets, filterChainId],
  );

  const walletInputs = useMemo(
    () =>
      safeWallets
        .map((w) => {
          const meta = w.metadata as Record<string, UntypedJson> | undefined;
          const chainId = Number(meta?.chainId || 1);
          const address = w.address ?? "";
          if (!isNonZeroEVMAddress(address)) return null;
          return { address, chainId };
        })
        .filter((item): item is { address: string; chainId: number } => item !== null),
    [safeWallets],
  );

  const { data, isLoading } = useSWR(
    walletInputs.length > 0 ? ["aggregated-safe-value", ...walletInputs.map((w) => `${w.address}-${w.chainId}`)] : null,
    async () => {
      const res = await fetch("/api/portfolio/wallet-data/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallets: walletInputs }),
      });
      if (!res.ok) return 0;
      const json = (await res.json().catch(() => null)) as unknown;
      const payload = unwrapApiPayload<{ items?: Array<{
        ok?: boolean;
        data?: { netWorthUsd?: number | string | null };
      }> }>(json);
      const items = Array.isArray(payload?.items) ? payload.items : [];
      return items.reduce((total: number, item) => {
        if (!item?.ok || !item?.data) return total;
        return total + Number(item.data.netWorthUsd ?? 0);
      }, 0);
    },
    { refreshInterval: 60000 },
  );

  return {
    totalUsd: data ?? 0,
    isLoading,
    walletCount: safeWallets.length,
  };
}
