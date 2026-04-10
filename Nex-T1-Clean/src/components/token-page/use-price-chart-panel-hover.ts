import { useCallback, useEffect, useState } from "react";

import type {
  CandleDatum,
  ChartMode,
  CombinedPoint,
} from "./price-chart-panel.types";

type UsePriceChartPanelHoverArgs = {
  candleData: CandleDatum[];
  displayMode: ChartMode;
  mergedData: CombinedPoint[];
  timeframe: string;
};

type PriceChartPanelHoverPoint = CandleDatum | CombinedPoint;

type UsePriceChartPanelHoverResult = {
  activePoint: PriceChartPanelHoverPoint | null;
  activeTimestamp: number | null;
  clearHover: () => void;
  onCandleTooltipMove: (payloadIndex?: number) => void;
  onLineTooltipMove: (payloadIndex?: number) => void;
};

const isValidPayloadIndex = (payloadIndex: number | undefined, length: number): boolean =>
  payloadIndex != null && payloadIndex >= 0 && payloadIndex < length;

export function usePriceChartPanelHover({
  candleData,
  displayMode,
  mergedData,
  timeframe,
}: UsePriceChartPanelHoverArgs): UsePriceChartPanelHoverResult {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    setHoverIndex(null);
  }, [candleData.length, displayMode, mergedData.length, timeframe]);

  const onLineTooltipMove = useCallback(
    (payloadIndex?: number) => {
      if (!isValidPayloadIndex(payloadIndex, mergedData.length)) {
        return;
      }
      setHoverIndex(payloadIndex ?? null);
    },
    [mergedData.length],
  );
  const onCandleTooltipMove = useCallback(
    (payloadIndex?: number) => {
      if (!isValidPayloadIndex(payloadIndex, candleData.length)) {
        return;
      }
      setHoverIndex(payloadIndex ?? null);
    },
    [candleData.length],
  );
  const clearHover = useCallback(() => {
    setHoverIndex(null);
  }, []);

  const activeDataset = displayMode === "candle" ? candleData : mergedData;
  const activePoint =
    activeDataset[hoverIndex ?? Math.max(activeDataset.length - 1, 0)] ?? null;

  return {
    activePoint,
    activeTimestamp: activePoint?.timestamp ?? null,
    clearHover,
    onCandleTooltipMove,
    onLineTooltipMove,
  };
}
