import type { CoinMarketChart, NftMarketChart } from "@/types/market";

export type ChartPoint = { timestamp: number; price: number };

export type SeriesStats = {
  latestPrice: number | null;
  deltaPercent: number | null;
  deltaAbsolute: number | null;
};

export function buildChartPoints(chart: CoinMarketChart | NftMarketChart | null, assetType: "token" | "nft"): ChartPoint[] {
  if (!chart) return [];

  const points = (chart.prices ?? []).map(([timestamp, price]) => ({ timestamp, price }));

  if (assetType === "nft") {
    return points.filter(point => Number.isFinite(point.price));
  }

  return points.filter(point => Number.isFinite(point.price));
}

export function computeSeriesStats(points: Array<{ price: number }>): SeriesStats {
  if (!points.length) {
    return { latestPrice: null, deltaPercent: null, deltaAbsolute: null } satisfies SeriesStats;
  }
  const latestPrice = points[points.length - 1]?.price ?? null;
  const firstPrice = points[0]?.price ?? null;
  const deltaAbsolute = latestPrice != null && firstPrice != null ? latestPrice - firstPrice : null;
  const deltaPercent =
    latestPrice != null && firstPrice != null && firstPrice !== 0
      ? ((latestPrice - firstPrice) / firstPrice) * 100
      : null;
  return { latestPrice, deltaPercent, deltaAbsolute } satisfies SeriesStats;
}

export function resolveNativeSymbol(chains: string[] | undefined): string | null {
  if (!chains?.length) {
    return null;
  }
  const map: Record<string, string> = {
    ethereum: "ETH",
    eth: "ETH",
    solana: "SOL",
    polygon: "MATIC",
    "binance-smart-chain": "BNB",
    bsc: "BNB",
    arbitrum: "ARB",
    optimism: "OP",
    base: "BASE",
    avalanche: "AVAX",
    avax: "AVAX",
    fantom: "FTM",
    linea: "LINEA",
  };
  for (const chain of chains) {
    const normalized = chain.trim().toLowerCase();
    if (!normalized) continue;
    if (map[normalized]) {
      return map[normalized];
    }
    if (normalized.length <= 5) {
      return normalized.toUpperCase();
    }
  }
  return chains[0]?.slice(0, 5).toUpperCase() ?? null;
}
