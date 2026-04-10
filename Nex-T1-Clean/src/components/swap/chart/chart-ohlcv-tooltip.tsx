"use client";

import type { OhlcvPoint } from "./use-chart-data";
import { cn } from "@/lib/utils";

interface ChartOhlcvTooltipProps {
  point: OhlcvPoint | null;
  visible: boolean;
  x: number;
  y: number;
}

function formatUsd(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatVol(n: number, symbol: string): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ${symbol}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K ${symbol}`;
  return `${n.toFixed(1)} ${symbol}`;
}

export function ChartOhlcvTooltip({ point, visible, x, y }: ChartOhlcvTooltipProps) {
  if (!visible || !point) return null;

  const rows: { label: string; value: string; accent?: boolean }[] = [
    { label: "Open:", value: formatUsd(point.open) },
    { label: "High:", value: formatUsd(point.high) },
    { label: "Low:", value: formatUsd(point.low) },
    { label: "Close:", value: formatUsd(point.close) },
    { label: "Volume:", value: formatVol(point.volume, "ETH"), accent: true },
  ];

  return (
    <div
      className="pointer-events-none absolute z-50 min-w-[200px] rounded-[10px] border border-white/10 bg-[#121212]/95 px-[14px] py-[12px] shadow-2xl backdrop-blur-md"
      style={{
        left: `${x + 16}px`,
        top: `${Math.max(y - 80, 8)}px`,
      }}
    >
      {/* Date row with green dot */}
      <div className="mb-[8px] flex items-center gap-[6px]">
        <span className="inline-block h-[8px] w-[8px] rounded-full bg-[#0ea5e9]" />
        <span className="text-[12px] font-medium leading-[16px] text-white">
          {point.date}
        </span>
      </div>

      {/* OHLCV rows */}
      <div className="flex flex-col gap-[4px]">
        {rows.map(({ label, value, accent }) => (
          <div key={label} className="flex items-center justify-between gap-[16px]">
            <span className="text-[11px] leading-[15px] text-[#888]">{label}</span>
            <span className={cn(
              "text-[11px] font-medium leading-[15px] tabular-nums font-mono",
              accent ? "text-[#0ea5e9]" : "text-white"
            )}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
