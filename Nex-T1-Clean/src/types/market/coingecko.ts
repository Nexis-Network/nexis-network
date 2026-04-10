import type { CoinMarketRow } from "./market-data";

export type CacheState = "hit" | "miss";

export type CachedResponse<T> = {
  data: T;
  fetchedAt: string;
  cache: CacheState;
  stale?: boolean;
  fallback?: boolean;
  error?: string;
};

export type GlobalMarketOverview = {
  totalMarketCapUsd: number | null;
  totalVolume24hUsd: number | null;
  marketCapChangePercentage24hUsd: number | null;
  btcDominancePercentage: number | null;
  ethDominancePercentage: number | null;
  activeCryptocurrencies: number | null;
  markets: number | null;
  updatedAt: string | null;
};

export interface GlobalMarketData {
  active_cryptocurrencies: number;
  upcoming_icos: number;
  ongoing_icos: number;
  ended_icos: number;
  markets: number;
  total_market_cap: Record<string, number>;
  total_volume: Record<string, number>;
  market_cap_percentage: Record<string, number>;
  market_cap_change_percentage_24h_usd: number;
  updated_at: number;
}

export type TrendingEntityType = "coin" | "nft" | "category";

export type TrendingEntity = {
  id: string;
  name: string;
  symbol?: string;
  type: TrendingEntityType;
  score?: number | null;
  marketCapRank?: number | null;
  priceBtc?: number | null;
  thumbnailUrl?: string;
  smallImageUrl?: string;
  largeImageUrl?: string;
  quickStats?: {
    priceUsd?: number | null;
    priceChangePercentage24h?: number | null;
    marketCapUsd?: number | null;
    floorPriceNative?: number | null;
    floorPriceUsd?: number | null;
    volume24hUsd?: number | null;
  };
};

export type TrendingCollection = {
  coins: TrendingEntity[];
  nfts: TrendingEntity[];
  categories: TrendingEntity[];
  combined: TrendingEntity[];
};

export type TopMover = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  currentPrice: number | null;
  priceChangePercentage24h: number | null;
  totalVolume: number | null;
  marketCap: number | null;
  marketCapRank: number | null;
  sparkline7d: number[];
};

export type TopMoversResponse = {
  gainers: TopMover[];
  losers: TopMover[];
  approximate: boolean;
  source: "top_gainers_losers" | "markets" | "birdeye";
};



export type MarketsResponse = {
  items: CoinMarketRow[];
  page: number;
  perPage: number;
  order: string;
  vsCurrency: string;
  total?: number | null;
};

export type CoinCategorySummary = {
  id: string;
  name: string;
  marketCap: number | null;
  marketCapChange24h: number | null;
  volume24hUsd: number | null;
  topThreeCoinImageUrls: string[];
  updatedAt: string | null;
};

export type CoinNetwork = {
  chain: string;
  contractAddress?: string | null;
};

export type CoinDirectoryEntry = {
  id: string;
  symbol: string;
  name: string;
  platforms?: Record<string, string | null>;
};

export type CoinSearchResult = {
  id: string;
  symbol: string;
  name: string;
  marketCapRank?: number | null;
  thumb?: string | null;
};

export type NftSearchResult = {
  id: string;
  name: string;
  symbol: string;
  slug: string;
  thumbUrl?: string | null;
};

export type AssetSearchCollection = {
  coins: CoinSearchResult[];
  nfts: NftSearchResult[];
};

export type CoinDetails = {
  id: string;
  name: string;
  symbol: string;
  description?: string | null;
  categories: string[];
  marketCapRank?: number | null;
  hashingAlgorithm?: string | null;
  genesisDate?: string | null;
  networks: CoinNetwork[];
  image?: {
    thumb?: string | null;
    small?: string | null;
    large?: string | null;
  };
  homepageUrls: string[];
  blockchainSiteUrls: string[];
  sentimentVotesUpPercentage?: number | null;
  sentimentVotesDownPercentage?: number | null;
  marketData: {
    currentPriceUsd?: number | null;
    priceChangePercentage24h?: number | null;
    priceChangePercentage7d?: number | null;
    priceChangePercentage30d?: number | null;
    priceChangePercentage1y?: number | null;
    marketCapUsd?: number | null;
    fullyDilutedValuationUsd?: number | null;
    totalVolumeUsd?: number | null;
    circulatingSupply?: number | null;
    totalSupply?: number | null;
    maxSupply?: number | null;
    high24hUsd?: number | null;
    low24hUsd?: number | null;
    athUsd?: number | null;
    athDate?: string | null;
    atlUsd?: number | null;
    atlDate?: string | null;
    lastUpdated?: string | null;
  };
};

export type CoinMarketChart = {
  prices: [number, number][];
  marketCaps: [number, number][];
  totalVolumes: [number, number][];
};

export type CoinOHLCPoint = [timestamp: number, open: number, high: number, low: number, close: number];

export type VsCurrenciesResponse = {
  currencies: string[];
};

export type MarketsQueryParams = {
  vsCurrency: string;
  order?: string;
  perPage?: number;
  page?: number;
  category?: string | string[];
  sparkline?: boolean;
  priceChangePercentage?: string;
  precision?: "full" | "2" | string;
  ids?: string;
};

export type TopMoversQueryParams = {
  vsCurrency: string;
  duration?: "1h" | "24h" | "7d" | "14d" | "30d" | "60d" | "1y";
  topCoinCount?: number | string;
};

export type CoinChartQueryParams = {
  vsCurrency: string;
  days: number | string;
  interval?: string;
};

export type CoinOhlcQueryParams = {
  vsCurrency: string;
  days: number | string;
};

export type NewCoinMarket = {
  id: string;
  symbol: string;
  name: string;
  image?: string | null;
  priceUsd?: number | null;
  priceChangePercent24h?: number | null;
  marketCapRank?: number | null;
  totalVolumeUsd?: number | null;
  launchDate?: string | null;
  dataSource?: string;
};

export type ExchangeSummary = {
  id: string;
  name: string;
  yearEstablished?: number | null;
  country?: string | null;
  url?: string | null;
  trustScore?: number | null;
  tradeVolume24hBtc?: number | null;
  tradeVolume24hBtcNormalized?: number | null;
  image?: string | null;
};

export type DerivativesExchangeSummary = {
  name: string;
  yearEstablished?: number | null;
  country?: string | null;
  url?: string | null;
  tradeVolume24hBtc?: number | null;
  numberOfPairs?: number | null;
  openInterestBtc?: number | null;
  image?: string | null;
};

export type NftMarketRow = {
  id: string;
  name: string;
  symbol: string;
  floorPriceNative?: number | null;
  floorPriceUsd?: number | null;
  marketCapUsd?: number | null;
  volume24hUsd?: number | null;
  totalVolumeUsd?: number | null;
  blockchains: string[];
  imageUrl?: string | null;
  dataSource?: string | null;
};

export type NewsArticle = {
  id: string;
  title: string;
  description?: string | null;
  url: string;
  imageUrl?: string | null;
  source: string;
  publishedAt: string;
};

export type NftCollectionSummary = {
  id: string;
  name: string;
  symbol: string;
  floorPriceNative?: number | null;
  floorPriceUsd?: number | null;
  volume24hUsd?: number | null;
  marketCapUsd?: number | null;
  contractAddress?: string | null;
  imageUrl?: string | null;
  dataSource?: string | null;
};

export type NftCollectionDetails = {
  id: string;
  name: string;
  symbol: string;
  description?: string | null;
  homepageUrl?: string | null;
  floorPriceNative?: number | null;
  floorPriceUsd?: number | null;
  marketCapUsd?: number | null;
  volume24hUsd?: number | null;
  totalVolumeUsd?: number | null;
  numberOfTokens?: number | null;
  ownersCount?: number | null;
  oneDaySales?: number | null;
  oneDayAveragePriceUsd?: number | null;
  blockchains: string[];
  contractAddress?: string | null;
  imageUrl?: string | null;
  lastUpdated?: string | null;
};

export type NftMarketChartPoint = [timestamp: number, price: number];

export type NftMarketChart = {
  prices: NftMarketChartPoint[];
  totalVolumes?: [number, number][];
};

export type TrendingPoolSummary = {
  id: string;
  poolAddress: string;
  dex: string;
  network: string;
  baseToken: {
    symbol: string;
    name: string;
    address?: string | null;
    decimals?: number | null;
    priceUsd?: number | null;
  };
  quoteToken: {
    symbol: string;
    name: string;
    address?: string | null;
    decimals?: number | null;
    priceUsd?: number | null;
  };
  priceUsd?: number | null;
  volume24hUsd?: number | null;
  liquidityUsd?: number | null;
  transactions24h?: number | null;
  url?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

// --- Onchain DEX Data Types ---

export type OnchainTokenAttribute = {
  address: string;
  name: string;
  symbol: string;
  image_url: string;
  coingecko_coin_id: string;
  decimals: number;
  total_supply: string;
  price_usd: string;
  fdv_usd: string;
  total_reserve_in_usd: string;
  volume_usd: {
    h24: string;
  };
  market_cap_usd: string;
};

export type OnchainTokenData = {
  id: string;
  type: string;
  attributes: OnchainTokenAttribute;
};

export type OnchainPoolAttribute = {
  base_token_price_usd: string;
  base_token_price_native_currency: string;
  quote_token_price_usd: string;
  quote_token_price_native_currency: string;
  base_token_price_quote_token: string;
  quote_token_price_base_token: string;
  address: string;
  name: string;
  pool_created_at: string;
  token_price_usd: string;
  fdv_usd: string;
  market_cap_usd: string;
  price_change_percentage: {
    m5: string;
    h1: string;
    h6: string;
    h24: string;
  };
  transactions: {
    m5: { buys: number; sells: number; buyers: number; sellers: number };
    m15: { buys: number; sells: number; buyers: number; sellers: number };
    m30: { buys: number; sells: number; buyers: number; sellers: number };
    h1: { buys: number; sells: number; buyers: number; sellers: number };
    h24: { buys: number; sells: number; buyers: number; sellers: number };
  };
  volume_usd: {
    m5: string;
    h1: string;
    h6: string;
    h24: string;
  };
  reserve_in_usd: string;
};

export type OnchainPoolData = {
  id: string;
  type: string;
  attributes: OnchainPoolAttribute;
  relationships?: {
    base_token: { data: { id: string; type: string } };
    quote_token: { data: { id: string; type: string } };
    dex: { data: { id: string; type: string } };
  };
};

export type OnchainPoolOHLCV = {
  id: string;
  type: string;
  attributes: {
    // timestamp, open, high, low, close, volume
    ohlcv_list: [number, number, number, number, number, number][];
  };
};

export type OnchainTradeAttribute = {
  tx_hash: string;
  tx_from_address: string;
  from_token_amount: string;
  to_token_amount: string;
  price_from_in_currency_token: string;
  price_to_in_currency_token: string;
  price_from_in_usd: string;
  price_to_in_usd: string;
  block_timestamp: string;
  kind: "buy" | "sell";
  volume_in_usd: string;
};

export type OnchainTradeData = {
  id: string;
  type: string;
  attributes: OnchainTradeAttribute;
};
