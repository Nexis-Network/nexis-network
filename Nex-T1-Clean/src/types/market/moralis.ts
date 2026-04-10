import type { CachedResponse } from "./coingecko";

// ---------------------------------------------------------------------------
// Moralis-backed market types (normalized for UI consumption)
// ---------------------------------------------------------------------------

export type MoralisChain = `0x${string}` | "solana";

export type MoralisMarketToken = {
  /** Stable identifier for UI lists (typically `${chain}:${address}`) */
  id: string;
  chain: MoralisChain;
  /** Contract (EVM) or mint (Solana) address */
  address: string | null;
  name: string | null;
  symbol: string | null;
  logoUrl: string | null;
  priceUsd: number | null;
  priceChange24hPercent: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  rank?: number | null;
  score?: number | null;
  securityScore?: number | null;
};

export type MoralisMarketMovers = {
  chain: MoralisChain;
  timeFrame: string | null;
  gainers: MoralisMarketToken[];
  losers: MoralisMarketToken[];
  approximate: boolean;
  source: "moralis_discovery" | "moralis_market_data" | "fallback";
};

export type CachedMoralisMarketMovers = CachedResponse<MoralisMarketMovers>;
export type CachedMoralisTrendingTokens = CachedResponse<MoralisMarketToken[]>;

// ---------------------------------------------------------------------------
// Pump.fun (Solana) feeds
// ---------------------------------------------------------------------------

export type PumpfunNewToken = {
  address: string;
  name: string | null;
  symbol: string | null;
  imageUrl: string | null;
  createdAt: string | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
};

export type PumpfunNewTokensFeed = {
  network: "mainnet" | "devnet";
  cursor: string | null;
  items: PumpfunNewToken[];
};

export type CachedPumpfunNewTokensFeed = CachedResponse<PumpfunNewTokensFeed>;

