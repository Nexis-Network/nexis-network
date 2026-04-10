import { MIN_VISIBLE_POINTS } from "./pyth-chart.constants";
import type {
  ChartPoint,
  LatestResponse,
  PriceDatum,
} from "./pyth-chart.types";

export const isLatestResponse = (value: UntypedJson): value is LatestResponse => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, UntypedJson>;
  return (
    typeof candidate.price === "number" &&
    typeof candidate.publishTime === "number" &&
    (candidate.emaPrice === undefined ||
      candidate.emaPrice === null ||
      typeof candidate.emaPrice === "number")
  );
};

export const parsePriceDatum = (value: UntypedJson): PriceDatum | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Record<string, UntypedJson>;
  const { timestamp, date, open, high, low, close, volume } = candidate;

  if (
    typeof timestamp !== "number" ||
    typeof date !== "string" ||
    typeof open !== "number" ||
    typeof high !== "number" ||
    typeof low !== "number" ||
    typeof close !== "number" ||
    typeof volume !== "number"
  ) {
    return null;
  }

  return {
    timestamp,
    date,
    open,
    high,
    low,
    close,
    volume,
  };
};

export const applyLatestPricePoint = (
  previous: PriceDatum[],
  latestPayload: LatestResponse,
  resolutionMs: number,
): PriceDatum[] => {
  if (previous.length === 0) {
    return previous;
  }

  const last = previous[previous.length - 1];
  const publishMs = latestPayload.publishTime * 1000;
  const sameBucket = publishMs - last.timestamp * 1000 < resolutionMs;

  if (sameBucket) {
    const updatedPoint = {
      ...last,
      close: latestPayload.price,
      high: Math.max(last.high, latestPayload.price),
      low: Math.min(last.low, latestPayload.price),
    };

    return [...previous.slice(0, -1), updatedPoint];
  }

  const newPoint: PriceDatum = {
    timestamp: latestPayload.publishTime,
    date: new Date(latestPayload.publishTime * 1000).toISOString(),
    open: last.close,
    high: Math.max(last.close, latestPayload.price),
    low: Math.min(last.close, latestPayload.price),
    close: latestPayload.price,
    volume: 0,
  };

  return [...previous, newPoint];
};

export const buildChartPoints = (
  data: PriceDatum[],
  activeResolutionMinutes: number,
): ChartPoint[] => {
  if (!data.length) {
    return [];
  }

  const periodInSamples = Math.max(
    2,
    Math.min(60, Math.round((24 * 60) / activeResolutionMinutes)),
  );
  const smoothing = 2 / (periodInSamples + 1);
  let ema = data[0].close;

  return data.map<ChartPoint>((point, index) => {
    ema = index === 0 ? point.close : point.close * smoothing + ema * (1 - smoothing);

    return {
      ...point,
      ema,
    };
  });
};

export const getZoomedData = (
  chartPoints: ChartPoint[],
  visiblePoints: number,
): ChartPoint[] => {
  if (!chartPoints.length) {
    return [];
  }

  const cappedMax = chartPoints.length;
  const desired = Math.max(
    Math.min(visiblePoints, cappedMax),
    Math.min(MIN_VISIBLE_POINTS, cappedMax),
  );
  const start = Math.max(0, chartPoints.length - desired);

  return chartPoints.slice(start);
};

export const clampVisiblePoints = (current: number, cappedMax: number): number => {
  if (cappedMax <= MIN_VISIBLE_POINTS) {
    return cappedMax;
  }
  if (current > cappedMax) {
    return cappedMax;
  }
  if (current < MIN_VISIBLE_POINTS) {
    return MIN_VISIBLE_POINTS;
  }
  return current;
};

export const getPrimarySymbol = (ticker: string): string | null => {
  if (!ticker) {
    return null;
  }

  const cleaned = ticker
    .split(/[\s/:-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!cleaned.length) {
    return null;
  }

  return cleaned[0]?.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || null;
};
