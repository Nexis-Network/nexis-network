"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMarketDataOverview } from "@/modules/prices/market-overview/api";
import type { MarketDataOverviewResponse } from "@/types/market";

export function useMarketDataOverview(assets: string[], enabled = true) {
    return useQuery<MarketDataOverviewResponse>({
        queryKey: ["market", "overview", "intelligence", assets.join(",")],
        queryFn: () => fetchMarketDataOverview(assets),
        enabled: assets.length > 0 && enabled,
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
    });
}
