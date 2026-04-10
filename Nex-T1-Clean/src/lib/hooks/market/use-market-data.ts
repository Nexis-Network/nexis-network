"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type { MarketDataOverviewResponse } from "@/types/market";

interface UseMarketDataOverviewOptions {
  assets?: string[];
  enabled?: boolean;
  staleTimeMs?: number;
  refetchIntervalMs?: number;
}

const DEFAULT_STALE_TIME = 2 * 60_000; // 2 minutes

export function useMarketDataOverview({
  assets,
  enabled = true,
  staleTimeMs = DEFAULT_STALE_TIME,
  refetchIntervalMs,
}: UseMarketDataOverviewOptions = {}) {
  const queryKey = useMemo(() => ["market-data", "overview", assets?.join(",") ?? "default"], [assets]);

  return useQuery<MarketDataOverviewResponse, Error>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (assets && assets.length > 0) {
        params.set("assets", assets.join(","));
      }
      const url = `/api/market-data/overview${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to load market data (status ${response.status})`);
      }
      const data = (await response.json()) as MarketDataOverviewResponse;
      return data;
    },
    enabled,
    staleTime: staleTimeMs,
    refetchInterval: refetchIntervalMs ?? staleTimeMs,
  });
}
