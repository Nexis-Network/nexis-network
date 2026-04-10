"use client";

import useSWR from "swr";

import { fetchAssetLive } from "@/lib/wallets/asset-detail.service";
import { ASSET_LIVE_SWR_CONFIG } from "@/lib/wallets/prices-registry";
import type { AssetLiveQuery } from "@/types/extension/asset-detail";

export function useAssetLive(query: AssetLiveQuery) {
  const chainId = String(query.chainId ?? "").trim();
  const identity = query.address ?? query.symbol ?? "";

  const key = chainId && identity ? ["wallet-asset-live", chainId, identity] : null;

  const { data, error, isLoading } = useSWR(
    key,
    async () => fetchAssetLive(query),
    ASSET_LIVE_SWR_CONFIG,
  );

  return {
    live: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
  };
}
