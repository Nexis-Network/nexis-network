"use client";

import { useQueries, UseQueryResult } from "@tanstack/react-query";

export type PythPrice = { price: number | null; change24h: number | null };

const TICKER_BY_SYMBOL: Record<string, string> = {
  ETH: "ETH/USD",
  WETH: "ETH/USD",
  BTC: "BTC/USD",
  WBTC: "BTC/USD",
  SOL: "SOL/USD",
};

async function fetchLatest(ticker: string): Promise<number | null> {
  const res = await fetch(`/api/pyth/latest?ticker=${encodeURIComponent(ticker)}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const n = data?.price;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

async function fetchChange24h(ticker: string): Promise<number | null> {
  const params = new URLSearchParams({ ticker, rangeDays: "1", resolutionMinutes: "30" });
  const res = await fetch(`/api/pyth/history?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) return null;
  const bars = (await res.json().catch(() => [])) as Array<{ close: number }>;
  if (!Array.isArray(bars) || bars.length < 2) return null;
  const first = bars[0]?.close;
  const last = bars[bars.length - 1]?.close;
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
  return ((last - first) / first) * 100;
}

export function usePythPrices(symbols: string[]): UseQueryResult<PythPrice, UntypedJson>[] {
  const unique = Array.from(new Set(symbols.map((s) => s?.toUpperCase?.() || "").filter(Boolean)));
  return useQueries({
    queries: unique.map((sym) => {
      const ticker = TICKER_BY_SYMBOL[sym];
      return {
        queryKey: ["pyth", "price", ticker ?? sym],
        enabled: Boolean(ticker),
        queryFn: async () => {
          if (!ticker) return { price: null, change24h: null } as PythPrice;
          const [price, change24h] = await Promise.all([fetchLatest(ticker), fetchChange24h(ticker)]);
          return { price, change24h } as PythPrice;
        },
        staleTime: 15_000,
      };
    }),
  });
}

