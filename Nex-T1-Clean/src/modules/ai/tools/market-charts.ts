import { createTool, createToolSchema, stringProp, numberProp, arrayProp } from "./create-tool";
import { getPrimaryIcon } from "@/lib/token-icons";
import { getCoinDetails, getCoinMarketChart, searchAssets } from "@/server/market/coingecko";
import { coingeckoWS } from "@/server/market/coingecko-ws";

import { logger } from '@/lib/logger';
type PriceChartInput = {
    symbol: string;
    currency: string;
    days: number;
};

const showPriceChartSchema = createToolSchema({
  symbol: stringProp("The token symbol (e.g., ETH, SOL)"),
  currency: stringProp("Currency to compare against", { default: "usd" }),
  days: numberProp("Number of days of history", { default: 30 }),
});

export const showPriceChartTool = createTool<PriceChartInput>({
  description: "Get live CoinGecko token market data and return a chart payload for chat rendering.",
  schema: showPriceChartSchema,
  execute: async ({ symbol, currency, days }) => {
    const fallbackSymbol = symbol.trim().toUpperCase();
    try {
      const targetCurrency = (currency?.trim().toLowerCase() || "usd");
      const targetSymbol = symbol.trim().toLowerCase();
      const requestedDays = Number.isFinite(days) ? Math.max(1, Math.min(365, Math.floor(days))) : 30;

      const search = await searchAssets(targetSymbol);
      const coins = search.data?.coins ?? [];
      const exactSymbol =
        coins.find((coin) => coin.symbol.toLowerCase() === targetSymbol) ?? null;
      const exactName =
        coins.find((coin) => coin.name.toLowerCase() === targetSymbol) ?? null;
      const bestByRank = [...coins].sort((a, b) => {
        const aRank = typeof a.marketCapRank === "number" ? a.marketCapRank : Number.POSITIVE_INFINITY;
        const bRank = typeof b.marketCapRank === "number" ? b.marketCapRank : Number.POSITIVE_INFINITY;
        return aRank - bRank;
      })[0] ?? null;

      const selected = exactSymbol ?? exactName ?? bestByRank;
      if (!selected?.id) {
        throw new Error(`Unable to resolve ${fallbackSymbol} on CoinGecko.`);
      }

      const [detailsResponse, chartResponse] = await Promise.all([
        getCoinDetails(selected.id),
        getCoinMarketChart(selected.id, {
          vsCurrency: targetCurrency,
          days: requestedDays,
          interval: requestedDays <= 2 ? "hourly" : undefined,
        }),
      ]);

      const details = detailsResponse.data;
      const chart = chartResponse.data;
      const wsSnapshot = coingeckoWS.getLatestPrices([selected.id])[selected.id];

      const latestChartPrice =
        chart.prices.length > 0 ? chart.prices[chart.prices.length - 1][1] : null;

      return {
        type: "coingecko-chart" as const,
        id: details.id || selected.id,
        name: details.name || selected.name,
        symbol: (details.symbol || selected.symbol).toUpperCase(),
        imageUrl: details.image?.large ?? details.image?.small ?? selected.thumb ?? null,
        currentPriceUsd:
          wsSnapshot?.price ??
          details.marketData.currentPriceUsd ??
          latestChartPrice ??
          null,
        marketCapUsd:
          wsSnapshot?.marketCapUsd ??
          details.marketData.marketCapUsd ??
          null,
        volume24hUsd:
          wsSnapshot?.volume24hUsd ??
          details.marketData.totalVolumeUsd ??
          null,
        priceChange24hPct:
          wsSnapshot?.change24hPct ??
          details.marketData.priceChangePercentage24h ??
          null,
        lastUpdated:
          details.marketData.lastUpdated ??
          null,
        source: "coingecko" as const,
        vsCurrency: targetCurrency,
        chart: {
          prices: chart.prices,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error("CoinGecko chart error:", error);
      return {
        type: "coingecko-chart" as const,
        id: fallbackSymbol.toLowerCase(),
        name: fallbackSymbol,
        symbol: fallbackSymbol,
        source: "coingecko" as const,
        vsCurrency: (currency?.trim().toLowerCase() || "usd"),
        chart: { prices: [] as [number, number][] },
        error: `Failed to fetch CoinGecko chart: ${message}`,
      };
    }
  }
});

type VolumeChartInput = {
    tokens: string[];
};

const showVolumeChartSchema = createToolSchema({
  tokens: arrayProp("List of token symbols to compare", stringProp("Token Symbol")),
});

/** Deterministic hash for generating consistent colors from token symbols. */
function symbolHash(symbol: string): number {
  return symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

const TOKEN_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
];

export const showVolumeChartTool = createTool<VolumeChartInput>({
  description: "Display a trading volume comparison chart for multiple tokens.",
  schema: showVolumeChartSchema,
  execute: async ({ tokens }) => {
     // Deterministic placeholder data (real volume integration pending)
     const data = [
      { name: 'Jan', value: 200 },
      { name: 'Feb', value: 210 },
      { name: 'Mar', value: 350 },
     ];

     const tokenInfos = tokens.map((t, index) => ({
         symbol: t.toUpperCase(),
         name: t.toUpperCase(),
         color: TOKEN_COLORS[(symbolHash(t) + index) % TOKEN_COLORS.length],
         logo: getPrimaryIcon({ symbol: t })
     }));

     return {
        type: "volume-chart",
        title: "Volume Comparison",
        data,
        tokens: tokenInfos
     };
  }
});
