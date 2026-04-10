import type { CoinNetwork, DexPairSummary, NftMarketChart } from "./market";

export type AssetNewsItem = {
  id: string;
  title: string;
  summary?: string | null;
  url: string;
  source: string;
  publishedAt: string;
  tags?: string[];
};

export type PeerAsset = {
  id: string;
  slug: string;
  name: string;
  symbol: string;
  priceUsd?: number | null;
  priceChangePercent24h?: number | null;
  marketCapUsd?: number | null;
  logoUrl?: string | null;
  categories?: string[];
  entityType?: "token" | "nft";
};

export type TokenAssetSnapshot = {
  kind: "token";
  id: string;
  slug: string;
  name: string;
  symbol: string;
  rank?: number | null;
  genesisDate?: string | null;
  description?: string | null;
  categories: string[];
  sentiment?: {
    upPercent?: number | null;
    downPercent?: number | null;
  };
  imageUrl?: string | null;
  homepageUrls: string[];
  blockchainSiteUrls: string[];
  networks: CoinNetwork[];
  marketData: {
    priceUsd?: number | null;
    priceChangePercent24h?: number | null;
    priceChangePercent7d?: number | null;
    priceChangePercent30d?: number | null;
    priceChangePercent1y?: number | null;
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
  messariMetrics?: {
    tvlUsd?: number | null;
    volume24hUsd?: number | null;
    transactions24h?: number | null;
    revenue24hUsd?: number | null;
  };
  defiLlama?: {
    tvlUsd?: number | null;
    change1h?: number | null;
    change1d?: number | null;
    change7d?: number | null;
    change1m?: number | null;
    url?: string | null;
  };
  dexPairs: DexPairSummary[];
  dexPairsSource: "dexscreener" | "dextools" | "moralis" | "mixed" | "none";
  news: AssetNewsItem[];
  peers: PeerAsset[];
};

export type NftAssetSnapshot = {
  kind: "nft";
  id: string;
  slug: string;
  name: string;
  symbol: string;
  description?: string | null;
  homepageUrl?: string | null;
  imageUrl?: string | null;
  blockchains: string[];
  contractAddress?: string | null;
  floorPriceNative?: number | null;
  floorPriceUsd?: number | null;
  volume24hUsd?: number | null;
  totalVolumeUsd?: number | null;
  marketCapUsd?: number | null;
  numberOfTokens?: number | null;
  ownersCount?: number | null;
  oneDaySales?: number | null;
  oneDayAveragePriceUsd?: number | null;
  lastUpdated?: string | null;
  chart?: {
    timeframeId: string;
    vsCurrency: string;
    data: NftMarketChart;
  } | null;
  peers: PeerAsset[];
  news: AssetNewsItem[];
};

export type AssetSnapshot = TokenAssetSnapshot | NftAssetSnapshot;

export type AssetSnapshotResponse = {
  data: AssetSnapshot | null;
  fetchedAt: string;
  errors: string[];
};

export type CompareAssetSearchItem = {
  id: string;
  slug: string;
  name: string;
  symbol: string;
  assetType: "token" | "nft";
  logoUrl?: string | null;
  priceUsd?: number | null;
  priceNative?: number | null;
  nativeSymbol?: string | null;
  priceChangeUsd24h?: number | null;
  priceChangePercent24h?: number | null;
  marketCapRank?: number | null;
};

export type CompareAssetSearchResponse = {
  data: CompareAssetSearchItem[];
  fetchedAt: string;
};

export type PriceMovementEntry = {
  id: string;
  title: string;
  price?: number | null;
  deltaPercent?: number | null;
  timestamp?: string | null;
  relativeTime?: string | null;
  narrative: string;
  tags?: string[];
};

export type TokenThemeView = {
  summary: string;
  sources: string[];
};

export type TokenTheme = {
  id: string;
  title: string;
  bullish: TokenThemeView;
  bearish: TokenThemeView;
};
