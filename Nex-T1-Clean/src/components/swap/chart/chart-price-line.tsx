"use client";

import React, { useCallback, useState, useRef } from "react";
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import type { OhlcvPoint } from "./use-chart-data";
import { ChartOhlcvTooltip } from "./chart-ohlcv-tooltip";

// ─── Constants ─────────────────────────────────────────────────
const ACCENT = "#0ea5e9";
const VOLUME_BAR = "#1f1f1f";
const VOLUME_BAR_HOVER = ACCENT;
const GRID_COLOR = "rgba(255,255,255,0.04)";

interface ChartPriceLineProps {
  data: OhlcvPoint[];
  isLoading: boolean;
  error: string | null;
  className?: string;
}

export function ChartPriceLine({ data, isLoading, error, className }: ChartPriceLineProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const hoveredPoint = hoverIdx != null ? data[hoverIdx] : null;

  // Compute domains
  const closePrices = data.map((d) => d.close);
  const minPrice = closePrices.length ? Math.min(...closePrices) : 0;
  const maxPrice = closePrices.length ? Math.max(...closePrices) : 0;
  const pricePadding = (maxPrice - minPrice) * 0.08 || 1;
  const priceDomain: [number, number] = [minPrice - pricePadding, maxPrice + pricePadding];

  const maxVol = data.length ? Math.max(...data.map((d) => d.volume)) : 1;

  // Custom mouse handler for crosshair + tooltip
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !data.length) return;
      const rect = containerRef.current.getBoundingClientRect();
      const xRatio = (e.clientX - rect.left) / rect.width;
      const idx = Math.min(Math.max(Math.round(xRatio * (data.length - 1)), 0), data.length - 1);
      setHoverIdx(idx);
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [data]
  );

  const handleMouseLeave = useCallback(() => setHoverIdx(null), []);

  // Add calculated volume-scaled field for the bar chart (20% of chart height)
  const chartData = data.map((p) => ({
    ...p,
    volScaled: maxVol > 0 ? (p.volume / maxVol) * (pricePadding * 3) + minPrice - pricePadding : 0,
    barFill: hoverIdx != null && data.indexOf(p) === hoverIdx ? VOLUME_BAR_HOVER : VOLUME_BAR,
  }));

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className ?? ""}`}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-[#0ea5e9]" />
      </div>
    );
  }

  if (error || !data.length) {
    return (
      <div className={`flex items-center justify-center ${className ?? ""}`}>
        <p className="text-[13px] text-[#555]">{error || "No chart data"}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative cursor-crosshair ${className ?? ""}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.15} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            horizontal
            vertical={false}
            stroke={GRID_COLOR}
            strokeDasharray="0"
          />

          <XAxis
            dataKey="date"
            tick={{ fill: "#555", fontSize: 11, fontFamily: "var(--font-geist-sans)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={80}
            dy={8}
          />

          <YAxis hide yAxisId="price" domain={priceDomain} />
          <YAxis hide yAxisId="volume" domain={[0, maxVol * 4]} />

          {/* Volume bars — anchored at the bottom (25% of height) */}
          <Bar
            yAxisId="volume"
            dataKey="volume"
            barSize={7}
            radius={[1, 1, 0, 0]}
            isAnimationActive={false}
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={hoverIdx === index ? ACCENT : VOLUME_BAR}
              />
            ))}
          </Bar>

          {/* Price area + line */}
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="close"
            stroke={ACCENT}
            strokeWidth={1.5}
            fill="url(#priceGradient)"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Crosshair vertical line */}
          {hoverIdx != null && data[hoverIdx] && (
            <ReferenceLine
              x={data[hoverIdx].date}
              yAxisId="price"
              stroke={ACCENT}
              strokeWidth={1}
              strokeDasharray="0"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* OHLCV Tooltip */}
      <ChartOhlcvTooltip
        point={hoveredPoint}
        visible={hoverIdx != null}
        x={tooltipPos.x}
        y={tooltipPos.y}
      />

      {/* Highlighted x-axis label at hover */}
      {hoveredPoint && hoverIdx != null && (
        <div
          className="pointer-events-none absolute bottom-0 -translate-x-1/2 text-[11px] font-medium text-[#0ea5e9]"
          style={{ left: `${(hoverIdx / Math.max(data.length - 1, 1)) * 100}%` }}
        >
          {hoveredPoint.date}
        </div>
      )}
    </div>
  );
}
