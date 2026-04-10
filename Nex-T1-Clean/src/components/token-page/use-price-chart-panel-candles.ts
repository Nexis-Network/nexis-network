import { useMemo } from "react";

import type { ChartConfig } from "@/components/ui/chart";
import { useCoinOhlc } from "@/hooks/market";

import type { CandleDatum, ChartMode } from "./price-chart-panel.types";
import {
  buildCandleChartConfig,
  buildCandleData,
  computeCandleYDomain,
  mapTimeframeToOhlcDays,
} from "./price-chart-panel.utils";

type UsePriceChartPanelCandlesArgs = {
  chartMode: ChartMode;
  normalizedVsCurrency: string;
  primaryAssetId?: string;
  supportsCandles: boolean;
  timeframe: string;
};

type UsePriceChartPanelCandlesResult = {
  candleChartConfig: ChartConfig;
  candleData: CandleDatum[];
  candleDomain: [number, number];
  displayMode: ChartMode;
  isCandleLoading: boolean;
};

export function usePriceChartPanelCandles({
  chartMode,
  normalizedVsCurrency,
  primaryAssetId,
  supportsCandles,
  timeframe,
}: UsePriceChartPanelCandlesArgs): UsePriceChartPanelCandlesResult {
  const displayMode: ChartMode =
    supportsCandles && chartMode === "candle" ? "candle" : "line";
  const ohlcQuery = useCoinOhlc(
    primaryAssetId ?? "",
    {
      vsCurrency: normalizedVsCurrency,
      days: mapTimeframeToOhlcDays(timeframe),
    },
    displayMode === "candle" && Boolean(primaryAssetId),
  );
  const candleData = useMemo(
    () => buildCandleData(ohlcQuery.data?.data ?? []),
    [ohlcQuery.data?.data],
  );
  const candleChartConfig = useMemo(() => buildCandleChartConfig(), []);
  const candleDomain = useMemo(() => computeCandleYDomain(candleData), [candleData]);

  return {
    candleChartConfig,
    candleData,
    candleDomain,
    displayMode,
    isCandleLoading: ohlcQuery.isLoading,
  };
}
