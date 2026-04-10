import { cache } from "react";

import { MarketOverviewClient, type AboveFoldPrefetch } from "./market-overview-page.client";

import {
  fetchMarketIndex,
  fetchMarketLeaderboard,
  fetchLatestNews,
  fetchMarketSentiment,
  fetchMarkets,
} from "@/modules/prices/market-overview/api";
import type {
  CachedResponse,
  Coinbase50Index,
  CoinMarketRow,
  MarketSentiment,
  MarketsResponse,
  NewsArticle,
} from "@/types/market";

const DEFAULT_VS_CURRENCY = "usd";

const getAboveFold = cache(
  async (currency: string, category?: string | null) => {
    const [heroMarkets, leaderboard, index, sentiment, news] = await Promise.all([
      fetchMarkets({
        vsCurrency: currency,
        order: "market_cap_desc",
        perPage: 8,
        page: 1,
        category: category ?? undefined,
        priceChangePercentage: "1h,24h,7d",
        sparkline: true,
        precision: currency === "usd" ? "2" : "full",
      }) as Promise<CachedResponse<MarketsResponse>>,
      fetchMarketLeaderboard() as Promise<CachedResponse<CoinMarketRow[]>>,
      fetchMarketIndex() as Promise<CachedResponse<Coinbase50Index>>,
      fetchMarketSentiment() as Promise<CachedResponse<MarketSentiment>>,
      fetchLatestNews() as Promise<CachedResponse<NewsArticle[]>>,
    ]);

    return { heroMarkets, leaderboard, index, sentiment, news };
  },
);

type MarketOverviewPageProps = {
  currency?: string;
  category?: string | null;
  prefetch?: AboveFoldPrefetch | null;
};

export async function MarketOverviewPage({ currency = DEFAULT_VS_CURRENCY, category = null, prefetch }: MarketOverviewPageProps) {
  const initialData = prefetch ?? (await getAboveFold(currency, category).catch(() => null));

  return (
    <MarketOverviewClient
      currency={currency}
      initialCategory={category}
      prefetch={initialData ?? undefined}
    />
  );
}

export default MarketOverviewPage;
