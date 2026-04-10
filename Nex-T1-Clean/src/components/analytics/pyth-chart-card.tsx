"use client";

import { useCallback, useEffect, useId, useMemo } from "react";

import { cn } from "@/lib/utils";

import { POSITIVE_PRICE_COLOR } from "./pyth-chart.constants";
import {
  buildChartPoints,
  getPrimarySymbol,
  getZoomedData,
} from "./pyth-chart-data";
import { PythChartHeader } from "./pyth-chart-header";
import { PythChartMarketSnapshot } from "./pyth-chart-market-snapshot";
import {
  buildYAxisDomain,
  getLineStyles,
  getPresetMenuState,
  getPriceTrendPresentation,
  getTradeSignalPresentation,
} from "./pyth-chart-presenters";
import { ChartSkeleton } from "./pyth-chart-skeleton";
import { PythChartSurface } from "./pyth-chart-surface";
import { buildChartStats, buildMetricsRow } from "./pyth-chart-stats";
import type { PythChartProps } from "./pyth-chart.types";
import { usePythChartDrawing } from "./use-pyth-chart-drawing";
import { usePythChartHistory } from "./use-pyth-chart-history";
import { usePythChartSelection } from "./use-pyth-chart-selection";
import { usePythChartTradeSignal } from "./use-pyth-chart-trade-signal";
import { usePythChartZoom } from "./use-pyth-chart-zoom";

export function PythChartCard({
  className,
  lookbackDays = 7,
  priceFeedId,
  resolutionMinutes = 15,
  ticker,
}: PythChartProps) {
  const chartId = useId().replace(/:/g, "");
  const priceGlowId = `${chartId}-line-glow`;
  const emaGlowId = `${chartId}-ema-glow`;
  const {
    activeRangeDays,
    activeResolutionMinutes,
    availablePresets,
    selectedPreset,
    setAvailablePresets,
    syncToPreset,
  } = usePythChartSelection({
    lookbackDays,
    resolutionMinutes,
  });
  const resolutionMs = activeResolutionMinutes * 60 * 1000;
  const { data, error, isLoading, latest } = usePythChartHistory({
    activeRangeDays,
    activeResolutionMinutes,
    priceFeedId,
    resolutionMs,
    selectedPreset,
    setAvailablePresets,
    syncToPreset,
    ticker,
  });
  const chartPoints = useMemo(
    () => buildChartPoints(data, activeResolutionMinutes),
    [activeResolutionMinutes, data],
  );
  const { handleWheel, resetVisiblePoints, visiblePoints } = usePythChartZoom(
    chartPoints.length,
  );
  const handlePresetSelect = useCallback(
    (preset: typeof selectedPreset) => {
      syncToPreset(preset);
      resetVisiblePoints();
    },
    [resetVisiblePoints, syncToPreset],
  );

  useEffect(() => {
    resetVisiblePoints();
  }, [resetVisiblePoints, ticker]);

  const zoomedData = useMemo(
    () => getZoomedData(chartPoints, visiblePoints),
    [chartPoints, visiblePoints],
  );
  const latestComputedEma = latest?.emaPrice ?? chartPoints.at(-1)?.ema ?? null;
  const stats = useMemo(
    () => buildChartStats(data, zoomedData, latest?.publishTime),
    [data, latest?.publishTime, zoomedData],
  );
  const { isPriceUp, priceLineColor, trendGlyph } = getPriceTrendPresentation(
    stats?.change ?? 0,
  );
  const primarySymbol = useMemo(() => getPrimarySymbol(ticker), [ticker]);
  const { isSignalLoading, retryTradeSignal, signalError, tradeSignal } =
    usePythChartTradeSignal(primarySymbol);
  const { tradeSignalColor, tradeSignalLabel, tradeSignalUpdatedLabel } =
    getTradeSignalPresentation(tradeSignal);
  const { hasMenuOptions, menuPresets, presetIsCustom, presetLabel, presetTooltip } =
    getPresetMenuState(availablePresets, selectedPreset);
  const metricsRow = useMemo(
    () => buildMetricsRow(stats, latestComputedEma),
    [latestComputedEma, stats],
  );
  const lineStyles = useMemo(() => getLineStyles(priceLineColor), [priceLineColor]);
  const yAxisDomain = useMemo(() => buildYAxisDomain(stats), [stats]);
  const {
    canClearTrendLines,
    draftLine,
    drawButtonLabel,
    drawHint,
    handleChartPointerDown,
    handleChartPointerLeave,
    handleChartPointerMove,
    handleChartPointerUp,
    handleClearTrendLines,
    handleToggleDrawMode,
    isDrawMode,
    trendLines,
  } = usePythChartDrawing({
    activeRangeDays,
    activeResolutionMinutes,
    ticker,
  });

  if (isLoading) {
    return <ChartSkeleton className={className} />;
  }

  if (error) {
    return (
      <div
        className={cn(
          "mt-3 space-y-2 rounded-xl border border-border/40 bg-background/60 p-3",
          className,
        )}
      >
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div
        className={cn(
          "mt-3 space-y-2 rounded-xl border border-border/40 bg-background/60 p-3",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">No price data available.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mt-3 space-y-3 rounded-xl border border-border/40 bg-background/60 p-3",
        className,
      )}
    >
      <PythChartHeader
        canClearTrendLines={canClearTrendLines}
        drawButtonLabel={drawButtonLabel}
        drawHint={drawHint}
        handleClearTrendLines={handleClearTrendLines}
        handlePresetSelect={handlePresetSelect}
        handleRetrySignal={retryTradeSignal}
        handleToggleDrawMode={handleToggleDrawMode}
        hasMenuOptions={hasMenuOptions}
        isDrawMode={isDrawMode}
        isSignalLoading={isSignalLoading}
        latestComputedEma={latestComputedEma}
        menuPresets={menuPresets}
        presetIsCustom={presetIsCustom}
        presetLabel={presetLabel}
        presetTooltip={presetTooltip}
        priceLineColor={stats ? priceLineColor : POSITIVE_PRICE_COLOR}
        primarySymbol={primarySymbol}
        selectedPreset={selectedPreset}
        signalError={signalError}
        stats={stats}
        ticker={ticker}
        tradeSignal={tradeSignal}
        tradeSignalColor={tradeSignalColor}
        tradeSignalLabel={tradeSignalLabel}
        tradeSignalUpdatedLabel={tradeSignalUpdatedLabel}
        trendGlyph={trendGlyph}
      />
      <PythChartSurface
        chartData={zoomedData}
        draftLine={draftLine}
        emaGlowId={emaGlowId}
        handleChartPointerDown={handleChartPointerDown}
        handleChartPointerLeave={handleChartPointerLeave}
        handleChartPointerMove={handleChartPointerMove}
        handleChartPointerUp={handleChartPointerUp}
        handleWheel={handleWheel}
        isDrawMode={isDrawMode}
        lineStyles={lineStyles}
        priceGlowId={priceGlowId}
        trendLines={trendLines}
        yAxisDomain={yAxisDomain}
      />
      <PythChartMarketSnapshot isPriceUp={isPriceUp} metricsRow={metricsRow} />
    </div>
  );
}
