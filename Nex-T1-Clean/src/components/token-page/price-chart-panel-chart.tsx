import type { JSX } from "react";

import type { ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

import { PriceChartCandleChart } from "./price-chart-panel-candle-chart";
import { PriceChartLineChart } from "./price-chart-panel-line-chart";
import type {
  CandleDatum,
  ChartMode,
  CombinedPoint,
  ProcessedSeries,
} from "./price-chart-panel.types";

type PriceChartPanelChartProps = {
  activePoint: CombinedPoint | null;
  activeTimestamp: number | null;
  areaBaseValue: number;
  candleChartConfig: ChartConfig;
  candleData: CandleDatum[];
  candleDomain: [number, number];
  chartConfig: ChartConfig;
  dailyHigh?: number | null;
  dailyLow?: number | null;
  displayIsLoading: boolean;
  displayMode: ChartMode;
  glowId: string;
  isError: boolean;
  isEmpty: boolean;
  livePingClass: string;
  livePingName: string;
  mergedData: CombinedPoint[];
  normalizedVsCurrency: string;
  nonce?: string | null;
  onCandleTooltipMove: (payloadIndex?: number) => void;
  onHoverClear: () => void;
  onLineTooltipMove: (payloadIndex?: number) => void;
  onReload: () => void;
  primarySeries: ProcessedSeries | null;
  processedSeries: ProcessedSeries[];
  tickFormatter: (value: number) => string;
  yDomain: [number, number];
};

export function PriceChartPanelChart({
  activePoint,
  activeTimestamp,
  areaBaseValue,
  candleChartConfig,
  candleData,
  candleDomain,
  chartConfig,
  dailyHigh,
  dailyLow,
  displayIsLoading,
  displayMode,
  glowId,
  isError,
  isEmpty,
  livePingClass,
  livePingName,
  mergedData,
  normalizedVsCurrency,
  nonce,
  onCandleTooltipMove,
  onHoverClear,
  onLineTooltipMove,
  onReload,
  primarySeries,
  processedSeries,
  tickFormatter,
  yDomain,
}: PriceChartPanelChartProps): JSX.Element {
  return (
    <div className="relative h-[290px] overflow-hidden rounded-[10px] bg-transparent">
      <style nonce={nonce ?? undefined}>
        {`
@keyframes ${livePingName} {
  0% { transform: scale(1); opacity: 0.9; }
  70% { opacity: 0.4; }
  100% { transform: scale(2.25); opacity: 0; }
}
.${livePingClass} {
  transform-origin: center;
  transform-box: fill-box;
  animation: ${livePingName} 1.25s ease-out infinite;
}
        `}
      </style>
      {displayIsLoading ? (
        <div className="flex h-full items-center justify-center">
          <Skeleton className="h-16 w-2/3 bg-muted/10" />
        </div>
      ) : isError ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-destructive">
          <span>Error loading chart data.</span>
          <button
            type="button"
            onClick={onReload}
            className="text-xs text-blue-500 underline"
          >
            Try again
          </button>
        </div>
      ) : isEmpty ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>No chart data available.</span>
          <span className="text-xs text-muted-foreground/60">
            {primarySeries?.assetType === "nft"
              ? "NFT floor data missing"
              : "Waiting for market feed"}
          </span>
        </div>
      ) : displayMode === "candle" ? (
        <PriceChartCandleChart
          candleChartConfig={candleChartConfig}
          candleData={candleData}
          candleDomain={candleDomain}
          normalizedVsCurrency={normalizedVsCurrency}
          onHoverClear={onHoverClear}
          onTooltipMove={onCandleTooltipMove}
          tickFormatter={tickFormatter}
        />
      ) : (
        <PriceChartLineChart
          activePoint={activePoint}
          activeTimestamp={activeTimestamp}
          areaBaseValue={areaBaseValue}
          chartConfig={chartConfig}
          dailyHigh={dailyHigh}
          dailyLow={dailyLow}
          glowId={glowId}
          livePingClass={livePingClass}
          mergedData={mergedData}
          onHoverClear={onHoverClear}
          onTooltipMove={onLineTooltipMove}
          primarySeries={primarySeries}
          processedSeries={processedSeries}
          tickFormatter={tickFormatter}
          yDomain={yDomain}
        />
      )}
    </div>
  );
}
