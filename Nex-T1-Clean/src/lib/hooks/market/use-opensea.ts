"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchOpenSeaStats } from "@/modules/prices/market-overview/api";
import type { CachedResponse } from "@/types/market";
import type { OpenSeaCollectionResponse } from "@/types/market/opensea";

export function useOpenSeaStats(slug: string, enabled: boolean) {
    return useQuery<CachedResponse<OpenSeaCollectionResponse>>({
        queryKey: ["market", "opensea", "stats", slug],
        queryFn: () => fetchOpenSeaStats(slug),
        enabled: Boolean(slug) && enabled,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000, // 15 minutes
    });
}
