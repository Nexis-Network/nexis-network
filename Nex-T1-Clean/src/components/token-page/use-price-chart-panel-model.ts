import { useEffect, useMemo, useState } from "react";

import { usePriceChartPanelCandles } from "./use-price-chart-panel-candles";
import { resolvePriceStatSnapshot } from "./price-chart-panel-primary-stats";
import { usePriceChartPanelSeries } from "./use-price-chart-panel-series";
import type {
  ChartMode,
  CombinedPoint,
  PriceChartPanelProps,
} from "./price-chart-panel.types";
import {
  computeYDomain,
  formatChartTick,
} from "./price-chart-panel.utils";
import { usePriceChartPanelHover } from "./use-price-chart-panel-hover";

type UsePriceChartPanelModelArgs = Pick<
  PriceChartPanelProps,
  "isLoading" | "onPriceStatChange" | "primaryAssetId" | "series" | "timeframe" | "vsCurrency"
> & {
  chartId: string;
};

export function usePriceChartPanelModel({
  chartId,
  isLoading,
  onPriceStatChange,
  primaryAssetId,
  series,
  timeframe,
  vsCurrency,
}: UsePriceChartPanelModelArgs) {
  const [chartMode, setChartMode] = useState<ChartMode>("line");
  const normalizedVsCurrency = (vsCurrency ?? "usd").toLowerCase();
  const {
    chartConfig,
    mergedData,
    primarySeries,
    processedSeries,
    supportsCandles,
  } = usePriceChartPanelSeries({
    chartId,
    chartMode,
    primaryAssetId,
    series,
    setChartMode,
  });

  const {
    candleChartConfig,
    candleData,
    candleDomain,
    displayMode,
    isCandleLoading,
  } = usePriceChartPanelCandles({
    chartMode,
    normalizedVsCurrency,
    primaryAssetId,
    supportsCandles,
    timeframe,
  });
  const {
    activePoint,
    activeTimestamp,
    clearHover,
    onCandleTooltipMove,
    onLineTooltipMove,
  } = usePriceChartPanelHover({
    candleData,
    displayMode,
    mergedData,
    timeframe,
  });
  const {
    activeDeltaPercent,
    deltaAbsoluteLabel,
    deltaLabel,
    primaryValue,
    updatedLabel,
  } = resolvePriceStatSnapshot({
    activePoint,
    activeTimestamp,
    primarySeries,
  });
  const yDomain = useMemo(
    () => computeYDomain(mergedData, processedSeries),
    [mergedData, processedSeries],
  );

  useEffect(() => {
    if (!onPriceStatChange || !primarySeries) {
      return;
    }

    onPriceStatChange({
      price: primaryValue,
      deltaLabel,
      deltaAbsoluteLabel,
      isPositive: activeDeltaPercent == null ? null : activeDeltaPercent >= 0,
      timestamp: activeTimestamp,
      relativeLabel: updatedLabel,
      assetType: primarySeries.assetType,
    });
  }, [
    activeDeltaPercent,
    activeTimestamp,
    deltaAbsoluteLabel,
    deltaLabel,
    onPriceStatChange,
    primarySeries,
    primaryValue,
    updatedLabel,
  ]);

  return {
    activePoint: displayMode === "line" ? (activePoint as CombinedPoint | null) : null,
    activeTimestamp,
    areaBaseValue: yDomain[0] ?? 0,
    candleChartConfig,
    candleData,
    candleDomain,
    chartConfig,
    chartMode,
    clearHover,
    displayIsLoading: isLoading || (displayMode === "candle" && isCandleLoading),
    displayMode,
    mergedData,
    normalizedVsCurrency,
    onCandleTooltipMove,
    onLineTooltipMove,
    primarySeries,
    processedSeries,
    setChartMode,
    supportsCandles,
    tickFormatter: (value: number) => formatChartTick(value, timeframe),
    yDomain,
  };
}
