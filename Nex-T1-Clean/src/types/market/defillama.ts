export type DefiLlamaProtocol = {
  id: string;
  name: string;
  symbol?: string | null;
  slug: string;
  url?: string | null;
  description?: string | null;
  logo?: string | null;
  category?: string | null;
  chain?: string | null;
  chains: string[];
  tvlUsd: number | null;
  change1h?: number | null;
  change1d?: number | null;
  change7d?: number | null;
  change1m?: number | null;
  chainTvls?: Record<string, number>;
  marketCapUsd?: number | null;
};

export type DefiLlamaChainSummary = {
  name: string;
  chainId?: number | string | null;
  tokenSymbol?: string | null;
  tvlUsd: number | null;
  change1h?: number | null;
  change1d?: number | null;
  change7d?: number | null;
  change1m?: number | null;
};

export type DefiTvlMover = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  category?: string | null;
  chains: string[];
  tvlUsd: number | null;
  absoluteChangeUsd24h: number | null;
  percentChange24h: number | null;
  percentChange7d?: number | null;
  percentChange1m?: number | null;
  url?: string | null;
};

export type DefiTvlMovers = {
  gainers: DefiTvlMover[];
  losers: DefiTvlMover[];
};

export type DefiLlamaYieldPoolPrediction = {
  predictedClass?: string | null;
  predictedProbability?: number | null;
  binnedConfidence?: number | null;
};

export type DefiLlamaYieldPool = {
  id: string;
  pool: string;
  project: string;
  chain: string;
  symbol?: string | null;
  tvlUsd: number | null;
  apy?: number | null;
  apyBase?: number | null;
  apyReward?: number | null;
  rewardTokens: string[];
  underlyingTokens: string[];
  poolMeta?: string | null;
  url?: string | null;
  predictions?: DefiLlamaYieldPoolPrediction | null;
  logo?: string | null;
  // Extended properties for UI display
  link?: string | null;
  poolAddress?: string | null;
  lpToken?: {
    address?: string | null;
    symbol?: string | null;
  } | null;
};

export type DefiLlamaEtfSnapshot = {
  ticker: string;
  timestamp?: number | null;
  asset?: string | null;
  issuer?: string | null;
  name?: string | null;
  custodian?: string | null;
  pctFee?: number | null;
  url?: string | null;
  flows?: number | null;
  aum?: number | null;
  volume?: number | null;
  logo?: string | null;
};

export type DefiLlamaPerpProtocol = {
  id: string;
  name: string;
  displayName?: string | null;
  logo?: string | null;
  chains: string[];
  total24h?: number | null;
  total7d?: number | null;
  change1d?: number | null;
  change7d?: number | null;
  change30d?: number | null;
  slug?: string | null;
  url?: string | null;
};
