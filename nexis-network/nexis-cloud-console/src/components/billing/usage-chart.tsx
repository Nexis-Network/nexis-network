"use client";

import { useMemo } from "react";

export type UsagePoint = {
  date: string;
  cost: number | null;
};

type UsageChartProps = {
  series: UsagePoint[];
  currency: string | null;
};

function formatCurrency(value: number, currency: string | null) {
  const label = currency || "USD";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: label }).format(value);
  } catch {
    return `${value.toFixed(2)} ${label}`;
  }
}

export function UsageChart({ series, currency }: UsageChartProps) {
  const points = useMemo(() => {
    if (series.length === 0) return [];
    const max = Math.max(...series.map((p) => p.cost ?? 0), 1);
    const min = Math.min(...series.map((p) => p.cost ?? 0), 0);
    const range = max - min || 1;
    return series.map((point, index) => {
      const x = (index / Math.max(series.length - 1, 1)) * 100;
      const normalized = ((point.cost ?? 0) - min) / range;
      const y = 100 - normalized * 100;
      return { x, y, cost: point.cost ?? 0, date: point.date };
    });
  }, [series]);

  if (series.length === 0) {
    return <div className="text-sm text-text-secondary">No usage data available.</div>;
  }

  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const latest = series[series.length - 1];

  return (
    <div className="space-y-3">
      <div className="text-xs text-text-muted">
        Latest: {formatCurrency(latest.cost ?? 0, currency)} · {latest.date}
      </div>
      <svg viewBox="0 0 100 100" className="h-32 w-full overflow-visible">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-accent-sky"
          points={line}
        />
      </svg>
      <div className="flex justify-between text-xs text-text-muted">
        <span>{series[0]?.date}</span>
        <span>{latest.date}</span>
      </div>
    </div>
  );
}
