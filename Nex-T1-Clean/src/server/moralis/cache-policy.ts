export type MoralisCachePolicy = {
  ttlSeconds: number;
  staleTtlSeconds: number;
};

export const MORALIS_CACHE: Record<string, MoralisCachePolicy> = {
  // Wallet
  walletBalances: { ttlSeconds: 30, staleTtlSeconds: 120 },
  walletHistory: { ttlSeconds: 60, staleTtlSeconds: 5 * 60 },
  walletApprovals: { ttlSeconds: 60, staleTtlSeconds: 5 * 60 },
  walletTransfers: { ttlSeconds: 60, staleTtlSeconds: 5 * 60 },
  walletNfts: { ttlSeconds: 120, staleTtlSeconds: 10 * 60 },
  walletNetWorth: { ttlSeconds: 60, staleTtlSeconds: 10 * 60 },
  walletPnl: { ttlSeconds: 5 * 60, staleTtlSeconds: 30 * 60 },

  // Token metadata / prices
  tokenMetadata: { ttlSeconds: 60 * 60, staleTtlSeconds: 24 * 60 * 60 },
  tokenPrices: { ttlSeconds: 20, staleTtlSeconds: 2 * 60 },

  // Market / discovery
  marketTrending: { ttlSeconds: 60, staleTtlSeconds: 10 * 60 },
  marketMovers: { ttlSeconds: 60, staleTtlSeconds: 10 * 60 },
  marketFilteredTokens: { ttlSeconds: 90, staleTtlSeconds: 15 * 60 },

  // Solana DEX / Pump.fun
  solPairsByToken: { ttlSeconds: 60, staleTtlSeconds: 10 * 60 },
  solPairStats: { ttlSeconds: 60, staleTtlSeconds: 10 * 60 },
  solOhlcv: { ttlSeconds: 60, staleTtlSeconds: 10 * 60 },
  pumpfunNewTokens: { ttlSeconds: 20, staleTtlSeconds: 2 * 60 },
  pumpfunPairs: { ttlSeconds: 30, staleTtlSeconds: 5 * 60 },
  pumpfunPrices: { ttlSeconds: 20, staleTtlSeconds: 2 * 60 },
  pumpfunMetadata: { ttlSeconds: 60 * 60, staleTtlSeconds: 24 * 60 * 60 },
  pumpfunBondingStatus: { ttlSeconds: 30, staleTtlSeconds: 5 * 60 },
  pumpfunBondingTokens: { ttlSeconds: 30, staleTtlSeconds: 5 * 60 },
  pumpfunGraduatedTokens: { ttlSeconds: 60, staleTtlSeconds: 10 * 60 },
};
