"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

type ChartMode = "line" | "bar" | "volume";

type AssetTimeSeriesChartProps = {
  prices: Array<[number, number]>;
  totalVolumes: Array<[number, number]>;
  mode: ChartMode;
  className?: string;
};

function normalizeSeries(series: Array<[number, number]>): Array<[number, number]> {
  if (!Array.isArray(series)) return [];
  return series.filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));
}

function buildLinePath(points: Array<[number, number]>, width: number, height: number): string {
  if (points.length < 2) return "";
  const values = points.map(([, value]) => value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return points
    .map(([, value], index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function AssetTimeSeriesChart({ prices, totalVolumes, mode, className }: AssetTimeSeriesChartProps) {
  const width = 640;
  const height = 220;

  const priceSeries = useMemo(() => normalizeSeries(prices), [prices]);
  const volumeSeries = useMemo(() => normalizeSeries(totalVolumes), [totalVolumes]);
  const activeSeries = mode === "volume" ? volumeSeries : priceSeries;

  const linePath = useMemo(() => {
    if (mode !== "line") return "";
    return buildLinePath(activeSeries, width, height);
  }, [activeSeries, mode]);

  const bars = useMemo(() => {
    if (mode === "line" || activeSeries.length === 0) {
      return [] as Array<{ x: number; y: number; width: number; height: number }>;
    }

    const values = activeSeries.map(([, value]) => value);
    const min = mode === "volume" ? 0 : Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const barWidth = Math.max(2, Math.floor(width / Math.max(activeSeries.length, 1)) - 1);

    return activeSeries.map(([, value], index) => {
      const x = Math.floor((index / activeSeries.length) * width);
      const normalized = (value - min) / range;
      const barHeight = Math.max(2, normalized * height);
      return {
        x,
        y: height - barHeight,
        width: barWidth,
        height: barHeight,
      };
    });
  }, [activeSeries, mode]);

  const hasData = activeSeries.length > 1;

  return (
    <div className={cn("rounded-md border border-white/10 bg-black/20 p-2", className)}>
      {hasData ? (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[220px] w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={`M0 ${height - 1} L${width} ${height - 1}`} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

          {mode === "line" ? (
            <path
              d={linePath}
              stroke="#7dd3fc"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {mode !== "line"
            ? bars.map((bar, index) => (
                <rect
                  key={`${bar.x}-${index}`}
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  fill={mode === "volume" ? "#60a5fa" : "#7dd3fc"}
                  opacity={0.85}
                  rx={1}
                />
              ))
            : null}
        </svg>
      ) : (
        <div className="flex h-[220px] w-full items-center justify-center text-xs text-zinc-500">
          Chart data not available for this range.
        </div>
      )}
    </div>
  );
}
