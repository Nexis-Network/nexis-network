"use client";

import { useState, useEffect } from "react";

// ─── Types ─────────────────────────────────────────────────────
export type OhlcvPoint = {
  time: number;         // Unix ms
  date: string;         // Formatted label
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ChartRange = "1D" | "7D" | "1M" | "3M";

export type ChartData = {
  points: OhlcvPoint[];
  currentPrice: number | null;
  priceChange: number;        // absolute $
  priceChangePct: number;     // percentage
  isPositive: boolean;
  isLoading: boolean;
  error: string | null;
};

// ─── Symbol → CoinGecko ID ────────────────────────────────────
export const SYMBOL_MAP: Record<string, string> = {
  ETH: "ethereum", WETH: "weth", BTC: "bitcoin", WBTC: "wrapped-bitcoin",
  SOL: "solana", USDC: "usd-coin", USDT: "tether", DAI: "dai",
  MATIC: "matic-network", POL: "matic-network", ARB: "arbitrum",
  OP: "optimism", LINK: "chainlink", UNI: "uniswap", AAVE: "aave",
  CRV: "curve-dao-token", MKR: "maker", LDO: "lido-dao",
  PEPE: "pepe", SHIB: "shiba-inu", DOGE: "dogecoin",
  AVAX: "avalanche-2", ATOM: "cosmos", DOT: "polkadot",
  NEAR: "near", APT: "aptos", SUI: "sui",
  BNB: "binancecoin", FTM: "fantom", ALGO: "algorand",
  XRP: "ripple", ADA: "cardano", TRX: "tron",
  // Liquid staking derivatives
  STETH: "staked-ether", WSTETH: "wrapped-staked-ether",
  RETH: "rocket-pool-eth", CBETH: "coinbase-wrapped-staked-eth",
  MSOL: "msol", JITOSOL: "jito-governance-token",
  SAVAX: "benqi-liquid-staked-avax",
};

export function symbolToCoinId(symbol: string): string | null {
  return SYMBOL_MAP[symbol?.toUpperCase()] ?? null;
}

// ─── Range config ──────────────────────────────────────────────
const RANGE_DAYS: Record<ChartRange, string> = {
  "1D": "1", "7D": "7", "1M": "30", "3M": "90",
};

// ─── Hook ──────────────────────────────────────────────────────
export function useChartData(symbol: string | undefined, range: ChartRange): ChartData {
  const [points, setPoints] = useState<OhlcvPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coinId = symbol ? symbolToCoinId(symbol) : null;
  const days = RANGE_DAYS[range];

  useEffect(() => {
    let isActive = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      if (!coinId) {
        if (!isActive) return;
        setPoints([]);
        setError(symbol ? `No data for ${symbol}` : null);
        setIsLoading(false);
        return;
      }

      if (isActive) {
        setIsLoading(true);
        setError(null);
      }

      try {
        // Fetch OHLC and market_chart (for volume) in parallel
        const [ohlcRes, mcRes] = await Promise.all([
          fetch(`/api/chart/ohlc?coin=${coinId}&days=${days}`, { signal: abortController.signal }),
          fetch(`/api/chart/price-history?coin=${coinId}&days=${days}&interval=${days === "1" ? "hourly" : "daily"}`, {
            signal: abortController.signal,
          }),
        ]);

        if (!ohlcRes.ok) throw new Error(`OHLC ${ohlcRes.status}`);

        const ohlcRaw: [number, number, number, number, number][] = await ohlcRes.json();
        let volumes: [number, number][] = [];
        if (mcRes.ok) {
          const mcJson = (await mcRes.json()) as { total_volumes?: [number, number][] };
          volumes = Array.isArray(mcJson.total_volumes) ? mcJson.total_volumes : [];
        }

        // Build a volume lookup (nearest timestamp match)
        const volMap = new Map<number, number>();
        for (const [ts, vol] of volumes) {
          // Round to nearest hour for matching
          const key = Math.round(ts / 3600000) * 3600000;
          volMap.set(key, vol);
        }

        const isShort = days === "1";
        const merged: OhlcvPoint[] = ohlcRaw.map(([ts, open, high, low, close]) => {
          const d = new Date(ts);
          const dateLabel = isShort
            ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
            : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

          // Find closest volume
          const roundedTs = Math.round(ts / 3600000) * 3600000;
          const vol = volMap.get(roundedTs) ?? 0;

          return { time: ts, date: dateLabel, open, high, low, close, volume: vol };
        });

        if (!isActive || abortController.signal.aborted) return;
        setPoints(merged);
      } catch (e) {
        if (!isActive || abortController.signal.aborted) return;
        console.error("[useChartData]", e);
        setError("Failed to load chart data");
      } finally {
        if (isActive && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [coinId, days, symbol]);

  // Derived values
  const currentPrice = points.length ? points[points.length - 1].close : null;
  const firstPrice = points.length ? points[0].open : null;
  const priceChange = currentPrice != null && firstPrice != null ? currentPrice - firstPrice : 0;
  const priceChangePct = firstPrice ? (priceChange / firstPrice) * 100 : 0;

  return {
    points,
    currentPrice,
    priceChange,
    priceChangePct,
    isPositive: priceChange >= 0,
    isLoading,
    error,
  };
}
