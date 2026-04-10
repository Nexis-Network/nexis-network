"use client";

import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAggregatedPortfolio } from "@/lib/hooks/use-aggregated-portfolio";
import { classifyPortfolioAssets, downsampleArray } from "@/modules/wallets/profile/asset-classification";
import { symbolToCoinId } from "@/components/swap/chart/use-chart-data";
import { unwrapApiPayload } from "@/lib/api-platform";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// ─── Types ─────────────────────────────────────────────────────

type TimeRange = "7D" | "30D" | "ALL";

interface PortfolioBreakdown {
  label: string;
  percent: number;
  value: number;
  color: string;
}

const RANGE_DAYS: Record<TimeRange, number> = {
  "7D": 7,
  "30D": 30,
  "ALL": 365,
};

// ─── Portfolio history from real price data ─────────────────────

function usePortfolioHistory(
  assets: { symbol: string | null; valueUsd: number | null }[],
  range: TimeRange,
) {
  const [historyData, setHistoryData] = useState<{ label: string; value: number }[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const days = RANGE_DAYS[range];

  // Top assets with known CoinGecko IDs
  const topAssets = useMemo(() => {
    return assets
      .filter((a) => (a.valueUsd ?? 0) > 0 && a.symbol && symbolToCoinId(a.symbol))
      .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0))
      .slice(0, 8);
  }, [assets]);

  const coinIds = useMemo(
    () => topAssets.map((a) => symbolToCoinId(a.symbol!)!).join(","),
    [topAssets],
  );

  useEffect(() => {
    if (!coinIds || !topAssets.length) {
      setHistoryData([]);
      return;
    }

    let cancelled = false;
    setIsHistoryLoading(true);

    (async () => {
      try {
        const res = await fetch(
          `/api/assets/history?ids=${encodeURIComponent(coinIds)}&days=${days}`,
        );
        if (!res.ok) throw new Error(`History ${res.status}`);
        const json = await res.json();
        const data = unwrapApiPayload<Record<string, number[]>>(json) ?? {};

        if (cancelled) return;

        // Build weighted portfolio value series
        const series = topAssets.map((a) => data[symbolToCoinId(a.symbol!)!] ?? []);
        const maxLen = Math.max(...series.map((s) => s.length), 0);

        if (maxLen === 0) {
          setHistoryData([]);
          return;
        }

        const points: { label: string; value: number }[] = [];
        const isShort = days <= 7;

        for (let i = 0; i < maxLen; i++) {
          let weightedValue = 0;
          for (let j = 0; j < series.length; j++) {
            const priceAtI = series[j][i] ?? series[j][series[j].length - 1] ?? 0;
            const currentPrice = series[j][series[j].length - 1] ?? 1;
            // How many units the user holds = valueUsd / currentPrice
            const holdingUnits = currentPrice > 0 ? (topAssets[j].valueUsd ?? 0) / currentPrice : 0;
            weightedValue += priceAtI * holdingUnits;
          }

          const dayOffset = maxLen > 1 ? Math.floor((i / (maxLen - 1)) * days) : 0;
          const date = new Date(Date.now() - (days - dayOffset) * 86400000);
          const label = isShort
            ? date.toLocaleDateString("en-US", { weekday: "short" })
            : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

          points.push({ label, value: weightedValue });
        }

        // Downsample if too many points for the tiny chart
        const downsampled = points.length > 30
          ? downsampleArray(points.map((p) => p.value), 30).map((v, i) => ({
              label: points[Math.floor((i / 30) * points.length)]?.label ?? "",
              value: v,
            }))
          : points;

        setHistoryData(downsampled);
      } catch {
        // Silently fall back to empty
        if (!cancelled) setHistoryData([]);
      } finally {
        if (!cancelled) setIsHistoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [coinIds, days, topAssets]);

  return { historyData, isHistoryLoading };
}

// ─── Breakdown bars ─────────────────────────────────────────────

function BreakdownBar({ items }: { items: PortfolioBreakdown[] }) {
  return (
    <div className="flex flex-col gap-3 px-1">
      {/* Bar chart representation */}
      <div className="flex w-full gap-0 overflow-hidden rounded-sm">
        {items.map((item) => (
          <div
            key={item.label}
            className="h-[60px] transition-all"
            style={{
              width: `${Math.max(item.percent, 1)}%`,
              backgroundColor: item.color,
              opacity: item.percent > 0 ? 0.8 : 0.15,
            }}
          />
        ))}
      </div>

      {/* Labels row */}
      <div className="flex items-start gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col gap-[2px]">
            <span className="text-[16px] font-bold text-white">{item.percent}%</span>
            <span className="text-[10px] text-gray-400">{item.label}</span>
            <span className="text-[11px] font-mono text-white">
              ${item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}K` : item.value.toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main panel ─────────────────────────────────────────────────

export function PortfolioValuePanel() {
  const [range, setRange] = useState<TimeRange>("30D");
  const { portfolio, isLoading } = useAggregatedPortfolio();

  const netWorth = portfolio?.totalNetWorthUsd ?? 0;
  const assets = useMemo(() => portfolio?.assets ?? [], [portfolio?.assets]);

  // Real asset classification (Spot / Staking / DeFi)
  const breakdown: PortfolioBreakdown[] = useMemo(() => {
    const { spotValue, stakingValue, defiValue, spotPct, stakingPct, defiPct } =
      classifyPortfolioAssets(assets);

    return [
      { label: "Spot Holdings", percent: spotPct, value: spotValue, color: "#0ea5e9" },
      { label: "Staking Rewards", percent: stakingPct, value: stakingValue, color: "#3B82F6" },
      { label: "DeFi Earnings", percent: defiPct, value: defiValue, color: "#F97316" },
    ];
  }, [assets]);

  // Real portfolio history from price data
  const { historyData, isHistoryLoading } = usePortfolioHistory(assets, range);

  const displayValue = netWorth.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const chartLoading = isLoading || isHistoryLoading;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#0F0F10]">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1">
            <span className="text-[24px] font-bold text-white font-mono tracking-tight leading-tight">
              ${displayValue.split(".")[0]}
            </span>
            <span className="text-[14px] font-mono text-gray-400">.{displayValue.split(".")[1] || "00"}</span>
          </div>
          <span className="text-[10px] text-gray-400">Total Portfolio Value</span>
        </div>

        {/* Range tabs */}
        <div className="flex items-center rounded-lg border border-white/[0.08] bg-[#141415] p-[2px]">
          {(["7D", "30D", "ALL"] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md px-[8px] py-[3px] text-[10px] font-medium transition-colors",
                range === r ? "bg-[#252525] text-white" : "text-gray-500 hover:text-gray-300"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Breakdown */}
      <div className="px-4 py-2">
        <BreakdownBar items={breakdown} />
      </div>

      {/* Portfolio chart */}
      <div className="h-[140px] w-full px-2 pb-3">
        {chartLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-[#0ea5e9]" />
          </div>
        ) : historyData.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center">
            <p className="text-[11px] text-gray-500">
              {netWorth > 0 ? "Loading history..." : "Connect wallet to see history"}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid horizontal vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#555", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
                tickLine={false}
                axisLine={false}
                dy={4}
              />
              <YAxis hide domain={["auto", "auto"]} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#0ea5e9"
                strokeWidth={1.5}
                fill="url(#portfolioGrad)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
