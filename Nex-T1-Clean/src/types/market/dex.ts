export type DexPairSource = "dextools" | "dexscreener" | "moralis" | "birdeye";

export type DexTokenSummary = {
  address?: string | null;
  symbol?: string | null;
  name?: string | null;
  logoUrl?: string | null;
  priceUsd?: number | null;
  priceNative?: number | null;
};

export type DexTxnStats = {
  buys?: number | null;
  sells?: number | null;
  total?: number | null;
};

export type DexPairSummary = {
  id: string;
  source: DexPairSource;
  chainId?: string | null;
  network?: string | null;
  dexId?: string | null;
  dexName?: string | null;
  pairAddress?: string | null;
  url?: string | null;
  baseToken: DexTokenSummary;
  quoteToken: DexTokenSummary;
  priceUsd?: number | null;
  priceNative?: number | null;
  priceChangePercent1h?: number | null;
  priceChangePercent6h?: number | null;
  priceChangePercent24h?: number | null;
  liquidityUsd?: number | null;
  liquidityBase?: number | null;
  liquidityQuote?: number | null;
  volumeUsd1h?: number | null;
  volumeUsd6h?: number | null;
  volumeUsd24h?: number | null;
  fdvUsd?: number | null;
  marketCapUsd?: number | null;
  transactions1h?: DexTxnStats | null;
  transactions6h?: DexTxnStats | null;
  transactions24h?: DexTxnStats | null;
  pairCreatedAt?: string | null;
  confidence?: string | null;
  score?: number | null;
  tags?: string[];
};
