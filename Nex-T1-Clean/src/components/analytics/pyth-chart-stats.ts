import type { MarketSnapshotRow } from "@/components/market-overview/market-snapshot-table";
import { formatUsd } from "@/modules/prices/pyth/base";

import type { ChartPoint, PriceDatum } from "./pyth-chart.types";

export type PythChartStats = {
  change: number;
  changePct: number;
  high: number;
  latest: number;
  low: number;
  publishTime: number;
};

export const buildChartStats = (
  data: PriceDatum[],
  zoomedData: ChartPoint[],
  publishTime?: number,
): PythChartStats | null => {
  if (!data.length) {
    return null;
  }

  const latestPoint = data[data.length - 1];
  const dayAgo = latestPoint.timestamp - 24 * 60 * 60;
  const reference = [...data].reverse().find((point) => point.timestamp <= dayAgo) ?? data[0];
  const visible = zoomedData.length > 0 ? zoomedData : data;
  const high = Math.max(...visible.map((point) => point.high));
  const low = Math.min(...visible.map((point) => point.low));
  const change = latestPoint.close - reference.close;
  const changePct = reference.close === 0 ? 0 : (change / reference.close) * 100;

  return {
    change,
    changePct,
    high,
    latest: latestPoint.close,
    low,
    publishTime: publishTime ?? latestPoint.timestamp,
  };
};

export const buildMetricsRow = (
  stats: PythChartStats | null,
  latestComputedEma: number | null,
): MarketSnapshotRow | null => {
  if (!stats) {
    return null;
  }

  return {
    lastPrice: formatUsd(stats.latest),
    ema: latestComputedEma !== null ? formatUsd(latestComputedEma) : "—",
    change: formatUsd(stats.change),
    changePct: `${stats.changePct.toFixed(2)}%`,
    high: formatUsd(stats.high),
    low: formatUsd(stats.low),
  };
};
