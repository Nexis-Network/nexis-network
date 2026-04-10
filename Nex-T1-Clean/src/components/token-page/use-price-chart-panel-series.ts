import { useEffect, useMemo } from "react";
import type { ChartConfig } from "@/components/ui/chart";

import type {
  ChartMode,
  CombinedPoint,
  PriceChartPanelProps,
  ProcessedSeries,
} from "./price-chart-panel.types";
import {
  buildPriceChartConfig,
  buildProcessedSeries,
  mergeSeries,
} from "./price-chart-panel.utils";

type UsePriceChartPanelSeriesArgs = Pick<
  PriceChartPanelProps,
  "primaryAssetId" | "series"
> & {
  chartId: string;
  chartMode: ChartMode;
  setChartMode: (mode: ChartMode) => void;
};

type UsePriceChartPanelSeriesResult = {
  chartConfig: ChartConfig;
  mergedData: CombinedPoint[];
  primarySeries: ProcessedSeries | null;
  processedSeries: ProcessedSeries[];
  supportsCandles: boolean;
};

export function usePriceChartPanelSeries({
  chartId,
  chartMode,
  primaryAssetId,
  series,
  setChartMode,
}: UsePriceChartPanelSeriesArgs): UsePriceChartPanelSeriesResult {
  const processedSeries = useMemo<ProcessedSeries[]>(
    () => buildProcessedSeries(chartId, series),
    [chartId, series],
  );
  const chartConfig = useMemo(
    () => buildPriceChartConfig(processedSeries),
    [processedSeries],
  );
  const mergedData = useMemo(() => mergeSeries(processedSeries), [processedSeries]);
  const primarySeries =
    processedSeries.find((entry) => entry.isPrimary) ?? processedSeries[0] ?? null;
  const supportsCandles =
    primarySeries?.assetType === "token" &&
    Boolean(primaryAssetId) &&
    processedSeries.length === 1;

  useEffect(() => {
    if (!supportsCandles && chartMode === "candle") {
      setChartMode("line");
    }
  }, [chartMode, setChartMode, supportsCandles]);

  return {
    chartConfig,
    mergedData,
    primarySeries,
    processedSeries,
    supportsCandles,
  };
}
