"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchAssetComparisonSearch } from "@/modules/prices/token-page/api";
import type { CompareAssetSearchItem } from "@/types/token-page";

const DEFAULT_LIMIT = 8;

export function useAssetCompareSearch(query: string, options?: { enabled?: boolean; limit?: number }) {
  const trimmed = query.trim();
  const limit = options?.limit ?? DEFAULT_LIMIT;

  return useQuery<CompareAssetSearchItem[]>({
    queryKey: ["asset-compare-search", trimmed.toLowerCase(), limit],
    queryFn: async () => {
      if (!trimmed.length) {
        return [];
      }

      const response = await fetchAssetComparisonSearch(trimmed, { limit });
      return response.data;
    },
    enabled: trimmed.length >= 2 && (options?.enabled ?? true),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
