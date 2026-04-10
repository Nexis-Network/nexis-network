export interface MarketDataSeriesPoint {
  datetime: string;
  value: number;
}

export interface MarketDataAssetMetrics {
  priceUsd?: number;
  volume24h?: number;
  tvlUsd?: number;
  transactions24h?: number;
  protocolRevenueUsd?: number;
}

export interface MarketDataSentiment {
  socialDominance?: MarketDataSeriesPoint[];
  weightedSentiment?: MarketDataSeriesPoint[];
}

export interface MarketDataTokenMetrics {
  traderGrade?: number;
  traderDelta24h?: number;
  investorGrade?: number;
  investorDelta24h?: number;
}

export interface MarketDataAssetOverview {
  asset: string;
  image?: string;
  metrics: MarketDataAssetMetrics;
  sentiment: MarketDataSentiment;
  tokenMetrics: MarketDataTokenMetrics;
  errors: string[];
  fetchedAt: string;
}

export interface MarketDataOverviewResponse {
  data: MarketDataAssetOverview[];
  marketSnapshot?: UntypedJson;
  fetchedAt: string;
  errors: string[];
  cache?: "hit" | "miss";
}

export interface CoinMarketRow {
  id: string; // Birdeye address or slug
  address?: string;
  name: string;
  symbol: string;
  image?: string; // Unified with 'logoUrl'
  logoUrl?: string; // Legacy/Additional
  currentPrice: number | null; // Unified with priceUsd
  priceUsd: number | null; // Legacy alias
  priceChangePercentage24h: number | null;
  priceChangePercentage1h?: number | null;
  priceChangePercentage7d?: number | null;
  priceChangePercentage30d?: number | null;
  marketCap: number | null; // Unified with marketCapUsd
  marketCapUsd: number | null; // Legacy alias
  volume24hUsd: number | null;
  totalVolume: number | null; // Unified
  rank?: number | null;
  marketCapRank?: number | null; // Unified
  circulatingSupply?: number | null;
  totalSupply?: number | null;
  maxSupply?: number | null;
  fullyDilutedValuation?: number | null;
  high24h?: number | null;
  low24h?: number | null;
  high7d?: number | null;
  low7d?: number | null;
  pairImage?: string[];
  sparkline7d?: number[];
  lastUpdated?: string | null;
  coingeckoId?: string;
  chain?: string;
  
  // AI / Analysis Fields
  auditScore?: number; // 0-100
  isAuditSafe?: boolean;
  narrative?: string; // e.g., "AI", "Meme", "DePin"
  socialDominance?: number; // % value (0-100)
  smartMoneySignal?: 'buy' | 'sell' | 'neutral';
}

export interface TokenHolder {
  /** Raw on-chain balance string (e.g. "1000000000000000000"). May be a large integer
   *  beyond JS Number safe range; use `uiAmount` for display arithmetic. */
  amount: string | number;
  decimals: number;
  mint: string;
  owner: string;
  tokenAccount?: string;
  /** Human-readable balance (amount / 10^decimals). Safe for arithmetic/display. */
  uiAmount: number;
  value?: number;
}

export interface TokenSecurity {
  creatorAddress: string;
  creationTime: number; // Unix timestamp
  creationTx: string;
  mintTx: string;
  deployerBalance?: number;
  ownerBalance?: number;
  isTrueToken?: boolean;
  isHoneypot?: boolean;
}

export interface TokenTradeData {
  volume24h: number;
  volume24hUSD: number;
  buy24h: number;
  buy24hUSD: number;
  sell24h: number;
  sell24hUSD: number;
  uniqueWallets24h: number;
  tradeCount24h: number;
}

export interface TokenPair {
  address: string;
  name: string;
  liquidity: number;
  volume24h: number;
  price: number;
  priceChange24h?: number;
  dex: string;
  dexId?: string; // Optional alias or detailed ID
  quoteTokenSymbol: string;
  url?: string;
  symbol?: string;
  trades24h?: number;
  uniqueWallets24h?: number;
  baseToken?: { address: string; symbol: string; decimals: number; logoUrl?: string };
  quoteToken?: { address: string; symbol: string; decimals: number; logoUrl?: string };
}

export interface TokenTransaction {
  id: string; // Hash or signature
  blockTime: number; // Unix timestamp
  type: "buy" | "sell" | "swap" | "add" | "remove";
  source: string; // DEX name
  owner: string; // Wallet address
  baseAmount: number;
  baseSymbol: string;
  quoteAmount: number;
  quoteSymbol: string;
  usdValue: number;
  url?: string; // Explorer URL
}
