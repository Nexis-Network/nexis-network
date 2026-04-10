import type { ChartConfig } from "@/components/ui/chart";
import type { CoinOHLCPoint } from "@/types/market";

import { POSITIVE_COLOR } from "./price-chart-panel-colors";
import { formatTimestampLabel } from "./price-chart-panel-formatters";
import type { CandleDatum, CombinedPoint } from "./price-chart-panel.types";

export function buildCandleChartConfig(): ChartConfig {
  return {
    close: {
      label: "Close",
      color: POSITIVE_COLOR,
    },
  };
}

export function isCandleDatum(
  point: CandleDatum | CombinedPoint | null | undefined,
): point is CandleDatum {
  return Boolean(
    point &&
      typeof (point as CandleDatum).close === "number" &&
      typeof (point as CandleDatum).open === "number",
  );
}

export function computeCandleYDomain(candles: CandleDatum[]): [number, number] {
  if (!candles.length) {
    return [0, 1];
  }

  const min = Math.min(...candles.map((candle) => candle.low));
  const max = Math.max(...candles.map((candle) => candle.high));

  if (Math.abs(max - min) < Number.EPSILON) {
    const delta = Math.abs(min) * 0.05 || 1;
    return [min - delta, max + delta];
  }

  const padding = (max - min) * 0.18;
  return [min - padding, max + padding];
}

export function buildCandleData(points: CoinOHLCPoint[]): CandleDatum[] {
  return points
    .filter((row): row is CoinOHLCPoint => Array.isArray(row) && row.length >= 5)
    .map(([timestamp, open, high, low, close]) => {
      const change = close - open;
      const changePercent = open !== 0 ? (change / open) * 100 : 0;
      const direction: CandleDatum["direction"] =
        change > 0 ? "up" : change < 0 ? "down" : "flat";

      return {
        timestamp,
        label: formatTimestampLabel(timestamp),
        open,
        high,
        low,
        close,
        change,
        changePercent,
        direction,
      };
    });
}

export function mapTimeframeToOhlcDays(timeframe: string): number | string {
  switch (timeframe) {
    case "1D":
      return 1;
    case "5D":
      return 7;
    case "1M":
      return 30;
    case "6M":
      return 180;
    case "YTD":
    case "1Y":
      return 365;
    case "5Y":
    case "MAX":
      return "max";
    default:
      return 30;
  }
}
