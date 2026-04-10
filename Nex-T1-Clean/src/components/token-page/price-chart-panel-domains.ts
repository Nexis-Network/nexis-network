import type { CombinedPoint, ProcessedSeries } from "./price-chart-panel.types";

export function computeYDomain(
  points: CombinedPoint[],
  seriesList: ProcessedSeries[],
): [number, number] {
  const values: number[] = [];

  for (const point of points) {
    for (const entry of seriesList) {
      const value = point[entry.dataKey];
      if (typeof value === "number" && Number.isFinite(value)) {
        values.push(value);
      }
    }
  }

  if (!values.length) {
    return [0, 1];
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (Math.abs(maxValue - minValue) < Number.EPSILON) {
    const delta = Math.abs(minValue) * 0.05 || 1;
    return [minValue - delta, maxValue + delta];
  }

  const padding = (maxValue - minValue) * 0.25;
  return [minValue - padding, maxValue + padding];
}
