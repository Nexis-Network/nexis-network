"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthContext } from "@/hooks/auth/use-auth-context";
import { useWalletRealtimeSubscription } from "@/hooks/wallets/use-wallet-realtime-subscription";

type UnifiedPnl = {
  totalUsd: number | null;
  roiPercent: number | null;
  mode: "moralis" | "approximation";
};

export function useWalletPnL(params: {
  platform: "evm" | "solana";
  address: string | null;
  chainId?: number | null;
  network?: "mainnet" | "devnet";
  days?: number;
}) {
  const { isAuthenticated, user } = useAuthContext();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["wallet-pnl", params], [params]);
  const invalidatePnl = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  useWalletRealtimeSubscription({
    enabled: isAuthenticated && Boolean(params.address),
    onNotify: invalidatePnl,
    userId: user?.id,
  });

  return useQuery<UnifiedPnl>({
    queryKey,
    enabled: Boolean(params.address),
    queryFn: async () => {
      if (!params.address) return { totalUsd: null, roiPercent: null, mode: "approximation" };

      if (params.platform === "solana") {
        const qs = new URLSearchParams({
          address: params.address,
          network: params.network ?? "mainnet",
          days: String(params.days ?? 30),
        });
        const res = await fetch(`/api/tools/wallet/sol/pnl?${qs.toString()}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load Solana PnL");
        const json = (await res.json()) as { data?: { pnl?: UntypedJson } };
        const pnl = json?.data?.pnl as Record<string, UntypedJson> | undefined;
        return {
          totalUsd: typeof pnl?.totalUsd === "number" ? pnl.totalUsd : pnl?.totalUsd != null ? Number(pnl.totalUsd) : null,
          roiPercent: typeof pnl?.roiPercent === "number" ? pnl.roiPercent : pnl?.roiPercent != null ? Number(pnl.roiPercent) : null,
          mode: pnl?.mode === "moralis" ? "moralis" : "approximation",
        };
      }

      const chainHex = `0x${Number(params.chainId ?? 1).toString(16)}`;
      const qs = new URLSearchParams({ address: params.address, chain: chainHex });
      const res = await fetch(`/api/tools/wallet/evm/pnl?${qs.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load EVM PnL");
      const json = (await res.json()) as { data?: { pnl?: UntypedJson } };
      const pnl = json?.data?.pnl as Record<string, UntypedJson> | undefined;
      return {
        totalUsd: typeof pnl?.totalUsd === "number" ? pnl.totalUsd : pnl?.totalUsd != null ? Number(pnl.totalUsd) : null,
        roiPercent: typeof pnl?.roiPercent === "number" ? pnl.roiPercent : pnl?.roiPercent != null ? Number(pnl.roiPercent) : null,
        mode: pnl?.mode === "moralis" ? "moralis" : "approximation",
      };
    },
    staleTime: 60_000,
  });
}
