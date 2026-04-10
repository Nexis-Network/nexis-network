import { formatRelativeTime } from "@/modules/prices/market-overview/formatters";

import type {
  CandleDatum,
  CombinedPoint,
  ProcessedSeries,
} from "./price-chart-panel.types";
import {
  formatAbsoluteChange,
  formatDeltaPercent,
  getNearestValueForTimestamp,
  isCandleDatum,
} from "./price-chart-panel.utils";

type ResolvePriceStatSnapshotArgs = {
  activePoint: CandleDatum | CombinedPoint | null;
  activeTimestamp: number | null;
  primarySeries: ProcessedSeries | null;
};

type ResolvePriceStatSnapshotResult = {
  activeDeltaPercent: number | null;
  deltaAbsoluteLabel: string | null;
  deltaLabel: string;
  primaryValue: number | null;
  updatedLabel: string;
};

export function resolvePriceStatSnapshot({
  activePoint,
  activeTimestamp,
  primarySeries,
}: ResolvePriceStatSnapshotArgs): ResolvePriceStatSnapshotResult {
  const fallbackValue =
    isCandleDatum(activePoint)
      ? activePoint.close
      : primarySeries
        ? (activePoint as CombinedPoint | null | undefined)?.[primarySeries.dataKey]
        : undefined;
  const primaryValue = primarySeries
    ? getNearestValueForTimestamp(primarySeries, activeTimestamp, fallbackValue) ??
      primarySeries.stats.latestPrice
    : null;
  const primaryBasePrice = primarySeries?.sanitized[0]?.price ?? null;
  const activeDeltaAbsolute =
    primaryBasePrice != null && primaryValue != null
      ? primaryValue - primaryBasePrice
      : primarySeries?.stats.deltaAbsolute ?? null;
  const activeDeltaPercent =
    primaryBasePrice != null &&
    primaryValue != null &&
    primaryBasePrice !== 0
      ? ((primaryValue - primaryBasePrice) / primaryBasePrice) * 100
      : primarySeries?.stats.deltaPercent ?? null;

  return {
    activeDeltaPercent,
    deltaAbsoluteLabel: formatAbsoluteChange(activeDeltaAbsolute),
    deltaLabel: formatDeltaPercent(activeDeltaPercent),
    primaryValue,
    updatedLabel: activePoint
      ? formatRelativeTime(activePoint.timestamp)
      : "just now",
  };
}
