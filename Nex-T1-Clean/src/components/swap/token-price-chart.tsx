"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSwapStore } from "@/stores/use-swap-store";
import { cn } from "@/lib/utils";

type PricePoint = { time: string; price: number };
type Range = "1D" | "7D" | "30D";

const RANGE_CONFIG: Record<Range, { days: string; label: string }> = {
  "1D": { days: "1",  label: "24H" },
  "7D": { days: "7",  label: "7D" },
  "30D": { days: "30", label: "30D" },
};

// Map common token symbols to CoinGecko IDs
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  ETH: "ethereum",
  WETH: "weth",
  BTC: "bitcoin",
  WBTC: "wrapped-bitcoin",
  SOL: "solana",
  WSOL: "wrapped-solana",
  USDC: "usd-coin",
  USDT: "tether",
  DAI: "dai",
  MATIC: "matic-network",
  POL: "matic-network",
  ARB: "arbitrum",
  OP: "optimism",
  LINK: "chainlink",
  UNI: "uniswap",
  AAVE: "aave",
  CRV: "curve-dao-token",
  MKR: "maker",
  COMP: "compound-governance-token",
  LDO: "lido-dao",
  PEPE: "pepe",
  SHIB: "shiba-inu",
};

function getCoingeckoId(symbol: string): string | null {
  if (!symbol) return null;
  return SYMBOL_TO_COINGECKO_ID[symbol.toUpperCase()] ?? null;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#181818]/90 px-3 py-2 text-xs backdrop-blur-md">
      <p className="text-[#999] mb-0.5">{label}</p>
      <p className="font-semibold text-white">
        ${payload[0].value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
      </p>
    </div>
  );
}

export function TokenPriceChart({ className }: { className?: string }) {
  const sellToken = useSwapStore((s) => s.sellToken);
  const buyToken = useSwapStore((s) => s.buyToken);
  const [range, setRange] = useState<Range>("7D");
  const [data, setData] = useState<PricePoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceDelta, setPriceDelta] = useState<{ pct: number; positive: boolean } | null>(null);

  // Prefer the sell token for the chart; fall back to buy token
  const chartToken = sellToken || buyToken;
  const chartSymbol = chartToken?.symbol ?? "";
  const coingeckoId = getCoingeckoId(chartSymbol);

  const fetchChartData = useCallback(async () => {
    if (!coingeckoId) {
      setData([]);
      setError(`No chart data for ${chartSymbol || "—"}`);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { days } = RANGE_CONFIG[range];
      const interval = days === "1" ? "hourly" : "daily";
      // Use server-side proxy to avoid CORS and rate-limit issues
      const url = `/api/chart/price-history?coin=${encodeURIComponent(coingeckoId)}&days=${days}&interval=${interval}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const prices: [number, number][] = json.prices ?? [];

      const formatted: PricePoint[] = prices.map(([ts, price]) => {
        const d = new Date(ts);
        const label =
          days === "1"
            ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
            : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return { time: label, price };
      });
      setData(formatted);

      if (formatted.length >= 2) {
        const first = formatted[0].price;
        const last = formatted[formatted.length - 1].price;
        const pct = ((last - first) / first) * 100;
        setPriceDelta({ pct: Math.abs(pct), positive: pct >= 0 });
      }
    } catch (e) {
      setError("Failed to load chart data");
      console.error("[TokenPriceChart]", e);
    } finally {
      setIsLoading(false);
    }
  }, [coingeckoId, range, chartSymbol]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  const currentPrice = data.length ? data[data.length - 1].price : null;
  const minPrice = data.length ? Math.min(...data.map((d) => d.price)) : 0;
  const maxPrice = data.length ? Math.max(...data.map((d) => d.price)) : 0;
  const yDomain = data.length
    ? [minPrice * 0.998, maxPrice * 1.002]
    : ["auto", "auto"];

  const isPositive = priceDelta?.positive ?? true;
  const chartColor = isPositive ? "#22c55e" : "#ef4444";

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border border-white/[0.06] bg-[#0f0f10]/80 p-5 backdrop-blur-xl",
        className
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-white">
              {chartSymbol || "—"} / USD
            </span>
            {priceDelta && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  isPositive ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                )}
              >
                {isPositive ? "+" : "-"}{priceDelta.pct.toFixed(2)}%
              </span>
            )}
          </div>
          {currentPrice != null && (
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-white">
              ${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </p>
          )}
          {!chartToken && (
            <p className="text-sm text-white/40">Select a token to view price</p>
          )}
        </div>

        {/* Range selector */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          {(Object.keys(RANGE_CONFIG) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                range === r
                  ? "bg-white/15 text-white"
                  : "text-white/40 hover:text-white/70"
              )}
            >
              {RANGE_CONFIG[r].label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 min-h-0">
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
          </div>
        )}

        {!isLoading && error && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-white/30">{error}</p>
          </div>
        )}

        {!isLoading && !error && data.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={{ fill: "#555", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                domain={yDomain as [number, number]}
                tick={{ fill: "#555", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={60}
                tickFormatter={(v: number) =>
                  `$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(2)}`
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke={chartColor}
                strokeWidth={1.5}
                fill="url(#chartGradient)"
                dot={false}
                activeDot={{ r: 3, fill: chartColor, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer — pair info */}
      {buyToken && sellToken && (
        <p className="mt-3 text-[11px] text-white/25">
          {sellToken.symbol} → {buyToken.symbol} &middot; Chain {sellToken.chainId}
        </p>
      )}
    </div>
  );
}
