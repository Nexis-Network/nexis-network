import type { ChartConfig } from "@/components/ui/chart";

import { resolveSeriesColor } from "./price-chart-panel-colors";
import { formatTimestampLabel } from "./price-chart-panel-formatters";
import type {
  ChartPoint,
  ChartStats,
  CombinedPoint,
  PriceChartSeries,
  ProcessedSeries,
  Tone,
} from "./price-chart-panel.types";

export function toneFromDelta(delta: number | null): Tone {
  if (delta == null) {
    return "neutral";
  }
  if (delta > 0) {
    return "positive";
  }
  if (delta < 0) {
    return "negative";
  }
  return "neutral";
}

export function computeStats(points: ChartPoint[]): ChartStats {
  if (!points.length) {
    return { latestPrice: null, deltaAbsolute: null, deltaPercent: null };
  }

  const latestPrice = points[points.length - 1]?.price ?? null;
  const firstPrice = points[0]?.price ?? null;
  const deltaAbsolute =
    latestPrice != null && firstPrice != null ? latestPrice - firstPrice : null;
  const deltaPercent =
    latestPrice != null && firstPrice != null && firstPrice !== 0
      ? ((latestPrice - firstPrice) / firstPrice) * 100
      : null;

  return { latestPrice, deltaAbsolute, deltaPercent };
}

export function buildProcessedSeries(
  chartId: string,
  series: PriceChartSeries[],
): ProcessedSeries[] {
  return series.map((entry, index) => {
    const sanitized = entry.points.filter((point) => Number.isFinite(point.price));
    const stats = computeStats(sanitized);
    const tone = toneFromDelta(stats.deltaPercent);
    const isPrimary = entry.isPrimary ?? index === 0;

    return {
      ...entry,
      sanitized,
      stats,
      tone,
      color: resolveSeriesColor(index, tone, isPrimary, entry.color),
      dataKey: `series_${index}`,
      gradientId: `${chartId}-gradient-${index}`,
      isPrimary,
    } satisfies ProcessedSeries;
  });
}

export function buildPriceChartConfig(processedSeries: ProcessedSeries[]): ChartConfig {
  return processedSeries.reduce<ChartConfig>((config, entry) => {
    config[entry.dataKey] = {
      label: entry.name,
      color: entry.color,
    };
    return config;
  }, {});
}

export function mergeSeries(seriesList: ProcessedSeries[]): CombinedPoint[] {
  if (!seriesList.length) {
    return [];
  }

  const lookup = new Map<number, Record<string, number | null>>();

  for (const entry of seriesList) {
    for (const point of entry.sanitized) {
      const row = lookup.get(point.timestamp) ?? {};
      row[entry.dataKey] = point.price;
      lookup.set(point.timestamp, row);
    }
  }

  return Array.from(lookup.keys())
    .sort((left, right) => left - right)
    .map((timestamp) => {
      const row: CombinedPoint = {
        timestamp,
        label: formatTimestampLabel(timestamp),
      };
      const values = lookup.get(timestamp) ?? {};

      for (const entry of seriesList) {
        row[entry.dataKey] = values[entry.dataKey] ?? null;
      }

      return row;
    });
}

export function getNearestValueForTimestamp(
  series: ProcessedSeries,
  timestamp?: number | null,
  fallback?: unknown,
): number | null {
  if (typeof fallback === "number" && Number.isFinite(fallback)) {
    return fallback;
  }

  if (!timestamp || !series.sanitized.length) {
    return null;
  }

  const points = series.sanitized;
  let left = 0;
  let right = points.length - 1;

  while (left <= right) {
    const mid = (left + right) >> 1;
    const midTime = points[mid]?.timestamp ?? 0;

    if (midTime === timestamp) {
      return points[mid]?.price ?? null;
    }

    if (midTime < timestamp) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  const candidates = [
    points[Math.max(0, right)],
    points[Math.min(points.length - 1, left)],
  ];
  let nearestDistance = Number.POSITIVE_INFINITY;
  let nearestPrice: number | null = null;

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const distance = Math.abs(candidate.timestamp - timestamp);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestPrice = candidate.price;
    }
  }

  return nearestPrice;
}
