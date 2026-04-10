"use client";

import {
  useAssetFunding,
  useAssetHistory,
  useAssetHolders,
  useAssetPairs,
  useAssetSales,
  useAssetSecurity,
  useAssetTradeData,
  useAssetTransactions,
  useAssetVesting,
} from "@/lib/hooks/market/use-asset-metrics";
import type { AssetTick } from "@/lib/utils/asset-normalization";
import type { ChartTimeframe } from "@/server/actions/market-data";
import type {
  AssetChartType,
  AssetPageTab,
} from "@/components/assets/asset-client-view/asset-page.types";

interface UseAssetPageMetricsInput {
  activeTab: AssetPageTab;
  asset: AssetTick;
  chartType: AssetChartType;
  initialHistory: [number, number][];
  interval: string;
  resolvedChainId: string;
  timeframe: ChartTimeframe;
  transactionPage: number;
}

export function useAssetPageMetrics({
  activeTab,
  asset,
  chartType,
  initialHistory,
  interval,
  resolvedChainId,
  timeframe,
  transactionPage,
}: UseAssetPageMetricsInput) {
  const isDefaultHistory =
    timeframe === "1W" && chartType === "price" && interval === "1H";
  const { data: historyData = [] } = useAssetHistory(
    resolvedChainId,
    asset.address,
    timeframe,
    chartType,
    interval,
    isDefaultHistory ? initialHistory : undefined,
  );

  return {
    historyData,
    securityData: useAssetSecurity(resolvedChainId, asset.address).data ?? null,
    tradeData: useAssetTradeData(resolvedChainId, asset.address).data ?? null,
    holders: useAssetHolders(resolvedChainId, asset.address, activeTab === "holders").data ?? [],
    pools: useAssetPairs(resolvedChainId, asset.address, activeTab === "pools").data ?? [],
    transactionsQuery: useAssetTransactions(
      resolvedChainId,
      asset.address,
      transactionPage,
      15,
      activeTab === "transactions",
    ),
    vesting: useAssetVesting(asset.symbol, activeTab === "vesting").data,
    fundingRounds: useAssetFunding(asset.symbol, activeTab === "funding").data ?? [],
    publicSales: useAssetSales(asset.symbol, activeTab === "sales").data ?? [],
  };
}
