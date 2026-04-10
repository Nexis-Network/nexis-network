"use client";

import { useMemo, useState } from "react";

import type { AssetTick } from "@/lib/utils/asset-normalization";
import { useLiveAsset } from "@/hooks/use-live-asset";
import { useAssetAction } from "@/hooks/use-asset-action";
import type { ChartTimeframe } from "@/server/actions/market-data";
import type {
  AssetChartType,
  AssetPageTab,
} from "@/components/assets/asset-client-view/asset-page.types";
import {
  buildAssetMarketContext,
  formatCompactCurrency,
  getHistoryBounds,
} from "@/components/assets/asset-client-view/asset-page.utils";
import { useAssetPageMetrics } from "@/components/assets/asset-client-view/use-asset-page-metrics";

interface UseAssetPageControllerInput {
  initialAsset: AssetTick;
  initialHistory: [number, number][];
}

export function useAssetPageController({
  initialAsset,
  initialHistory,
}: UseAssetPageControllerInput) {
  const resolvedChainId = initialAsset.chainId || "1";
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("1W");
  const [interval, setInterval] = useState("1H");
  const [chartType, setChartType] = useState<AssetChartType>("price");
  const [activeTab, setActiveTab] = useState<AssetPageTab>("transactions");
  const [transactionPage, setTransactionPage] = useState(1);

  const { price = initialAsset.price, change24h = initialAsset.change24h } = useLiveAsset(
    initialAsset.symbol,
    initialAsset.price,
    resolvedChainId,
    initialAsset.change24h,
    initialAsset.address,
  );

  const metrics = useAssetPageMetrics({
    activeTab,
    asset: initialAsset,
    chartType,
    initialHistory,
    interval,
    resolvedChainId,
    timeframe,
    transactionPage,
  });

  useAssetAction(initialAsset);

  const marketCap = initialAsset.marketCap || 0;
  const volume24h = initialAsset.volume24h || 0;
  const { highPrice, lowPrice } = useMemo(
    () => getHistoryBounds(metrics.historyData),
    [metrics.historyData],
  );
  const marketContext = useMemo(
    () =>
      buildAssetMarketContext({
        asset: initialAsset,
        price,
        change24h,
        timeframe,
        marketCap,
        volume24h,
        highPrice,
        lowPrice,
      }),
    [
      change24h,
      highPrice,
      initialAsset,
      lowPrice,
      marketCap,
      price,
      timeframe,
      volume24h,
    ],
  );

  return {
    activeTab,
    change24h,
    chartType,
    formattedMarketCap: formatCompactCurrency(marketCap),
    formattedVolume24h: formatCompactCurrency(volume24h),
    fundingRounds: metrics.fundingRounds,
    handlers: {
      setActiveTab,
      setChartType,
      setInterval,
      setIsChatOpen,
      setTimeframe,
      setTransactionPage,
    },
    highPrice,
    historyData: metrics.historyData,
    interval,
    isChatOpen,
    isTransactionsLoading: metrics.transactionsQuery.isLoading,
    lowPrice,
    marketCap,
    marketContext,
    pools: metrics.pools,
    price,
    publicSales: metrics.publicSales,
    resolvedChainId,
    securityData: metrics.securityData,
    timeframe,
    tradeData: metrics.tradeData,
    transactionPage,
    transactions: metrics.transactionsQuery.data ?? [],
    vestingChart: metrics.vesting?.chart ?? [],
    vestingData: metrics.vesting?.details ?? null,
    volume24h,
    holders: metrics.holders,
  };
}
