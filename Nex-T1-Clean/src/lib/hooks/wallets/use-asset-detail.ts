"use client";

import useSWR from "swr";

import { fetchAssetDetail } from "@/lib/wallets/asset-detail.service";
import { ASSET_DETAIL_SWR_CONFIG } from "@/lib/wallets/prices-registry";
import type { AssetDetailQuery } from "@/types/extension/asset-detail";

export function useAssetDetail(query: AssetDetailQuery) {
  const chainId = String(query.chainId ?? "").trim();
  const identity = query.address ?? query.symbol ?? "";
  const range = query.range ?? "1d";

  const key = chainId && identity ? ["wallet-asset-detail", chainId, identity, range] : null;

  const { data, error, isLoading } = useSWR(
    key,
    async () => fetchAssetDetail(query),
    ASSET_DETAIL_SWR_CONFIG,
  );

  return {
    detail: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
  };
}
