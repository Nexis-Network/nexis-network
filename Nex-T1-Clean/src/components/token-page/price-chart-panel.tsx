"use client";

import { useId, type JSX } from "react";

import { DotPattern } from "@/components/ui/dot-pattern";
import { useCspNonce } from "@/lib/security/client-nonce";
import { cn } from "@/lib/utils";

import {
  ChartModeToggle,
  IntegrityLayerBadge,
  TimeframeSegmentControl,
} from "./price-chart-panel-controls";
import { PriceChartPanelChart } from "./price-chart-panel-chart";
import {
  TOKEN_PANEL_FRAME_CLASS,
  TOKEN_PANEL_INNER_CLASS,
  TOKEN_PANEL_MAX_WIDTH_CLASS,
} from "./constants";
import type { PriceChartPanelProps } from "./price-chart-panel.types";
import { usePriceChartPanelModel } from "./use-price-chart-panel-model";

function PriceChartPanel({
  series,
  timeframe,
  options,
  onChangeTimeframe,
  isLoading,
  isError,
  onPriceStatChange,
  dailyHigh,
  dailyLow,
  primaryAssetId,
  vsCurrency = "usd",
}: PriceChartPanelProps): JSX.Element {
  const nonce = useCspNonce();
  const chartId = useId().replace(/:/g, "");
  const glowId = `${chartId}-glow`;
  const livePingName = `${chartId}-live-ping`;
  const livePingClass = `${chartId}-live-ping-dot`;
  const {
    activePoint,
    activeTimestamp,
    areaBaseValue,
    candleChartConfig,
    candleData,
    candleDomain,
    chartConfig,
    chartMode,
    clearHover,
    displayIsLoading,
    displayMode,
    mergedData,
    normalizedVsCurrency,
    onCandleTooltipMove,
    onLineTooltipMove,
    primarySeries,
    processedSeries,
    setChartMode,
    supportsCandles,
    tickFormatter,
    yDomain,
  } = usePriceChartPanelModel({
    chartId,
    isLoading,
    onPriceStatChange,
    primaryAssetId,
    series,
    timeframe,
    vsCurrency,
  });
  const isEmpty = displayMode === "candle" ? candleData.length < 2 : mergedData.length < 2;

  return (
    <section className={cn(TOKEN_PANEL_FRAME_CLASS, TOKEN_PANEL_MAX_WIDTH_CLASS)}>
      <div
        className={cn(
          TOKEN_PANEL_INNER_CLASS,
          "relative overflow-hidden rounded-[11px] px-0 py-5 font-sans text-foreground",
        )}
      >
        <DotPattern
          width={18}
          height={18}
          className="mask-[radial-gradient(300px_circle_at_center,white,transparent)] pointer-events-none absolute inset-0 -z-10 flex min-h-full w-full items-center justify-center pb-12 opacity-20"
          style={{ color: "#f4f4f4" }}
        />
        <div className="relative z-10 space-y-5">
          <div className="flex flex-col gap-4 px-6">
            <div className="flex flex-wrap items-center gap-3">
              <TimeframeSegmentControl
                options={options}
                activeId={timeframe}
                onSelect={onChangeTimeframe}
              />
              <div className="ml-auto flex items-center gap-2">
                <ChartModeToggle
                  mode={chartMode}
                  disabled={!supportsCandles}
                  onChange={setChartMode}
                />
                <IntegrityLayerBadge />
              </div>
            </div>
          </div>

          <PriceChartPanelChart
            activePoint={activePoint}
            activeTimestamp={activeTimestamp}
            areaBaseValue={areaBaseValue}
            candleChartConfig={candleChartConfig}
            candleData={candleData}
            candleDomain={candleDomain}
            chartConfig={chartConfig}
            dailyHigh={dailyHigh}
            dailyLow={dailyLow}
            displayIsLoading={displayIsLoading}
            displayMode={displayMode}
            glowId={glowId}
            isError={isError}
            isEmpty={isEmpty}
            livePingClass={livePingClass}
            livePingName={livePingName}
            mergedData={mergedData}
            normalizedVsCurrency={normalizedVsCurrency}
            nonce={nonce}
            onCandleTooltipMove={onCandleTooltipMove}
            onHoverClear={clearHover}
            onLineTooltipMove={onLineTooltipMove}
            onReload={() => window.location.reload()}
            primarySeries={primarySeries}
            processedSeries={processedSeries}
            tickFormatter={tickFormatter}
            yDomain={yDomain}
          />
        </div>
      </div>
    </section>
  );
}

export type {
  ChartTimeframeOption,
  PriceChartPanelProps,
  PriceChartSeries,
  PriceStatSnapshot,
} from "./price-chart-panel.types";
export { PriceChartPanel };
export default PriceChartPanel;
