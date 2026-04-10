"use client";

import { useState, useMemo, useRef, useCallback } from "react";
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
import { cn } from "@/lib/utils";
import { ExternalLink, MoreHorizontal } from "lucide-react";
import { useChartData, type ChartRange, type OhlcvPoint } from "@/components/swap/chart/use-chart-data";
import { useMarketStream } from "@/hooks/use-market-stream";
import { ChartOhlcvTooltip } from "@/components/swap/chart/chart-ohlcv-tooltip";
import { useSwapStore } from "@/stores/use-swap-store";
import Image from "next/image";

// ─── Token pair logo (overlapping circles) ──────────────────────
function PairLogo({ sellSymbol, sellLogo, buySymbol, buyLogo, size = 20 }: {
  sellSymbol: string; sellLogo?: string;
  buySymbol: string; buyLogo?: string;
  size?: number;
}) {
  const renderIcon = (symbol: string, logo: string | undefined, z: string) => (
    <div className={cn("relative flex-shrink-0 overflow-hidden rounded-full border border-[#0F0F10]", z)} style={{ width: size, height: size }}>
      {logo ? (
        <Image src={logo} alt={symbol} width={size} height={size} className="object-cover" unoptimized />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#3B82F6]">
          <span style={{ fontSize: size * 0.4 }} className="font-bold text-white leading-none">{symbol.slice(0, 2)}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex -space-x-1.5 flex-shrink-0">
      {renderIcon(sellSymbol, sellLogo, "z-10")}
      {renderIcon(buySymbol, buyLogo, "z-0")}
    </div>
  );
}

// ─── Constants ─────────────────────────────────────────────────
const ACCENT = "#0ea5e9";
const VOLUME_BAR_DEFAULT = "#1f1f1f";
const GRID_COLOR = "rgba(255,255,255,0.04)";

const RANGE_OPTIONS: { key: ChartRange; label: string }[] = [
  { key: "1D", label: "1D" },
  { key: "7D", label: "7D" },
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
];

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${n.toFixed(2)}`;
}

// ─── Chart inner ────────────────────────────────────────────────
function OverviewChart({ data, hoverIdx, onHoverIdx }: {
  data: OhlcvPoint[];
  hoverIdx: number | null;
  onHoverIdx: (idx: number | null, pos?: { x: number; y: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const closePrices = data.map((d) => d.close);
  const minPrice = closePrices.length ? Math.min(...closePrices) : 0;
  const maxPrice = closePrices.length ? Math.max(...closePrices) : 0;
  const pricePadding = (maxPrice - minPrice) * 0.08 || 1;
  const priceDomain: [number, number] = [minPrice - pricePadding, maxPrice + pricePadding];
  const maxVol = data.length ? Math.max(...data.map((d) => d.volume)) : 1;

  const chartData = useMemo(
    () =>
      data.map((p) => ({
        ...p,
        volScaled: maxVol > 0 ? (p.volume / maxVol) * (pricePadding * 3) + minPrice - pricePadding : 0,
      })),
    [data, maxVol, pricePadding, minPrice]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !data.length) return;
      const rect = containerRef.current.getBoundingClientRect();
      const xRatio = (e.clientX - rect.left) / rect.width;
      const idx = Math.min(Math.max(Math.round(xRatio * (data.length - 1)), 0), data.length - 1);
      onHoverIdx(idx, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [data, onHoverIdx]
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onHoverIdx(null)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="marketOverviewGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.18} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid horizontal vertical={false} stroke={GRID_COLOR} strokeDasharray="0" />

          <XAxis
            dataKey="date"
            tick={{ fill: "#555", fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={80}
            dy={8}
          />
          <YAxis hide yAxisId="price" domain={priceDomain} />
          <YAxis hide yAxisId="volume" domain={[0, maxVol * 4]} />

          <Bar yAxisId="volume" dataKey="volume" barSize={6} radius={[1, 1, 0, 0]} isAnimationActive={false}>
            {chartData.map((_, index) => (
              <Cell key={`v-${index}`} fill={hoverIdx === index ? ACCENT : VOLUME_BAR_DEFAULT} />
            ))}
          </Bar>

          <Area
            yAxisId="price"
            type="monotone"
            dataKey="close"
            stroke={ACCENT}
            strokeWidth={1.5}
            fill="url(#marketOverviewGradient)"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />

          {hoverIdx != null && data[hoverIdx] && (
            <ReferenceLine x={data[hoverIdx].date} yAxisId="price" stroke={ACCENT} strokeWidth={1} strokeDasharray="0" />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Highlighted x-axis label */}
      {hoverIdx != null && data[hoverIdx] && (
        <div
          className="pointer-events-none absolute bottom-0 -translate-x-1/2 text-[11px] font-medium text-[#0ea5e9]"
          style={{ left: `${(hoverIdx / Math.max(data.length - 1, 1)) * 100}%` }}
        >
          {data[hoverIdx].date}
        </div>
      )}
    </div>
  );
}

// ─── Main panel ─────────────────────────────────────────────────
const RANGE_LABELS: Record<ChartRange, string> = {
  "1D": "vs 24h ago",
  "7D": "vs 7 days ago",
  "1M": "vs last month",
  "3M": "vs 3 months ago",
};

export function MarketOverviewPanel() {
  const sellToken = useSwapStore((s) => s.sellToken);
  const buyToken = useSwapStore((s) => s.buyToken);
  const [range, setRange] = useState<ChartRange>("1M");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const symbol = sellToken?.symbol || "ETH";
  const buySymbol = buyToken?.symbol || "USDC";
  const pairLabel = `${symbol}/${buySymbol}`;
  const { points, currentPrice, priceChangePct, isPositive, isLoading, error } = useChartData(symbol, range);

  // Reset hover state when the charted asset changes to avoid stale tooltip data
  const prevSymbolRef = useRef(symbol);
  if (prevSymbolRef.current !== symbol) {
    prevSymbolRef.current = symbol;
    if (hoverIdx !== null) setHoverIdx(null);
  }

  // Live price from SSE
  const { data: streamData } = useMarketStream([symbol.toLowerCase()]);
  const livePrice = streamData[symbol.toLowerCase()]?.price;

  // Merge live price into chart data
  const chartPoints = useMemo(() => {
    const merged = [...points];
    if (merged.length > 0 && livePrice) {
      const lastIdx = merged.length - 1;
      merged[lastIdx] = {
        ...merged[lastIdx],
        close: livePrice,
        high: Math.max(merged[lastIdx].high, livePrice),
        low: Math.min(merged[lastIdx].low, livePrice),
      };
    }
    return merged;
  }, [points, livePrice]);

  const displayPrice = livePrice ?? currentPrice;
  const hoveredPoint = hoverIdx != null ? chartPoints[hoverIdx] ?? null : null;

  const handleHover = useCallback((idx: number | null, pos?: { x: number; y: number }) => {
    setHoverIdx(idx);
    if (pos) setTooltipPos(pos);
  }, []);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#0F0F10]">
      {/* Header — stacks vertically on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between px-3 sm:px-5 pt-4 sm:pt-5 pb-1 gap-2 sm:gap-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <PairLogo
              sellSymbol={symbol}
              sellLogo={sellToken?.logoURI}
              buySymbol={buySymbol}
              buyLogo={buyToken?.logoURI}
              size={20}
            />
            <span className="text-[13px] font-medium text-white">{pairLabel}</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-[28px] sm:text-[36px] font-normal leading-tight text-white font-mono tracking-tight">
              {displayPrice ? formatUsd(displayPrice) : "—"}
            </span>
          </div>
          {priceChangePct !== 0 && (
            <span className={cn("text-[12px] font-medium", isPositive ? "text-[#0ea5e9]" : "text-[#ef4444]")}>
              {isPositive ? "+" : ""}
              {priceChangePct.toFixed(1)}% {isPositive ? "Up" : "Down"} {RANGE_LABELS[range]}
            </span>
          )}
        </div>

        {/* Range tabs + actions — scrollable row on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar sm:pt-1">
          <div className="flex items-center rounded-lg border border-white/[0.08] bg-[#141415] p-[2px] shrink-0">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRange(opt.key)}
                className={cn(
                  "rounded-md px-[10px] py-[4px] text-[11px] font-medium transition-colors",
                  range === opt.key ? "bg-[#252525] text-white" : "text-gray-500 hover:text-gray-300"
                )}
              >
                {opt.label}
              </button>
            ))}
            <button className="rounded-md px-[10px] py-[4px] text-[11px] font-medium text-gray-500 hover:text-gray-300 transition-colors hidden sm:block">
              Custom
            </button>
          </div>
          <button className="rounded-md border border-white/[0.08] bg-[#141415] p-[6px] text-gray-400 hover:text-white transition-colors shrink-0">
            <ExternalLink className="h-[14px] w-[14px]" />
          </button>
          <button className="rounded-md border border-white/[0.08] bg-[#141415] p-[6px] text-gray-400 hover:text-white transition-colors shrink-0">
            <MoreHorizontal className="h-[14px] w-[14px]" />
          </button>
        </div>
      </div>

      {/* Chart area */}
      <div className="relative flex-1 min-h-[240px] sm:min-h-[340px] px-1 sm:px-2 pb-2">
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-[#0ea5e9]" />
          </div>
        ) : error || !chartPoints.length ? (
          <div className="flex h-full w-full items-center justify-center">
            <p className="text-[13px] text-[#555]">{error || "No chart data available"}</p>
          </div>
        ) : (
          <>
            <OverviewChart data={chartPoints} hoverIdx={hoverIdx} onHoverIdx={handleHover} />
            <ChartOhlcvTooltip point={hoveredPoint} visible={hoverIdx != null} x={tooltipPos.x} y={tooltipPos.y} />
          </>
        )}
      </div>
    </div>
  );
}
