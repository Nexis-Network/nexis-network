"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

import { logger } from "@/lib/logger";
import type { CoinMarketRow } from "@/types/market/market-data";

import { HISTORY_SWR_CONFIG, INITIAL_HISTORY_PREFETCH_COUNT } from "./assets-table.constants";
import { normalizeRecordPayload } from "./assets-table-payload";
import type { AssetHistoryMap } from "./assets-table.types";
import { buildAssetHistoryUrl, fetchUntypedJson } from "./assets-table.utils";

export function usePrefetchedAssetHistory(args: {
  datasetKey: string;
  initialAssets: CoinMarketRow[];
  queryPayload: string;
}): AssetHistoryMap {
  const [historyMap, setHistoryMap] = useState<AssetHistoryMap>({});
  const [prefetchedDatasetKey, setPrefetchedDatasetKey] = useState<string | null>(null);
  const { data: refreshedHistory } = useSWR(
    args.queryPayload ? buildAssetHistoryUrl(args.queryPayload) : null,
    async (url) => normalizeRecordPayload<Record<string, number[]>>(await fetchUntypedJson(url)),
    HISTORY_SWR_CONFIG,
  );

  useEffect(() => {
    setHistoryMap({});
    setPrefetchedDatasetKey(null);
  }, [args.datasetKey]);

  useEffect(() => {
    if (args.initialAssets.length === 0 || prefetchedDatasetKey === args.datasetKey) {
      return;
    }

    const controller = new AbortController();
    const topAssetIds = args.initialAssets
      .slice(0, INITIAL_HISTORY_PREFETCH_COUNT)
      .map((asset) => (asset.chain ? `${asset.chain}:${asset.id}` : asset.id))
      .join(",");

    if (!topAssetIds) {
      setPrefetchedDatasetKey(args.datasetKey);
      return;
    }

    void fetchUntypedJson(buildAssetHistoryUrl(topAssetIds), { signal: controller.signal })
      .then((payload) => {
        setHistoryMap(normalizeRecordPayload<Record<string, number[]>>(payload));
        setPrefetchedDatasetKey(args.datasetKey);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          logger.error("Initial enrichment failed (Network/Parse):", error);
        }
      });

    return () => controller.abort();
  }, [args.datasetKey, args.initialAssets, prefetchedDatasetKey]);

  useEffect(() => {
    if (refreshedHistory && Object.keys(refreshedHistory).length > 0) {
      setHistoryMap((currentHistory) => ({ ...currentHistory, ...refreshedHistory }));
    }
  }, [refreshedHistory]);

  return historyMap;
}
