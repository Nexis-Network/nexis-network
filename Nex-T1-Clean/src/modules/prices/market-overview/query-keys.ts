export const marketOverviewKeys = {
  root: ["market-overview"] as const,
  global: () => [...marketOverviewKeys.root, "global"] as const,
  trending: () => [...marketOverviewKeys.root, "trending"] as const,
  listings: (limit: number) => [...marketOverviewKeys.root, "listings", limit] as const,
  topGainersLosers: (chain: string, timeFrame: string, limit: number) =>
    [...marketOverviewKeys.root, "top-gainers-losers", chain.toLowerCase(), timeFrame.toLowerCase(), limit] as const,
  trendingLatest: (chain: string, limit: number) =>
    [...marketOverviewKeys.root, "trending-latest", chain.toLowerCase(), limit] as const,
  topMovers: (vsCurrency: string, duration: string) =>
    [...marketOverviewKeys.root, "top-movers", vsCurrency, duration] as const,
  markets: (params: {
    vsCurrency: string;
    order?: string;
    perPage?: number;
    page?: number;
    category?: string | string[];
    priceChangePercentage?: string;
    sparkline?: boolean;
    precision?: string;
    search?: string;
  }) =>
    [
      ...marketOverviewKeys.root,
      "markets",
      params.vsCurrency,
      params.order ?? "market_cap_desc",
      params.perPage ?? 25,
      params.page ?? 1,
      Array.isArray(params.category)
        ? params.category.slice().sort().join(",") || "all"
        : params.category ?? "all",
      params.priceChangePercentage ?? "1h,24h,7d",
      params.sparkline !== false,
      params.precision ?? "2",
      params.search?.toLowerCase() ?? "",
    ] as const,
  categories: () => [...marketOverviewKeys.root, "categories"] as const,
  vsCurrencies: () => [...marketOverviewKeys.root, "vs-currencies"] as const,
  coinDetails: (id: string) => [...marketOverviewKeys.root, "coin", id] as const,
  coinChart: (id: string, vsCurrency: string, days: string | number, interval?: string) =>
    [...marketOverviewKeys.root, "coin-chart", id, vsCurrency, days, interval ?? "default"] as const,
  coinOhlc: (id: string, vsCurrency: string, days: string | number) =>
    [...marketOverviewKeys.root, "coin-ohlc", id, vsCurrency, days] as const,
  nftsTrending: () => [...marketOverviewKeys.root, "nfts", "trending"] as const,
  nftDetails: (id: string) => [...marketOverviewKeys.root, "nft", id] as const,
  nftChart: (id: string, vsCurrency: string, days: string | number) =>
    [...marketOverviewKeys.root, "nft-chart", id, vsCurrency, days] as const,
  newCoins: (vsCurrency: string, limit?: number) =>
    [...marketOverviewKeys.root, "coins", "new", vsCurrency, limit ?? "default"] as const,
  exchanges: () => [...marketOverviewKeys.root, "exchanges"] as const,
  derivativesExchanges: () => [...marketOverviewKeys.root, "derivatives-exchanges"] as const,
  nftMarkets: (order: string, perPage: number, page: number) =>
    [...marketOverviewKeys.root, "nft-markets", order, perPage, page] as const,
  trendingPools: (network?: string) =>
    [...marketOverviewKeys.root, "pools", "trending", network ?? "all"] as const,
  newPools: (network?: string) => [...marketOverviewKeys.root, "pools", "new", network ?? "all"] as const,
  dexNewPairs: (network: string, limit: number) =>
    [...marketOverviewKeys.root, "dex", "new-pairs", network, limit] as const,
  dexTrending: (params: { source: string; network?: string; chainId?: string; limit: number; maxPairAgeMinutes?: number }) =>
    [
      ...marketOverviewKeys.root,
      "dex",
      "trending",
      params.source,
      params.network ?? "all",
      params.chainId ?? "all",
      params.limit,
      params.maxPairAgeMinutes ?? 0,
    ] as const,
  pumpfunNewTokens: (network: string, limit: number) =>
    [...marketOverviewKeys.root, "pumpfun", "new", network.toLowerCase(), limit] as const,
  news: () => [...marketOverviewKeys.root, "news"] as const,
  sentiment: () => [...marketOverviewKeys.root, "sentiment"] as const,
  santimentSentiment: (slug: string, from: string, to: string, interval: string) =>
    [...marketOverviewKeys.root, "santiment", "sentiment", slug, from, to, interval] as const,
  santimentWordCloud: (slug: string, from: string, to: string, socialSource: string) =>
    [...marketOverviewKeys.root, "santiment", "wordcloud", slug, from, to, socialSource] as const,
  tvlMovers: (limit: number, minTvlUsd: number) =>
    [...marketOverviewKeys.root, "tvl-movers", limit, minTvlUsd] as const,
  leaderboard: () => [...marketOverviewKeys.root, "leaderboard"] as const,
  coinbase50: () => [...marketOverviewKeys.root, "coin50"] as const,
  yieldPools: (limit: number, chain?: string | null, minTvlUsd?: number, project?: string | null) =>
    [
      ...marketOverviewKeys.root,
      "defillama",
      "yields",
      limit,
      chain?.toLowerCase() ?? "all",
      minTvlUsd ?? 0,
      project?.toLowerCase() ?? "all",
    ] as const,
  etfSnapshot: () => [...marketOverviewKeys.root, "defillama", "etfs", "snapshot"] as const,
  spotEtfFlows: () => [...marketOverviewKeys.root, "etf-flows"] as const,
  tokenUnlocks: (limit: number, hideSmallUnlocks: boolean) =>
    [...marketOverviewKeys.root, "token-unlocks", limit, hideSmallUnlocks] as const,
  perpsOverview: () => [...marketOverviewKeys.root, "defillama", "perps", "overview"] as const,
};
