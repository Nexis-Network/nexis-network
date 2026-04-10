"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthContext } from "@/hooks/auth/use-auth-context";
import { useWalletRealtimeSubscription } from "@/hooks/wallets/use-wallet-realtime-subscription";

export function useWalletNetWorth(params: {
  platform: "evm" | "solana";
  address: string | null;
  chainId?: number | null;
  network?: "mainnet" | "devnet";
}) {
  const { isAuthenticated, user } = useAuthContext();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["wallet-networth", params], [params]);
  const invalidateNetWorth = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  useWalletRealtimeSubscription({
    enabled: isAuthenticated && Boolean(params.address),
    onNotify: invalidateNetWorth,
    userId: user?.id,
  });

  return useQuery<{ netWorthUsd: number | null }>({
    queryKey,
    enabled: Boolean(params.address),
    queryFn: async () => {
      if (!params.address) return { netWorthUsd: null };

      if (params.platform === "solana") {
        const qs = new URLSearchParams({ address: params.address, network: params.network ?? "mainnet" });
        const res = await fetch(`/api/tools/wallet/sol/net-worth?${qs.toString()}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load Solana net worth");
        const json = (await res.json()) as { data?: { netWorthUsd?: number | null } };
        return { netWorthUsd: typeof json?.data?.netWorthUsd === "number" ? json.data.netWorthUsd : null };
      }

      const chainHex = `0x${Number(params.chainId ?? 1).toString(16)}`;
      const qs = new URLSearchParams({ address: params.address, chain: chainHex });
      const res = await fetch(`/api/tools/wallet/evm/net-worth?${qs.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load EVM net worth");
      const json = (await res.json()) as { data?: { netWorthUsd?: number | null } };
      return { netWorthUsd: typeof json?.data?.netWorthUsd === "number" ? json.data.netWorthUsd : null };
    },
    staleTime: 60_000,
  });
}
