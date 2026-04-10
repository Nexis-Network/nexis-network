"use client";

import { useQuery, keepPreviousData, type UseQueryResult } from "@tanstack/react-query";

import {
  fetchCategories,
  fetchCoinDetails,
  fetchCoinMarketChart,
  fetchCoinOhlc,
  fetchMarketIndex,
  fetchMarketLeaderboard,
  fetchDefiTvlMovers,
  fetchDefillamaPerpsOverview,
  fetchDefillamaYieldPools,
  fetchSpotEtfFlows,
  fetchTokenUnlocks,
  fetchDexNewPairs,
  fetchDexTrendingPairs,
  fetchGlobalOverview,
  fetchLatestListings,
  fetchLatestNews,
  fetchMarketSentiment,
  fetchMarkets,
  fetchNftDetails,
  fetchNftMarketChart,
  fetchSantimentSentiment,
  fetchSantimentWordCloud,
  fetchTopGainersLosers,
  fetchTopMovers,
  fetchTrendingCollection,
  fetchTrendingLatest,
  fetchTrendingNfts,
  fetchTrendingPools,
  fetchNewPools,
  fetchNewCoins,
  fetchExchanges,
  fetchDerivativesExchanges,
  fetchNftMarkets,
  fetchVsCurrencies,
  fetchPumpfunNewTokens,
} from "@/modules/prices/market-overview/api";
import type {
  SantimentSentimentApiResponse,
  SantimentWordCloudApiResponse,
} from "@/modules/prices/market-overview/api";
import { marketOverviewKeys } from "@/modules/prices/market-overview/query-keys";
import type {
  CachedResponse,
  CoinMarketCapSpotPair,
  MoralisMarketMovers,
  MoralisMarketToken,
  PumpfunNewTokensFeed,
  CoinCategorySummary,
  CoinChartQueryParams,
  CoinDetails,
  CoinMarketChart,
  CoinOhlcQueryParams,


  CoinOHLCPoint,
  Coinbase50Index,

  CoinMarketRow,
  DefiLlamaPerpProtocol,
  DefiLlamaYieldPool,
  DefiTvlMovers,
  DexPairSummary,
  GlobalMarketOverview,
  ExchangeSummary,
  DerivativesExchangeSummary,
  SpotEtfFlows,
  CryptorankTokenUnlock,
  NewCoinMarket,
  NftMarketRow,
  MarketSentiment,
  MarketsQueryParams,
  MarketsResponse,
  NewsArticle,
  NftCollectionDetails,
  NftCollectionSummary,
  NftMarketChart,
  TopMoversQueryParams,
  TopMoversResponse,
  TrendingCollection,
  TrendingPoolSummary,
  VsCurrenciesResponse,
} from "@/types/market";

const MINUTE = 60_000;

export function useGlobalMarketOverview() {
  return useQuery<CachedResponse<GlobalMarketOverview>>({
    queryKey: marketOverviewKeys.global(),
    queryFn: fetchGlobalOverview,
    staleTime: 60 * 1000,
    gcTime: 5 * MINUTE,
  });
}

export function useTrendingCollection() {
  return useQuery<CachedResponse<TrendingCollection>>({
    queryKey: marketOverviewKeys.trending(),
    queryFn: fetchTrendingCollection,
    staleTime: 5 * MINUTE,
    gcTime: 10 * MINUTE,
  });
}

export function useNewListings(params?: { limit?: number }) {
  const limit = params?.limit ?? 10;

  return useQuery<CachedResponse<CoinMarketCapSpotPair[]>>({
    queryKey: marketOverviewKeys.listings(limit),
    queryFn: () => fetchLatestListings({ limit }),
    staleTime: 90 * 1000,
    gcTime: 10 * MINUTE,
  });
}

export function useTopMovers(params: TopMoversQueryParams & { enabled?: boolean }) {
  const { enabled = true, ...queryParams } = params;
  return useQuery<CachedResponse<TopMoversResponse>>({
    queryKey: marketOverviewKeys.topMovers(queryParams.vsCurrency, queryParams.duration ?? "24h"),
    queryFn: () => fetchTopMovers(queryParams),
    staleTime: 5 * MINUTE,
    gcTime: 10 * MINUTE,
    enabled,
  });
}

export function useTopGainersLosers(
  limit = 10,
  options?: { chain?: string; timeFrame?: "1h" | "24h" | "7d" | "30d"; enabled?: boolean },
) {
  const chain = (options?.chain ?? "0x1").toLowerCase();
  const timeFrame = options?.timeFrame ?? "24h";
  const enabled = options?.enabled ?? true;

  return useQuery<CachedResponse<MoralisMarketMovers>>({
    queryKey: marketOverviewKeys.topGainersLosers(chain, timeFrame, limit),
    queryFn: () => fetchTopGainersLosers({ limit, chain, timeFrame }),
    staleTime: 60 * 1000,
    gcTime: 5 * MINUTE,
    enabled,
  });
}

type UseMarketsOptions = MarketsQueryParams & {
  search?: string;
  initialData?: CachedResponse<MarketsResponse>;
};

export function useMarkets(params: UseMarketsOptions): UseQueryResult<CachedResponse<MarketsResponse>> {
  const query = useQuery<CachedResponse<MarketsResponse>>({
    queryKey: marketOverviewKeys.markets(params),
    queryFn: () => fetchMarkets(params),
    placeholderData: keepPreviousData,
    staleTime: 45 * 1000,
    gcTime: 5 * MINUTE,
    initialData: params.initialData,
    refetchOnWindowFocus: false,
  });

  return query;
}

export function useCoinCategories() {
  return useQuery<CachedResponse<CoinCategorySummary[]>>({
    queryKey: marketOverviewKeys.categories(),
    queryFn: fetchCategories,
    staleTime: 5 * MINUTE,
    gcTime: 15 * MINUTE,
    meta: { persist: true },
  });
}

export function useSupportedVsCurrencies() {
  return useQuery<CachedResponse<VsCurrenciesResponse>>({
    queryKey: marketOverviewKeys.vsCurrencies(),
    queryFn: fetchVsCurrencies,
    staleTime: 30 * MINUTE,
    gcTime: 60 * MINUTE,
    meta: { persist: true },
  });
}

export function useCoinDetails(id: string, enabled: boolean) {
  return useQuery<CachedResponse<CoinDetails>>({
    queryKey: marketOverviewKeys.coinDetails(id),
    queryFn: () => fetchCoinDetails(id),
    enabled: Boolean(id) && enabled,
    staleTime: 60 * 1000,
    gcTime: 10 * MINUTE,
  });
}

export function useCoinMarketChart(id: string, params: CoinChartQueryParams, enabled: boolean) {
  return useQuery<CachedResponse<CoinMarketChart>>({
    queryKey: marketOverviewKeys.coinChart(id, params.vsCurrency, params.days, params.interval),
    queryFn: () => fetchCoinMarketChart(id, params),
    enabled: Boolean(id) && enabled,
    staleTime: 60 * 1000,
    gcTime: 10 * MINUTE,
  });
}

export function useCoinOhlc(id: string, params: CoinOhlcQueryParams, enabled: boolean) {
  return useQuery<CachedResponse<CoinOHLCPoint[]>>({
    queryKey: marketOverviewKeys.coinOhlc(id, params.vsCurrency, params.days),
    queryFn: () => fetchCoinOhlc(id, params),
    enabled: Boolean(id) && enabled,
    staleTime: 60 * 1000,
    gcTime: 10 * MINUTE,
  });
}

export function useTrendingNfts() {
  return useQuery<CachedResponse<NftCollectionSummary[]>>({
    queryKey: marketOverviewKeys.nftsTrending(),
    queryFn: fetchTrendingNfts,
    staleTime: 5 * MINUTE,
    gcTime: 10 * MINUTE,
  });
}

export function useNewCoins(params?: { vsCurrency?: string; limit?: number }) {
  const vsCurrency = (params?.vsCurrency ?? "usd").toLowerCase();
  const limit = params?.limit;
  return useQuery<CachedResponse<NewCoinMarket[]>>({
    queryKey: marketOverviewKeys.newCoins(vsCurrency, limit),
    queryFn: () => fetchNewCoins({ vsCurrency, limit }),
    staleTime: 5 * MINUTE,
    gcTime: 15 * MINUTE,
  });
}

export function useExchanges(options?: { enabled?: boolean }) {
  return useQuery<CachedResponse<ExchangeSummary[]>>({
    queryKey: marketOverviewKeys.exchanges(),
    queryFn: fetchExchanges,
    staleTime: 10 * MINUTE,
    gcTime: 20 * MINUTE,
    enabled: options?.enabled ?? true,
  });
}

export function useDerivativesExchanges(options?: { enabled?: boolean }) {
  return useQuery<CachedResponse<DerivativesExchangeSummary[]>>({
    queryKey: marketOverviewKeys.derivativesExchanges(),
    queryFn: fetchDerivativesExchanges,
    staleTime: 10 * MINUTE,
    gcTime: 20 * MINUTE,
    enabled: options?.enabled ?? true,
  });
}

export function useSpotEtfFlows(options?: { enabled?: boolean }) {
  return useQuery<CachedResponse<SpotEtfFlows>>({
    queryKey: marketOverviewKeys.spotEtfFlows(),
    queryFn: fetchSpotEtfFlows,
    staleTime: 5 * MINUTE,
    gcTime: 15 * MINUTE,
    enabled: options?.enabled ?? true,
  });
}

export function useTokenUnlocks(params?: { limit?: number; hideSmallUnlocks?: boolean; enabled?: boolean }) {
  const limit = Math.min(50, Math.max(1, params?.limit ?? 10));
  const hideSmallUnlocks = params?.hideSmallUnlocks ?? true;
  const enabled = params?.enabled ?? true;

  return useQuery<CachedResponse<CryptorankTokenUnlock[]>>({
    queryKey: marketOverviewKeys.tokenUnlocks(limit, hideSmallUnlocks),
    queryFn: () => fetchTokenUnlocks({ limit, hideSmallUnlocks }),
    staleTime: 15 * MINUTE,
    gcTime: 30 * MINUTE,
    enabled,
  });
}

export function useNftMarkets(params?: { order?: string; perPage?: number; page?: number; enabled?: boolean }) {
  const order = params?.order ?? "market_cap_usd_desc";
  const perPage = params?.perPage ?? 50;
  const page = params?.page ?? 1;
  const enabled = params?.enabled ?? true;
  return useQuery<CachedResponse<NftMarketRow[]>>({
    queryKey: marketOverviewKeys.nftMarkets(order, perPage, page),
    queryFn: () => fetchNftMarkets({ order, perPage, page }),
    staleTime: 5 * MINUTE,
    gcTime: 10 * MINUTE,
    enabled,
  });
}

export function useNftDetails(id: string, enabled: boolean) {
  return useQuery<CachedResponse<NftCollectionDetails>>({
    queryKey: marketOverviewKeys.nftDetails(id),
    queryFn: () => fetchNftDetails(id),
    enabled: Boolean(id) && enabled,
    staleTime: 5 * MINUTE,
    gcTime: 15 * MINUTE,
  });
}

export function useNftMarketChart(
  id: string,
  params: { vsCurrency: string; days: number | string },
  enabled: boolean,
) {
  return useQuery<CachedResponse<NftMarketChart>>({
    queryKey: marketOverviewKeys.nftChart(id, params.vsCurrency, params.days),
    queryFn: () => fetchNftMarketChart(id, params),
    enabled: Boolean(id) && enabled,
    staleTime: 5 * MINUTE,
    gcTime: 15 * MINUTE,
  });
}

export function useMarketSentiment(options?: { initialData?: CachedResponse<MarketSentiment> }) {
  return useQuery<CachedResponse<MarketSentiment>>({
    queryKey: marketOverviewKeys.sentiment(),
    queryFn: fetchMarketSentiment,
    staleTime: 2 * MINUTE,
    gcTime: 5 * MINUTE,
    initialData: options?.initialData,
  });
}

type SantimentSentimentParams = {
  slug: string;
  from: string;
  to: string;
  interval?: string;
};

export function useSantimentSentiment(params: SantimentSentimentParams | null, enabled = true) {
  const slug = params?.slug?.toLowerCase() ?? "";
  const from = params?.from ?? "";
  const to = params?.to ?? "";
  const interval = params?.interval ?? "1h";
  const isReady = Boolean(slug && from && to && enabled);

  return useQuery<SantimentSentimentApiResponse>({
    queryKey: marketOverviewKeys.santimentSentiment(slug, from, to, interval),
    queryFn: () => fetchSantimentSentiment({ slug, from, to, interval }),
    enabled: isReady,
    staleTime: 5 * MINUTE,
    gcTime: 10 * MINUTE,
  });
}

type SantimentWordCloudParams = {
  slug: string;
  from: string;
  to: string;
  socialSource?: string;
};

export function useSantimentWordCloud(params: SantimentWordCloudParams | null, enabled = true) {
  const slug = params?.slug?.toLowerCase() ?? "";
  const from = params?.from ?? "";
  const to = params?.to ?? "";
  const socialSource = params?.socialSource ?? "telegram";
  const isReady = Boolean(slug && from && to && enabled);

  return useQuery<SantimentWordCloudApiResponse>({
    queryKey: marketOverviewKeys.santimentWordCloud(slug, from, to, socialSource),
    queryFn: () => fetchSantimentWordCloud({ slug, from, to, socialSource }),
    enabled: isReady,
    staleTime: 10 * MINUTE,
    gcTime: 20 * MINUTE,
  });
}

export function useMarketLeaderboard(options?: { initialData?: CachedResponse<CoinMarketRow[]> }) {
  return useQuery<CachedResponse<CoinMarketRow[]>>({
    queryKey: marketOverviewKeys.leaderboard(),
    queryFn: fetchMarketLeaderboard,
    staleTime: 45 * 1000,
    gcTime: 5 * MINUTE,
    initialData: options?.initialData,
  });
}

export function useMarketIndex(options?: { initialData?: CachedResponse<Coinbase50Index> }) {
  return useQuery<CachedResponse<Coinbase50Index>>({
    queryKey: marketOverviewKeys.coinbase50(),
    queryFn: fetchMarketIndex,
    staleTime: 45 * 1000,
    gcTime: 5 * MINUTE,
    initialData: options?.initialData,
  });
}

export function useTrendingPools(options?: { network?: string; enabled?: boolean }) {
  const normalizedNetwork = options?.network ? options.network.toLowerCase() : undefined;
  const enabled = options?.enabled ?? true;
  return useQuery<CachedResponse<TrendingPoolSummary[]>>({
    queryKey: marketOverviewKeys.trendingPools(normalizedNetwork ?? "all"),
    queryFn: () => fetchTrendingPools(normalizedNetwork),
    staleTime: 5 * MINUTE,
    gcTime: 10 * MINUTE,
    enabled,
  });
}

export function useNewPools(network?: string) {
  const normalizedNetwork = network ? network.toLowerCase() : undefined;
  return useQuery<CachedResponse<TrendingPoolSummary[]>>({
    queryKey: marketOverviewKeys.newPools(normalizedNetwork ?? "all"),
    queryFn: () => fetchNewPools(normalizedNetwork),
    staleTime: 5 * MINUTE,
    gcTime: 10 * MINUTE,
  });
}

export function useDexNewPairs(params?: { network?: string; limit?: number; enabled?: boolean }) {
  const network = (params?.network ?? "ether").toLowerCase();
  const limit = params?.limit ?? 20;

  return useQuery<CachedResponse<DexPairSummary[]>>({
    queryKey: marketOverviewKeys.dexNewPairs(network, limit),
    queryFn: () => fetchDexNewPairs({ network, limit }),
    staleTime: 60 * 1000,
    gcTime: 5 * MINUTE,
    enabled: params?.enabled ?? true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
}

type UseTrendingPairsOptions = {
  source?: "dextools" | "dexscreener";
  network?: string;
  chainId?: string;
  limit?: number;
  maxPairAgeMinutes?: number;
  enabled?: boolean;
};

export function useTrendingPairs(options: UseTrendingPairsOptions = {}) {
  const source = options.source ?? "dextools";
  const network = (options.network ?? "ether").toLowerCase();
  const chainId = options.chainId ?? "all";
  const limit = options.limit ?? 20;
  const maxPairAgeMinutes = options.maxPairAgeMinutes ?? (source === "dexscreener" ? 120 : 0);
  const enabled = options.enabled ?? true;

  return useQuery<CachedResponse<DexPairSummary[]>>({
    queryKey: marketOverviewKeys.dexTrending({
      source,
      network,
      chainId,
      limit,
      maxPairAgeMinutes,
    }),
    queryFn: () =>
      fetchDexTrendingPairs({
        source,
        network,
        chainId: chainId === "all" ? undefined : chainId,
        limit,
        maxPairAgeMinutes: maxPairAgeMinutes || undefined,
      }),
    staleTime: 90 * 1000,
    gcTime: 5 * MINUTE,
    enabled,
  });
}

export function useDefiTvlMovers(params?: { limit?: number; minTvlUsd?: number }) {
  const limit = params?.limit ?? 10;
  const minTvlUsd = params?.minTvlUsd ?? 5_000_000;

  return useQuery<CachedResponse<DefiTvlMovers>>({
    queryKey: marketOverviewKeys.tvlMovers(limit, minTvlUsd),
    queryFn: () => fetchDefiTvlMovers({ limit, minTvlUsd }),
    staleTime: 5 * MINUTE,
    gcTime: 10 * MINUTE,
  });
}

export function useDefillamaYieldPools(params?: {
  limit?: number;
  minTvlUsd?: number;
  chain?: string;
  project?: string;
  enabled?: boolean;
}) {
  const limit = params?.limit ?? 100;
  const minTvlUsd = params?.minTvlUsd ?? 1_000_000;
  const chain = params?.chain ?? null;
  const project = params?.project ?? null;
  const enabled = params?.enabled ?? true;

  return useQuery<CachedResponse<DefiLlamaYieldPool[]>>({
    queryKey: marketOverviewKeys.yieldPools(limit, chain, minTvlUsd, project),
    queryFn: () => fetchDefillamaYieldPools({ limit, minTvlUsd, chain: params?.chain, project: params?.project }),
    staleTime: 5 * MINUTE,
    gcTime: 10 * MINUTE,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled,
  });
}

export function useDefillamaPerpsOverview(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;

  return useQuery<CachedResponse<DefiLlamaPerpProtocol[]>>({
    queryKey: marketOverviewKeys.perpsOverview(),
    queryFn: fetchDefillamaPerpsOverview,
    staleTime: 5 * MINUTE,
    gcTime: 10 * MINUTE,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled,
  });
}

export function useTrendingLatest(
  limit = 10,
  options?: { enabled?: boolean; chain?: string; initialData?: CachedResponse<MoralisMarketToken[]> },
) {
  const enabled = options?.enabled ?? true;
  const chain = (options?.chain ?? "0x1").toLowerCase();

  return useQuery<CachedResponse<MoralisMarketToken[]>>({
    queryKey: marketOverviewKeys.trendingLatest(chain, limit),
    queryFn: () => fetchTrendingLatest({ limit, chain }),
    staleTime: 90 * 1000,
    gcTime: 5 * MINUTE,
    enabled,
    initialData: options?.initialData,
  });
}

export function usePumpfunNewTokens(params?: { network?: string; limit?: number; enabled?: boolean }) {
  const network = (params?.network ?? "mainnet").toLowerCase();
  const limit = params?.limit ?? 8;
  const enabled = params?.enabled ?? true;

  return useQuery<CachedResponse<PumpfunNewTokensFeed>>({
    queryKey: marketOverviewKeys.pumpfunNewTokens(network, limit),
    queryFn: () => fetchPumpfunNewTokens({ network, limit }),
    staleTime: 15 * 1000,
    gcTime: 2 * MINUTE,
    enabled,
    refetchOnWindowFocus: false,
  });
}

export function useLatestCryptoNews(options?: { enabled?: boolean; initialData?: CachedResponse<NewsArticle[]> }) {
  const enabled = options?.enabled ?? true;

  return useQuery<CachedResponse<NewsArticle[]>>({
    queryKey: marketOverviewKeys.news(),
    queryFn: fetchLatestNews,
    staleTime: 5 * MINUTE,
    gcTime: 10 * MINUTE,
    enabled,
    initialData: options?.initialData,
  });
}
