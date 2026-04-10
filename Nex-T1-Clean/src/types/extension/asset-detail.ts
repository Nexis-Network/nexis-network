export type AssetDetailRange = "1d" | "7d" | "30d";

export type AssetChainFamily = "EVM" | "SOLANA" | "STELLAR";

export type AssetDetailQuery = {
  chainId: string | number;
  address?: string;
  symbol?: string;
  range?: AssetDetailRange;
};

export type AssetLiveQuery = {
  chainId: string | number;
  address?: string;
  symbol?: string;
};

export type AssetContractRef = {
  chainKey: string;
  chainName: string;
  address: string;
  isPrimary: boolean;
};

export type AssetExchangeRow = {
  name: string;
  pair?: string | null;
  marketType?: string | null;
  trustScore?: string | null;
  volumeUsd?: number | null;
  priceUsd?: number | null;
  source: "coingecko" | "moralis";
};

export type AssetLiquidityPairRow = {
  pairLabel: string;
  pairAddress?: string | null;
  dexName?: string | null;
  liquidityUsd?: number | null;
  volume24hUsd?: number | null;
  chainKey: string;
  source: "coingecko" | "moralis";
};

export type AssetSentimentFactor = {
  id: string;
  contribution: number;
  value: number | null;
};

export type AssetDetailResponse = {
  query: {
    chainId: string;
    chainKey: string;
    family: AssetChainFamily;
    address?: string;
    symbol?: string;
    range: AssetDetailRange;
  };
  asset: {
    coingeckoId?: string | null;
    logoUrl?: string | null;
    name?: string | null;
    symbol?: string | null;
    description?: string | null;
    maxSupply?: number | null;
    totalSupply?: number | null;
    circulatingSupply?: number | null;
    marketCapUsd?: number | null;
    volume24hUsd?: number | null;
    athUsd?: number | null;
    athDate?: string | null;
    atlUsd?: number | null;
    atlDate?: string | null;
    contracts: AssetContractRef[];
  };
  charts: {
    range: AssetDetailRange;
    prices: Array<[number, number]>;
    totalVolumes: Array<[number, number]>;
  };
  exchanges: AssetExchangeRow[];
  liquidityPairs: AssetLiquidityPairRow[];
  availability: {
    coinGecko: boolean;
    moralis: boolean;
    metadataComplete: boolean;
    chartsAvailable: boolean;
    pairsAvailable: boolean;
  };
  warnings: string[];
  cache: {
    hit: boolean;
    ttlSec: number;
    generatedAt: string;
  };
};

export type AssetLiveResponse = {
  priceUsd: number | null;
  change24hPct: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  sentiment: {
    label: "bullish" | "neutral" | "bearish";
    score: number;
    confidence: number;
    factors: AssetSentimentFactor[];
  };
  warnings: string[];
  cache: {
    hit: boolean;
    ttlSec: number;
    generatedAt: string;
  };
};

export type NftDetailScaffoldResponse = {
  enabled: false;
  query: {
    chainId: string;
    contractAddress: string | null;
    tokenId: string | null;
  };
  metadata: null;
  contractMetadata: null;
  floorPrice: null;
  trades: [];
  warnings: string[];
  cache: {
    hit: boolean;
    ttlSec: number;
    generatedAt: string;
  };
};
