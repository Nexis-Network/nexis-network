"use client";

import type { CoinMarketRow } from "@/types/market/market-data";

import type {
  AssetEnrichmentMap,
  AssetHistoryMap,
  AssetsTableSortConfig,
  RealtimePriceMap,
  StreamPriceMap,
} from "./assets-table.types";
import { sortAssets } from "./assets-table.sorting";
import { buildAssetLookupKey } from "./assets-table.utils";

function readRealtimePriceValue(snapshot: UntypedJson): number | null {
  if (typeof snapshot !== "object" || snapshot === null || !("value" in snapshot)) {
    return null;
  }

  const value = (snapshot as Record<string, UntypedJson>).value;
  return typeof value === "number" ? value : null;
}

function applyRealtimePrice(
  asset: CoinMarketRow,
  realtimeSnapshot: UntypedJson | undefined,
  referencePrices: Map<string, number>,
): CoinMarketRow {
  const nextPrice = readRealtimePriceValue(realtimeSnapshot as UntypedJson);

  if (nextPrice === null) {
    return asset;
  }

  const referencePrice = referencePrices.get(asset.id) ?? nextPrice;
  const nextChange =
    referencePrice > 0
      ? ((nextPrice - referencePrice) / referencePrice) * 100
      : asset.priceChangePercentage24h;

  return {
    ...asset,
    currentPrice: nextPrice,
    priceChangePercentage24h: nextChange,
  };
}

function applyStreamPrice(
  asset: CoinMarketRow,
  streamSnapshot: StreamPriceMap[string] | undefined,
  referencePrices: Map<string, number>,
): CoinMarketRow {
  if (!streamSnapshot || streamSnapshot.price === undefined) {
    return asset;
  }

  const referencePrice = referencePrices.get(asset.id) ?? streamSnapshot.price;
  const nextChange =
    streamSnapshot.change_24h != null
      ? streamSnapshot.change_24h
      : referencePrice > 0
        ? ((streamSnapshot.price - referencePrice) / referencePrice) * 100
        : asset.priceChangePercentage24h;

  return {
    ...asset,
    currentPrice: streamSnapshot.price,
    priceChangePercentage24h: nextChange,
  };
}

function applyHistory(asset: CoinMarketRow, history: number[] | undefined): CoinMarketRow {
  if (!history || history.length === 0) {
    return asset;
  }

  const high7d = Math.max(...history);
  const low7d = Math.min(...history);
  const startPrice = history[0];
  const endPrice = history[history.length - 1];
  const last24Samples = history.slice(-24);

  return {
    ...asset,
    high24h: last24Samples.length ? Math.max(...last24Samples) : asset.high24h,
    high7d,
    low24h: last24Samples.length ? Math.min(...last24Samples) : asset.low24h,
    low7d,
    priceChangePercentage7d:
      startPrice > 0
        ? ((endPrice - startPrice) / startPrice) * 100
        : asset.priceChangePercentage7d,
    sparkline7d: history,
  };
}

function applyEnrichment(
  asset: CoinMarketRow,
  enrichment: AssetEnrichmentMap[string] | undefined,
): CoinMarketRow {
  return enrichment ? { ...asset, ...enrichment } : asset;
}

export function createReferencePriceMap(assets: CoinMarketRow[]): Map<string, number> {
  return new Map(
    assets.map((asset) => {
      const price = asset.currentPrice || 0;
      const change = asset.priceChangePercentage24h || 0;
      const referencePrice = change > -99.9 ? price / (1 + change / 100) : price;
      return [asset.id, referencePrice];
    }),
  );
}

export function mergeDisplayAssets(args: {
  enrichmentData?: AssetEnrichmentMap;
  historyMap: AssetHistoryMap;
  initialAssets: CoinMarketRow[];
  narrativeFilter: string;
  realtimePrices?: RealtimePriceMap;
  referencePrices: Map<string, number>;
  safetyFilter: boolean;
  sortConfig: AssetsTableSortConfig;
  streamData?: StreamPriceMap;
}): CoinMarketRow[] {
  const normalizedNarrativeFilter = args.narrativeFilter.toLowerCase();
  const mergedAssets = args.initialAssets
    .map((asset) => {
      const lookupKey = buildAssetLookupKey(asset);
      const assetWithRealtimePrice = applyRealtimePrice(
        asset,
        args.realtimePrices?.[asset.id],
        args.referencePrices,
      );
      const assetWithStreamPrice = applyStreamPrice(
        assetWithRealtimePrice,
        args.streamData?.[asset.id],
        args.referencePrices,
      );
      const assetWithHistory = applyHistory(
        assetWithStreamPrice,
        args.historyMap[lookupKey],
      );

      return applyEnrichment(assetWithHistory, args.enrichmentData?.[lookupKey]);
    })
    .filter((asset) => {
      if (args.safetyFilter && !asset.isAuditSafe) {
        return false;
      }

      if (normalizedNarrativeFilter && asset.narrative?.toLowerCase() !== normalizedNarrativeFilter) {
        return false;
      }

      return true;
    });

  return sortAssets(mergedAssets, args.sortConfig);
}
