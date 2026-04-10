"use client";

import { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useSwapStore } from "@/stores/use-swap-store";
import { useAggregatedPortfolio } from "@/lib/hooks/use-aggregated-portfolio";
import { symbolToCoinId } from "@/components/swap/chart/use-chart-data";
import { classifyPortfolioAssets, downsampleArray } from "@/modules/wallets/profile/asset-classification";
import { unwrapApiPayload } from "@/lib/api-platform";

// ─── Types ─────────────────────────────────────────────────────

interface AssetHolding {
  name: string;
  note: string;
  color: string;
  percentage: number;
  sparklineData: number[];
}

// ─── Sparkline mini chart ──────────────────────────────────────

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ x: i, value: v }));
  return (
    <div className="h-[60px] w-full">
      {chartData.length > 1 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#spark-${color.replace("#", "")})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-3 w-3/4 animate-pulse rounded bg-white/5" />
        </div>
      )}
    </div>
  );
}

// ─── Sparkline data hook ────────────────────────────────────────

function useSparklineHistory(coinIds: string[]) {
  const [data, setData] = useState<Record<string, number[]>>({});

  const idsKey = useMemo(() => coinIds.filter(Boolean).join(","), [coinIds]);

  useEffect(() => {
    if (!idsKey) {
      setData({});
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/assets/history?ids=${encodeURIComponent(idsKey)}&days=7`,
        );
        if (!res.ok) return;
        const json = await res.json();
        const parsed = unwrapApiPayload<Record<string, number[]>>(json) ?? {};
        if (!cancelled) setData(parsed);
      } catch {
        // Silently ignore — sparklines are non-critical
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return data;
}

// ─── Main panel ─────────────────────────────────────────────────

export function AssetPerformancePanel() {
  const sellToken = useSwapStore((s) => s.sellToken);
  const buyToken = useSwapStore((s) => s.buyToken);
  const { portfolio } = useAggregatedPortfolio();

  const assets = useMemo(() => portfolio?.assets ?? [], [portfolio?.assets]);

  // Classify portfolio for distribution bar
  const classification = useMemo(() => classifyPortfolioAssets(assets), [assets]);

  const categories = useMemo(
    () => [
      { label: "Spot Assets", color: "#0ea5e9", widthPercent: classification.spotPct },
      { label: "Staked Assets", color: "#3B82F6", widthPercent: classification.stakingPct },
      { label: "DeFi Earnings", color: "#6B7280", widthPercent: classification.defiPct },
    ],
    [classification],
  );

  // Map swap pair tokens to CoinGecko IDs
  const sellCoinId = sellToken?.symbol ? symbolToCoinId(sellToken.symbol) : null;
  const buyCoinId = buyToken?.symbol ? symbolToCoinId(buyToken.symbol) : null;

  // Fetch 7-day sparklines for both tokens
  const coinIdsForSparkline = useMemo(
    () => [sellCoinId, buyCoinId].filter((id): id is string => !!id),
    [sellCoinId, buyCoinId],
  );
  const sparklineData = useSparklineHistory(coinIdsForSparkline);

  // Build holdings array from real portfolio data
  const holdings: AssetHolding[] = useMemo(() => {
    const totalPortfolioValue = assets.reduce((s, a) => s + (a.valueUsd ?? 0), 0);
    const result: AssetHolding[] = [];

    // Sell token holding
    const sellSymbol = sellToken?.symbol?.toUpperCase();
    const sellSym = sellToken?.symbol ?? "";
    if (sellSymbol && sellSym) {
      const matching = assets.filter(
        (a) => (a.symbol ?? "").toUpperCase() === sellSymbol,
      );
      const totalValue = matching.reduce((s, a) => s + (a.valueUsd ?? 0), 0);
      const pct = totalPortfolioValue > 0 ? (totalValue / totalPortfolioValue) * 100 : 0;

      // Format balance note
      const totalBalance = matching.reduce((s, a) => {
        const formatted = parseFloat(a.balanceFormatted ?? "0");
        return s + (Number.isFinite(formatted) ? formatted : 0);
      }, 0);

      const sparkline = sellCoinId && sparklineData[sellCoinId]
        ? downsampleArray(sparklineData[sellCoinId], 20)
        : [];

      result.push({
        name: `${sellSym} Holdings`,
        note: totalBalance > 0
          ? `${totalBalance.toFixed(4)} ${sellSym}`
          : "Not in wallet",
        color: "#F97316",
        percentage: Math.round(pct * 10) / 10,
        sparklineData: sparkline,
      });
    }

    // Buy token holding (only if different from sell)
    const buySymbol = buyToken?.symbol?.toUpperCase();
    const buySym = buyToken?.symbol ?? "";
    if (buySymbol && buySym && buySymbol !== sellSymbol) {
      const matching = assets.filter(
        (a) => (a.symbol ?? "").toUpperCase() === buySymbol,
      );
      const totalValue = matching.reduce((s, a) => s + (a.valueUsd ?? 0), 0);
      const pct = totalPortfolioValue > 0 ? (totalValue / totalPortfolioValue) * 100 : 0;

      const totalBalance = matching.reduce((s, a) => {
        const formatted = parseFloat(a.balanceFormatted ?? "0");
        return s + (Number.isFinite(formatted) ? formatted : 0);
      }, 0);

      const sparkline = buyCoinId && sparklineData[buyCoinId]
        ? downsampleArray(sparklineData[buyCoinId], 20)
        : [];

      result.push({
        name: `${buySym} Holdings`,
        note: totalBalance > 0
          ? `${totalBalance.toFixed(4)} ${buySym}`
          : "Not in wallet",
        color: "#0ea5e9",
        percentage: Math.round(pct * 10) / 10,
        sparklineData: sparkline,
      });
    }

    // Fallback if no tokens selected
    if (result.length === 0) {
      result.push(
        { name: "ETH Holdings", note: "Select tokens to view", color: "#F97316", percentage: 0, sparklineData: [] },
        { name: "USDC Holdings", note: "Select tokens to view", color: "#0ea5e9", percentage: 0, sparklineData: [] },
      );
    }

    return result;
  }, [assets, sellToken, buyToken, sellCoinId, buyCoinId, sparklineData]);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#0F0F10]">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <h3 className="text-[20px] font-bold text-white leading-tight">
          Asset Performance
          <br />
          Overview
        </h3>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">Total Value</span>
          <span className="text-[10px] text-gray-500">Distribution</span>
        </div>
      </div>

      {/* Distribution bar */}
      <div className="px-5 pb-2">
        <div className="flex h-[6px] w-full overflow-hidden rounded-full">
          {categories.map((cat) => (
            <div
              key={cat.label}
              className="h-full transition-all"
              style={{
                width: `${Math.max(cat.widthPercent, 1)}%`,
                backgroundColor: cat.color,
                opacity: cat.widthPercent > 0 ? 1 : 0.15,
              }}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center gap-5">
          {categories.map((cat) => (
            <div key={cat.label} className="flex items-center gap-[6px]">
              <div className="h-[8px] w-[8px] rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="text-[10px] text-gray-400">{cat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Holdings */}
      <div className="flex flex-1 gap-5 px-5 pb-5 pt-3">
        {holdings.map((holding) => (
          <div key={holding.name} className="flex flex-1 flex-col gap-2">
            <div className="flex items-center gap-[6px]">
              <div className="h-[8px] w-[8px] rounded-full" style={{ backgroundColor: holding.color }} />
              <span className="text-[12px] font-medium text-white">{holding.name}</span>
            </div>
            <span className="text-[10px] text-gray-500 leading-tight">{holding.note}</span>

            <MiniSparkline
              data={holding.sparklineData}
              color={holding.color}
            />

            <span className="text-[28px] font-bold text-white leading-tight">{holding.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
