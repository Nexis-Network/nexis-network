"use client";

import { useQuery } from "@tanstack/react-query";

export type ActiveChain = {
  chain: string;
  chain_id: `0x${string}`;
};

export function useWalletActiveChains(params: { address: string | null; enabled?: boolean }) {
  return useQuery<ActiveChain[]>({
    queryKey: ["wallet-active-chains", params.address],
    enabled: Boolean(params.address) && (params.enabled ?? true),
    queryFn: async () => {
      if (!params.address) return [];
      const qs = new URLSearchParams({ address: params.address });
      const res = await fetch(`/api/tools/wallet/evm/active-chains?${qs.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load active chains");
      const json = (await res.json()) as { data?: { activeChains?: ActiveChain[] } };
      return Array.isArray(json?.data?.activeChains) ? json.data.activeChains : [];
    },
    staleTime: 5 * 60_000,
  });
}

