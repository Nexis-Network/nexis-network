import type { CachedResponse } from "./coingecko";

export type MarketSentiment = {
  score: number | null;
  classification: string | null;
  updatedAt: string | null;
};

export type CoinbaseLeaderboardRow = {
  id: number;
  name: string;
  symbol: string;
  pair: string;
  rank: number | null;
  priceUsd: number | null;
  priceChangePercent24h: number | null;
  volume24hUsd: number | null;
  volumeChangePercent24h: number | null;
  marketCapUsd: number | null;
  coingeckoId?: string | null;
};

export type Coinbase50IndexPoint = {
  timestamp: string;
  value: number;
};

export type Coinbase50Index = {
  level: number | null;
  changePercent24h: number | null;
  changeValue24h: number | null;
  volume24hUsd: number | null;
  updatedAt: string | null;
  divisor: number;
  chart: Coinbase50IndexPoint[];
};

export type CachedMarketSentiment = CachedResponse<MarketSentiment>;
export type CachedCoinbaseLeaderboard = CachedResponse<CoinbaseLeaderboardRow[]>;
export type CachedCoinbase50Index = CachedResponse<Coinbase50Index>;

export type CoinMarketCapListing = {
  id: number;
  name: string;
  symbol: string;
  slug?: string | null;
  cmcRank?: number | null;
  marketPairCount?: number | null;
  dateAdded?: string | null;
  tags?: string[];
  platform?: {
    id?: number | null;
    name?: string | null;
    symbol?: string | null;
    slug?: string | null;
    tokenAddress?: string | null;
  } | null;
  maxSupply?: number | null;
  circulatingSupply?: number | null;
  totalSupply?: number | null;
  fullyDilutedMarketCapUsd?: number | null;
  lastUpdated?: string | null;
  quote?: {
    priceUsd?: number | null;
    volume24hUsd?: number | null;
    percentChange1h?: number | null;
    percentChange24h?: number | null;
    percentChange7d?: number | null;
    marketCapUsd?: number | null;
    fullyDilutedMarketCapUsd?: number | null;
    lastUpdated?: string | null;
  };
};

export type CoinMarketCapTopMover = {
  id: number;
  name: string;
  symbol: string;
  slug?: string | null;
  cmcRank?: number | null;
  direction: "gainer" | "loser";
  priceUsd?: number | null;
  marketCapUsd?: number | null;
  volume24hUsd?: number | null;
  percentChange1h?: number | null;
  percentChange24h?: number | null;
  percentChange7d?: number | null;
  tags?: string[];
  lastUpdated?: string | null;
  coingeckoId?: string | null;
};

export type CoinMarketCapTopMovers = {
  timePeriod: string | null;
  gainers: CoinMarketCapTopMover[];
  losers: CoinMarketCapTopMover[];
  approximate?: boolean;
};

export type CachedCoinMarketCapListings = CachedResponse<CoinMarketCapListing[]>;
export type CachedCoinMarketCapTopMovers = CachedResponse<CoinMarketCapTopMovers>;

export type CoinMarketCapSpotPair = {
  id: number;
  name: string;
  symbol?: string | null;
  pairSymbol?: string | null;
  baseSymbol?: string | null;
  quoteSymbol?: string | null;
  exchangeName?: string | null;
  priceUsd?: number | null;
  volume24hUsd?: number | null;
  lastUpdated?: string | null;
};

export type CoinMarketCapTrendingAsset = {
  id: number;
  name: string;
  symbol: string;
  slug?: string | null;
  cmcRank?: number | null;
  priceUsd?: number | null;
  percentChange24h?: number | null;
  marketCapUsd?: number | null;
  volume24hUsd?: number | null;
  score?: number | null;
  lastUpdated?: string | null;
};

export type CachedCoinMarketCapSpotPairs = CachedResponse<CoinMarketCapSpotPair[]>;
export type CachedCoinMarketCapTrendingLatest = CachedResponse<CoinMarketCapTrendingAsset[]>;
