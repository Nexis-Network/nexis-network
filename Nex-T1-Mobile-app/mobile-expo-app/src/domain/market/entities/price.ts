import type { Timestamp } from '@domain/common/types';

// ---------------------------------------------------------------------------
// Token price
// ---------------------------------------------------------------------------

export interface TokenPrice {
  readonly id: string;
  readonly symbol: string;
  readonly usdPrice: number;
  readonly change24h: number;
  readonly lastUpdated: Timestamp;
}

// ---------------------------------------------------------------------------
// Price error
// ---------------------------------------------------------------------------

export class PriceError extends Error {
  public readonly code: string;
  constructor(message: string, code = 'PRICE_ERROR') {
    super(message);
    this.name = 'PriceError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ---------------------------------------------------------------------------
// CoinGecko ID resolution map
// ---------------------------------------------------------------------------

/**
 * Maps chain native tokens and well-known assets to CoinGecko IDs.
 * Keys follow the pattern `chainType:native:chainId` for native tokens
 * or `chainType:symbol` for well-known cross-chain tokens.
 */
export const COINGECKO_ID_MAP: Readonly<Record<string, string>> = {
  // EVM native tokens
  'evm:native:1': 'ethereum',
  'evm:native:8453': 'ethereum',
  'evm:native:10': 'ethereum',
  'evm:native:42161': 'ethereum',
  'evm:native:137': 'matic-network',
  'evm:native:56': 'binancecoin',
  'evm:native:43114': 'avalanche-2',
  'evm:native:42220': 'celo',
  // Non-EVM native tokens
  'solana:native': 'solana',
  'stellar:native': 'stellar',
  // Well-known tokens
  'evm:usdc': 'usd-coin',
  'evm:usdt': 'tether',
  'evm:dai': 'dai',
  'evm:wbtc': 'wrapped-bitcoin',
  // Liquid staking tokens
  'evm:steth': 'staked-ether',
  'evm:reth': 'rocket-pool-eth',
  'evm:cbeth': 'coinbase-wrapped-staked-eth',
};

/**
 * Resolve a CoinGecko ID from chain + token context.
 */
export function resolveCoinGeckoId(
  chainType: string,
  chainId?: number | string,
  tokenSymbol?: string,
): string | undefined {
  // Try native token key first
  if (chainId !== undefined) {
    const nativeKey = `${chainType}:native:${chainId}`;
    if (COINGECKO_ID_MAP[nativeKey]) return COINGECKO_ID_MAP[nativeKey];
  }

  // Try non-EVM native
  const nonEvmKey = `${chainType}:native`;
  if (COINGECKO_ID_MAP[nonEvmKey]) return COINGECKO_ID_MAP[nonEvmKey];

  // Try symbol-based lookup
  if (tokenSymbol) {
    const symbolKey = `${chainType}:${tokenSymbol.toLowerCase()}`;
    if (COINGECKO_ID_MAP[symbolKey]) return COINGECKO_ID_MAP[symbolKey];
  }

  return undefined;
}
