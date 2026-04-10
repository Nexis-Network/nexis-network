"use client";

import { useQuery } from "@tanstack/react-query";

export type AssetSparklineQuery = {
  chainKind: "evm" | "solana" | "stellar";
  chainId?: number;
  network?: "mainnet" | "devnet";
  tokenAddress?: string;
  coinId?: string;
  days?: number;
};

type AssetSparklineResponse = {
  values: number[];
  direction: "positive" | "negative" | "neutral";
};

export function useAssetSparkline(query: AssetSparklineQuery, enabled: boolean) {
  return useQuery<AssetSparklineResponse>({
    queryKey: ["asset-sparkline", query],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("chainKind", query.chainKind);
      if (typeof query.chainId === "number") params.set("chainId", String(query.chainId));
      if (query.network) params.set("network", query.network);
      if (query.tokenAddress) params.set("tokenAddress", query.tokenAddress);
      if (query.coinId) params.set("coinId", query.coinId);
      if (typeof query.days === "number") params.set("days", String(query.days));

      const response = await fetch(`/api/assets/sparkline?${params.toString()}`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to load sparkline");
      }
      const json = (await response.json()) as { data?: AssetSparklineResponse };
      if (!json?.data) {
        return { values: [], direction: "neutral" };
      }
      return json.data;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

