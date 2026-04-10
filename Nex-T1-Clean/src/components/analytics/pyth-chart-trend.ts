import type { ChartPoint, TrendPoint } from "./pyth-chart.types";

export const createTrendLineId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const toTrendPoint = (payload?: ChartPoint): TrendPoint | null => {
  if (!payload) {
    return null;
  }

  const price =
    typeof payload.close === "number"
      ? payload.close
      : typeof payload.ema === "number"
        ? payload.ema
        : null;

  if (!payload.date || price === null) {
    return null;
  }

  return {
    date: payload.date,
    value: price,
  };
};
