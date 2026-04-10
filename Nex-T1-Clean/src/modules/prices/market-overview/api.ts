import type {
  CachedResponse,
  CoinMarketCapSpotPair,
  CoinChartQueryParams,
  CoinDetails,
  CoinMarketChart,
  CoinOhlcQueryParams,
  CoinOHLCPoint,
  CoinCategorySummary,
  Coinbase50Index,
  CoinMarketRow,
  DefiTvlMovers,
  DexPairSummary,
  DefiLlamaEtfSnapshot,
  DefiLlamaPerpProtocol,
  DefiLlamaYieldPool,
  GlobalMarketOverview,
  MarketsQueryParams,
  MarketsResponse,
  MarketSentiment,
  NewsArticle,
  NftCollectionDetails,
  NftCollectionSummary,
  NftMarketChart,
  TopMoversQueryParams,
  TopMoversResponse,
  TrendingCollection,
  TrendingPoolSummary,
  VsCurrenciesResponse,
  MoralisMarketMovers,
  MoralisMarketToken,
  NewCoinMarket,
  NftMarketRow,
  ExchangeSummary,
  DerivativesExchangeSummary,
  SpotEtfFlows,
  CryptorankTokenUnlock,
  PumpfunNewTokensFeed,
} from "@/types/market";

const BASE_PATH = "/api/analytics/market-overview";

type QueryValue = string | number | boolean | undefined | null;

function buildFallbackResponse<T>(data: T, error: UntypedJson): CachedResponse<T> {
  const message = error instanceof Error ? error.message : String(error);
  if (process.env.NODE_ENV !== "production") {
    logger.warn("[market-overview] fallback response", message);
  }
  return {
    data,
    fetchedAt: new Date().toISOString(),
    cache: "miss",
    fallback: true,
    error: message,
  };
}

function buildSearchParams(params?: Record<string, QueryValue | QueryValue[]>): string {
  if (!params) {
    return "";
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) continue;
        searchParams.append(key, String(item));
      }
    } else {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

async function apiGet<T>(path: string, params?: Record<string, QueryValue | QueryValue[]>): Promise<T> {
  const query = buildSearchParams(params);
  const response = await fetch(`${BASE_PATH}${path}${query}`, {
    method: "GET",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage = typeof errorBody?.error === "string" ? errorBody.error : `Request failed with status ${response.status}`;
    const error = new Error(errorMessage);
    (error as { status?: number }).status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}

export type SantimentSentimentSeriesPoint = {
  datetime: string;
  value: number;
};

export type SantimentSentimentApiResponse = {
  data: {
    socialDominance: SantimentSentimentSeriesPoint[];
    sentimentWeightedCombined: SantimentSentimentSeriesPoint[];
  };
  fetchedAt: string;
  vendor: string;
};

export type SantimentWordCloudEntry = {
  word: string;
  score: number;
};

export type SantimentWordCloudApiResponse = {
  data: {
    wordsCloud: SantimentWordCloudEntry[];
  };
  fetchedAt: string;
  vendor: string;
  source?: string;
  window?: { from: string; to: string };
  fallback?: boolean;
  error?: string;
};

export function fetchGlobalOverview(): Promise<CachedResponse<GlobalMarketOverview>> {
  return apiGet<CachedResponse<GlobalMarketOverview>>("/global");
}

export function fetchTrendingCollection(): Promise<CachedResponse<TrendingCollection>> {
  return apiGet<CachedResponse<TrendingCollection>>("/trending");
}

export function fetchLatestListings(params?: { limit?: number }): Promise<CachedResponse<CoinMarketCapSpotPair[]>> {
  return apiGet<CachedResponse<CoinMarketCapSpotPair[]>>("/listings", {
    limit: params?.limit,
  });
}

export function fetchTopGainersLosers(params?: {
  limit?: number;
  chain?: string;
  timeFrame?: string;
}): Promise<CachedResponse<MoralisMarketMovers>> {
  return apiGet<CachedResponse<MoralisMarketMovers>>("/top-gainers-losers", {
    limit: params?.limit,
    chain: params?.chain,
    timeFrame: params?.timeFrame,
  });
}

export function fetchTrendingLatest(params?: { limit?: number; chain?: string }): Promise<CachedResponse<MoralisMarketToken[]>> {
  return apiGet<CachedResponse<MoralisMarketToken[]>>("/trending/latest", {
    limit: params?.limit,
    chain: params?.chain,
  });
}

export function fetchNewCoins(params?: { vsCurrency?: string; limit?: number }): Promise<CachedResponse<NewCoinMarket[]>> {
  return apiGet<CachedResponse<NewCoinMarket[]>>("/new-coins", {
    vs_currency: (params?.vsCurrency ?? "usd").toLowerCase(),
    limit: params?.limit,
  }).catch((error) => buildFallbackResponse<NewCoinMarket[]>([], error));
}

export function fetchExchanges(): Promise<CachedResponse<ExchangeSummary[]>> {
  return apiGet<CachedResponse<ExchangeSummary[]>>("/exchanges");
}

export function fetchDerivativesExchanges(): Promise<CachedResponse<DerivativesExchangeSummary[]>> {
  return apiGet<CachedResponse<DerivativesExchangeSummary[]>>("/derivatives-exchanges");
}

export function fetchNftMarkets(params?: { order?: string; perPage?: number; page?: number }): Promise<CachedResponse<NftMarketRow[]>> {
  return apiGet<CachedResponse<NftMarketRow[]>>("/nft-markets", {
    order: params?.order,
    per_page: params?.perPage,
    page: params?.page,
  }).catch((error) => buildFallbackResponse<NftMarketRow[]>([], error));
}

export function fetchTopMovers(params: TopMoversQueryParams): Promise<CachedResponse<TopMoversResponse>> {
  return apiGet<CachedResponse<TopMoversResponse>>("/top-movers", {
    vs_currency: params.vsCurrency,
    duration: params.duration,
    top_coins: params.topCoinCount,
  });
}

export function fetchMarkets(params: MarketsQueryParams & { search?: string }): Promise<CachedResponse<MarketsResponse>> {
  return apiGet<CachedResponse<MarketsResponse>>("/markets", {
    vs_currency: params.vsCurrency,
    order: params.order,
    per_page: params.perPage,
    page: params.page,
    category: params.category,
    price_change_percentage: params.priceChangePercentage,
    sparkline: params.sparkline,
    precision: params.precision,
    search: params.search,
  });
}

export function fetchCategories(): Promise<CachedResponse<CoinCategorySummary[]>> {
  return apiGet<CachedResponse<CoinCategorySummary[]>>("/categories");
}

export function fetchVsCurrencies(): Promise<CachedResponse<VsCurrenciesResponse>> {
  return apiGet<CachedResponse<VsCurrenciesResponse>>("/vs-currencies");
}

export function fetchCoinDetails(id: string): Promise<CachedResponse<CoinDetails>> {
  return apiGet<CachedResponse<CoinDetails>>(`/coins/${id}`);
}

export function fetchCoinMarketChart(
  id: string,
  params: CoinChartQueryParams,
): Promise<CachedResponse<CoinMarketChart>> {
  return apiGet<CachedResponse<CoinMarketChart>>(`/coins/${id}/chart`, {
    vs_currency: params.vsCurrency,
    days: params.days,
    interval: params.interval,
  });
}

export function fetchCoinOhlc(
  id: string,
  params: CoinOhlcQueryParams,
): Promise<CachedResponse<CoinOHLCPoint[]>> {
  return apiGet<CachedResponse<CoinOHLCPoint[]>>(`/coins/${id}/ohlc`, {
    vs_currency: params.vsCurrency,
    days: params.days,
  });
}

export function fetchTrendingNfts(): Promise<CachedResponse<NftCollectionSummary[]>> {
  return apiGet<CachedResponse<NftCollectionSummary[]>>("/nfts/trending");
}

export function fetchNftDetails(id: string): Promise<CachedResponse<NftCollectionDetails>> {
  return apiGet<CachedResponse<NftCollectionDetails>>(`/nfts/${id}`);
}

export function fetchNftMarketChart(
  id: string,
  params: { vsCurrency: string; days: number | string },
): Promise<CachedResponse<NftMarketChart>> {
  return apiGet<CachedResponse<NftMarketChart>>(`/nfts/${id}/chart`, {
    vs_currency: params.vsCurrency,
    days: params.days,
  });
}

export function fetchTrendingPools(network?: string): Promise<CachedResponse<TrendingPoolSummary[]>> {
  return apiGet<CachedResponse<TrendingPoolSummary[]>>("/onchain/trending-pools", {
    network,
  }).catch((error) => buildFallbackResponse<TrendingPoolSummary[]>([], error));
}

export function fetchNewPools(network?: string): Promise<CachedResponse<TrendingPoolSummary[]>> {
  return apiGet<CachedResponse<TrendingPoolSummary[]>>("/onchain/new-pools", {
    network,
  }).catch((error) => buildFallbackResponse<TrendingPoolSummary[]>([], error));
}

export function fetchDexNewPairs(params?: { network?: string; limit?: number }): Promise<CachedResponse<DexPairSummary[]>> {
  return apiGet<CachedResponse<DexPairSummary[]>>("/dextools/new-pairs", {
    network: params?.network,
    limit: params?.limit,
  }).catch((error) => buildFallbackResponse<DexPairSummary[]>([], error));
}

export function fetchPumpfunNewTokens(params?: { network?: string; limit?: number }): Promise<CachedResponse<PumpfunNewTokensFeed>> {
  const networkRaw = (params?.network ?? "mainnet").toLowerCase();
  const network = networkRaw === "devnet" ? "devnet" : "mainnet";
  const limit = params?.limit;
  return apiGet<CachedResponse<PumpfunNewTokensFeed>>("/pumpfun/new", {
    network,
    limit,
  }).catch((error) => buildFallbackResponse<PumpfunNewTokensFeed>({ network, cursor: null, items: [] }, error));
}

export type DexTrendingSource = "dextools" | "dexscreener";

export function fetchDexTrendingPairs(params?: {
  source?: DexTrendingSource;
  network?: string;
  chainId?: string;
  limit?: number;
  maxPairAgeMinutes?: number;
}): Promise<CachedResponse<DexPairSummary[]>> {
  return apiGet<CachedResponse<DexPairSummary[]>>("/dex/trending", {
    source: params?.source,
    network: params?.network,
    chain_id: params?.chainId,
    limit: params?.limit,
    max_pair_age_minutes: params?.maxPairAgeMinutes,
  }).catch((error) => buildFallbackResponse<DexPairSummary[]>([], error));
}

export function fetchDefiTvlMovers(params?: { limit?: number; minTvlUsd?: number }): Promise<CachedResponse<DefiTvlMovers>> {
  return apiGet<CachedResponse<DefiTvlMovers>>("/tvl-movers", {
    limit: params?.limit,
    min_tvl_usd: params?.minTvlUsd,
  });
}

export function fetchDefillamaYieldPools(params?: {
  limit?: number;
  minTvlUsd?: number;
  chain?: string;
  project?: string;
}): Promise<CachedResponse<DefiLlamaYieldPool[]>> {
  return apiGet<CachedResponse<DefiLlamaYieldPool[]>>("/yields", {
    limit: params?.limit,
    min_tvl_usd: params?.minTvlUsd,
    chain: params?.chain,
    project: params?.project,
  }).catch((error) => buildFallbackResponse<DefiLlamaYieldPool[]>([], error));
}

export function fetchDefillamaEtfSnapshot(): Promise<CachedResponse<DefiLlamaEtfSnapshot[]>> {
  return apiGet<CachedResponse<DefiLlamaEtfSnapshot[]>>("/etfs");
}

export function fetchSpotEtfFlows(): Promise<CachedResponse<SpotEtfFlows>> {
  return apiGet<CachedResponse<SpotEtfFlows>>("/etf-flows");
}

export function fetchTokenUnlocks(params?: { limit?: number; hideSmallUnlocks?: boolean }): Promise<CachedResponse<CryptorankTokenUnlock[]>> {
  return apiGet<CachedResponse<CryptorankTokenUnlock[]>>("/token-unlocks", {
    limit: params?.limit,
    hideSmallUnlocks: params?.hideSmallUnlocks,
  });
}

export function fetchDefillamaPerpsOverview(): Promise<CachedResponse<DefiLlamaPerpProtocol[]>> {
  return apiGet<CachedResponse<DefiLlamaPerpProtocol[]>>("/perps");
}

export function fetchLatestNews(): Promise<CachedResponse<NewsArticle[]>> {
  return apiGet<CachedResponse<NewsArticle[]>>("/news");
}

export function fetchMarketSentiment(): Promise<CachedResponse<MarketSentiment>> {
  return apiGet<CachedResponse<MarketSentiment>>("/sentiment");
}

export function fetchSantimentSentiment(params: {
  slug: string;
  from: string;
  to: string;
  interval?: string;
}): Promise<SantimentSentimentApiResponse> {
  return apiGet<SantimentSentimentApiResponse>("/sentiment", {
    source: "santiment",
    slug: params.slug,
    from: params.from,
    to: params.to,
    interval: params.interval,
  });
}

export function fetchSantimentWordCloud(params: {
  slug: string;
  from: string;
  to: string;
  socialSource?: string;
}): Promise<SantimentWordCloudApiResponse> {
  return apiGet<SantimentWordCloudApiResponse>("/sentiment", {
    source: "wordcloud",
    slug: params.slug,
    from: params.from,
    to: params.to,
    social_source: params.socialSource,
  });
}

export function fetchMarketLeaderboard(): Promise<CachedResponse<CoinMarketRow[]>> {
  return apiGet<CachedResponse<CoinMarketRow[]>>("/leaderboard");
}

export function fetchMarketIndex(): Promise<CachedResponse<Coinbase50Index>> {
  return apiGet<CachedResponse<Coinbase50Index>>("/indexes/coin50");
}

import type { OpenSeaCollectionResponse } from "@/types/market/opensea";
import type { MarketDataOverviewResponse } from "@/types/market";


import { logger } from '@/lib/logger';
export function fetchOpenSeaStats(slug: string): Promise<CachedResponse<OpenSeaCollectionResponse>> {
  return apiGet<CachedResponse<OpenSeaCollectionResponse>>(`/nft-collection/${slug}`);
}

export function fetchMarketDataOverview(assets: string[]): Promise<MarketDataOverviewResponse> {
  return apiGet<MarketDataOverviewResponse>("/overview", { assets: assets.join(",") });
}
