"use client";

import type { CoinMarketRow } from "@/types/market/market-data";

import { ASSETS_TABLE_PAGE_SIZE, DEFAULT_PAIR_IMAGE } from "./assets-table.constants";

const EMPTY_ASSETS: CoinMarketRow[] = [];

export async function fetchUntypedJson(
  url: string,
  init?: RequestInit,
): Promise<UntypedJson> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }

  return response.json() as Promise<UntypedJson>;
}

export function buildAssetsMarketUrl(args: {
  limit?: number;
  offset: number;
  searchQuery: string;
  selectedChain: string;
}): string {
  const params = new URLSearchParams({
    chain: args.selectedChain,
    enrich: "false",
    limit: String(args.limit ?? ASSETS_TABLE_PAGE_SIZE),
    offset: String(args.offset),
    search: args.searchQuery,
  });

  return `/api/assets/market?${params.toString()}`;
}

export function buildAssetHistoryUrl(queryPayload: string, days = 7): string {
  return `/api/assets/history?ids=${encodeURIComponent(queryPayload)}&days=${days}`;
}

export function buildAssetPricesUrl(queryPayload: string): string {
  return `/api/assets/prices?ids=${encodeURIComponent(queryPayload)}`;
}

export function buildAssetEnrichmentUrl(queryPayload: string): string {
  return `/api/assets/enrichment?ids=${encodeURIComponent(queryPayload)}`;
}

export function buildAssetLookupKey(asset: Pick<CoinMarketRow, "chain" | "id">): string {
  return asset.chain ? `${asset.chain}:${asset.id}` : asset.id;
}

export function createInitialAssets(assetsData?: CoinMarketRow[]): CoinMarketRow[] {
  const baseAssets = assetsData ?? EMPTY_ASSETS;

  return baseAssets.map((asset) => ({
    ...asset,
    pairImage: asset.pairImage || [asset.image || "", DEFAULT_PAIR_IMAGE],
  }));
}

export function buildVisibleAssetQueryPayload(
  visibleIds: string[],
  assetById: Map<string, CoinMarketRow>,
): string {
  return visibleIds
    .map((id) => {
      const asset = assetById.get(id);
      return asset ? buildAssetLookupKey(asset) : id;
    })
    .filter(Boolean)
    .join(",");
}

export function getAssetTokenAddress(assetId: string): string {
  return assetId.split(":")[1] || assetId;
}

export function getAssetRoute(asset: Pick<CoinMarketRow, "chain" | "id">): string {
  if (asset.id.includes(":")) {
    const [chainFromId, address] = asset.id.split(":");
    return `/assets/${asset.chain || chainFromId}/${address}`;
  }

  return `/assets/${asset.chain || "ethereum"}/${asset.id}`;
}

export function createAssetsDatasetKey(args: {
  page: number;
  searchQuery: string;
  selectedChain: string;
}): string {
  return [args.selectedChain, args.searchQuery, String(args.page)].join("|");
}
