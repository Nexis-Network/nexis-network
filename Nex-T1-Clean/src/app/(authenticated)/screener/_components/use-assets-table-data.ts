"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { useMarketStream } from "@/hooks/use-market-stream";
import type { CoinMarketRow } from "@/types/market/market-data";
import type { WatchlistEnrichmentSnapshot } from "@/types/watchlist";

import {
  ASSETS_TABLE_PAGE_SIZE,
  DEFAULT_SORT_CONFIG,
  ENRICHMENT_SWR_CONFIG,
  LIVE_PRICES_SWR_CONFIG,
  MARKET_QUERY_SWR_CONFIG,
} from "./assets-table.constants";
import {
  normalizeAssetRowsPayload,
  normalizeRecordPayload,
} from "./assets-table-payload";
import { getNextSortConfig } from "./assets-table.sorting";
import type {
  AssetsTableSortConfig,
  AssetsTableSortKey,
  UseAssetsTableDataArgs,
  UseAssetsTableDataResult,
} from "./assets-table.types";
import {
  buildAssetEnrichmentUrl,
  buildAssetsMarketUrl,
  buildAssetPricesUrl,
  buildVisibleAssetQueryPayload,
  createAssetsDatasetKey,
  createInitialAssets,
  fetchUntypedJson,
} from "./assets-table.utils";
import {
  createReferencePriceMap,
  mergeDisplayAssets,
} from "./assets-table.view-model";
import { usePrefetchedAssetHistory } from "./use-prefetched-asset-history";
import { useSyncCurrentViewData } from "./use-sync-current-view-data";
import { useVisibleAssetIds } from "./use-visible-asset-ids";

export function useAssetsTableData(args: UseAssetsTableDataArgs): UseAssetsTableDataResult {
  const { narrativeFilter, safetyFilter, searchQuery, selectedChain, setCurrentViewData } = args;
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<AssetsTableSortConfig>(DEFAULT_SORT_CONFIG);

  useEffect(() => {
    setPage(1);
  }, [selectedChain, searchQuery, narrativeFilter, safetyFilter]);

  const offset = (page - 1) * ASSETS_TABLE_PAGE_SIZE;
  const datasetKey = createAssetsDatasetKey({ page, searchQuery, selectedChain });
  const assetsUrl = buildAssetsMarketUrl({ offset, searchQuery, selectedChain });

  const { data: assetsData, isLoading } = useSWR<CoinMarketRow[]>(
    assetsUrl,
    async (url) => normalizeAssetRowsPayload(await fetchUntypedJson(url)),
    MARKET_QUERY_SWR_CONFIG,
  );

  const initialAssets = useMemo(() => createInitialAssets(assetsData), [assetsData]);
  const assetById = useMemo(() => new Map(initialAssets.map((asset) => [asset.id, asset])), [initialAssets]);
  const referencePrices = useMemo(() => createReferencePriceMap(initialAssets), [initialAssets]);
  const { visibleIds, setRowRef } = useVisibleAssetIds(
    initialAssets.map((asset) => asset.id),
  );
  const queryPayload = useMemo(
    () => buildVisibleAssetQueryPayload(visibleIds, assetById),
    [assetById, visibleIds],
  );
  const historyMap = usePrefetchedAssetHistory({
    datasetKey,
    initialAssets,
    queryPayload,
  });

  const { data: realtimePrices } = useSWR(
    queryPayload ? buildAssetPricesUrl(queryPayload) : null,
    async (url) => normalizeRecordPayload<Record<string, UntypedJson>>(await fetchUntypedJson(url)),
    LIVE_PRICES_SWR_CONFIG,
  );
  const { data: enrichmentData } = useSWR<Record<string, WatchlistEnrichmentSnapshot>>(
    queryPayload ? buildAssetEnrichmentUrl(queryPayload) : null,
    async (url) =>
      normalizeRecordPayload<Record<string, WatchlistEnrichmentSnapshot>>(
        await fetchUntypedJson(url),
      ),
    ENRICHMENT_SWR_CONFIG,
  );
  const { data: streamData } = useMarketStream(visibleIds);

  const displayAssets = useMemo(
    () =>
      mergeDisplayAssets({
        enrichmentData,
        historyMap,
        initialAssets,
        narrativeFilter,
        realtimePrices,
        referencePrices,
        safetyFilter,
        sortConfig,
        streamData,
      }),
    [
      enrichmentData,
      historyMap,
      initialAssets,
      narrativeFilter,
      realtimePrices,
      referencePrices,
      safetyFilter,
      sortConfig,
      streamData,
    ],
  );

  useSyncCurrentViewData({
    displayAssets,
    setCurrentViewData,
  });

  const handleSort = useCallback((key: AssetsTableSortKey) => {
    setSortConfig((currentSort) => getNextSortConfig(currentSort, key));
  }, []);

  return {
    displayAssets,
    handleSort,
    initialAssets,
    isLoading,
    limit: ASSETS_TABLE_PAGE_SIZE,
    page,
    setPage,
    setRowRef,
    sortConfig,
  };
}
