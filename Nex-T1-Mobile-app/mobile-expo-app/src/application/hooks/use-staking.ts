/**
 * useStaking Hook
 *
 * React Query hook for fetching staking positions (liquid staking tokens on EVM,
 * native stake accounts on Solana). Composes with `usePrices` for USD conversion.
 *
 * Usage:
 * ```ts
 * const { data, isLoading, error, refetch } = useStaking({
 *   address: '0x...',
 *   chainType: 'evm',
 *   chainId: 1,
 * });
 * ```
 */

import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
  fetchEvmStakingPositions,
  fetchSolanaStakingPositions,
} from '@infrastructure/wallet/staking-service';
import { usePrices, getPriceById } from '@application/hooks/use-prices';
import { COINGECKO_ID_MAP, type TokenPrice } from '@domain/market/entities/price';
import type { StakingPosition } from '@domain/wallet/entities/staking';
import type { ChainType } from '@domain/wallet/entities/wallet';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAKING_QUERY_KEY = 'staking';
const STALE_TIME_MS = 30_000;
const REFETCH_INTERVAL_MS = 60_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseStakingOptions {
  /** Wallet address to fetch staking positions for. */
  readonly address: string | undefined;
  /** Chain type: 'evm' or 'solana'. */
  readonly chainType: ChainType;
  /** Chain ID: numeric for EVM, string for Solana. */
  readonly chainId: number | string;
  /** Whether the query is enabled. Defaults to true. */
  readonly enabled?: boolean;
}

export interface UseStakingResult {
  /** Array of staking positions, or undefined if loading/error. */
  readonly positions: ReadonlyArray<StakingPosition> | undefined;
  /** Total staked value in USD across all positions. */
  readonly totalStakedUsd: number;
  /** Whether the query is currently loading. */
  readonly isLoading: boolean;
  /** Whether an error occurred. */
  readonly isError: boolean;
  /** Error message if isError is true. */
  readonly error: string | undefined;
  /** Refetch the staking data. */
  readonly refetch: () => Promise<void>;
  /** Raw React Query result for advanced use cases. */
  readonly query: UseQueryResult<ReadonlyArray<StakingPosition>, Error>;
}

// ---------------------------------------------------------------------------
// Price ID resolution
// ---------------------------------------------------------------------------

/**
 * Get the CoinGecko IDs needed for price lookups based on chain type.
 * The chainId parameter is reserved for future per-chain token mapping.
 */
function getPriceIds(chainType: ChainType, _chainId: number | string): readonly string[] {
  if (chainType === 'evm') {
    // For EVM liquid staking, we need prices for stETH, rETH, cbETH
    return [
      COINGECKO_ID_MAP['evm:steth'] ?? 'staked-ether',
      COINGECKO_ID_MAP['evm:reth'] ?? 'rocket-pool-eth',
      COINGECKO_ID_MAP['evm:cbeth'] ?? 'coinbase-wrapped-staked-eth',
    ];
  }

  if (chainType === 'solana') {
    return [COINGECKO_ID_MAP['solana:native'] ?? 'solana'];
  }

  return [];
}

/**
 * Build a token prices map from price data.
 */
function buildPriceMap(
  priceData: ReadonlyArray<TokenPrice> | undefined,
  chainType: ChainType,
): Readonly<Record<string, number>> {
  const priceMap: Record<string, number> = {};

  if (!priceData) return priceMap;

  if (chainType === 'evm') {
    // Map CoinGecko IDs to token symbols
    const stethPrice = getPriceById(priceData, 'staked-ether');
    const rethPrice = getPriceById(priceData, 'rocket-pool-eth');
    const cbethPrice = getPriceById(priceData, 'coinbase-wrapped-staked-eth');

    if (stethPrice !== undefined) priceMap['steth'] = stethPrice;
    if (rethPrice !== undefined) priceMap['reth'] = rethPrice;
    if (cbethPrice !== undefined) priceMap['cbeth'] = cbethPrice;
  }

  if (chainType === 'solana') {
    const solPrice = getPriceById(priceData, 'solana');
    if (solPrice !== undefined) {
      priceMap['sol'] = solPrice;
      priceMap['solana'] = solPrice;
    }
  }

  return priceMap;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook for fetching staking positions with automatic price enrichment.
 *
 * @param options - Configuration for the staking query.
 * @returns Staking positions with USD values, loading state, and error handling.
 */
export function useStaking(options: UseStakingOptions): UseStakingResult {
  const { address, chainType, chainId, enabled = true } = options;

  // Determine which price IDs we need
  const priceIds = useMemo(
    () => getPriceIds(chainType, chainId),
    [chainType, chainId],
  );

  // Fetch prices
  const {
    data: priceData,
    isLoading: pricesLoading,
  } = usePrices({
    ids: priceIds,
    enabled: enabled && !!address && priceIds.length > 0,
  });

  // Build price map from fetched prices
  const tokenPrices = useMemo(
    () => buildPriceMap(priceData, chainType),
    [priceData, chainType],
  );

  // Fetch staking positions
  const query = useQuery<ReadonlyArray<StakingPosition>, Error>({
    queryKey: [STAKING_QUERY_KEY, chainType, chainId, address],
    queryFn: async (): Promise<ReadonlyArray<StakingPosition>> => {
      if (!address) {
        return [];
      }

      if (chainType === 'evm') {
        const numericChainId =
          typeof chainId === 'number' ? chainId : parseInt(String(chainId), 10);

        if (isNaN(numericChainId)) {
          throw new Error(`Invalid EVM chainId: ${chainId}`);
        }

        const result = await fetchEvmStakingPositions(
          address,
          numericChainId,
          tokenPrices,
        );

        if (!result.ok) {
          throw new Error(result.error.message);
        }

        return result.value;
      }

      if (chainType === 'solana') {
        const solPrice = tokenPrices['sol'] ?? tokenPrices['solana'] ?? 0;
        const result = await fetchSolanaStakingPositions(address, solPrice);

        if (!result.ok) {
          throw new Error(result.error.message);
        }

        return result.value;
      }

      // Unsupported chain type
      return [];
    },
    enabled: enabled && !!address && !pricesLoading,
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    retry: 2,
  });

  // Calculate total staked USD
  const totalStakedUsd = useMemo(() => {
    if (!query.data) return 0;
    return query.data.reduce((sum, pos) => sum + pos.amountStakedUsd, 0);
  }, [query.data]);

  // Build refetch function
  const refetch = async (): Promise<void> => {
    await query.refetch();
  };

  return {
    positions: query.data,
    totalStakedUsd,
    isLoading: query.isLoading || pricesLoading,
    isError: query.isError,
    error: query.error?.message,
    refetch,
    query,
  };
}

// ---------------------------------------------------------------------------
// Multi-chain aggregation hook
// ---------------------------------------------------------------------------

export interface UseAllStakingOptions {
  /** EVM wallet address, if connected. */
  readonly evmAddress?: string;
  /** Solana wallet address, if connected. */
  readonly solanaAddress?: string;
  /** Whether the query is enabled. */
  readonly enabled?: boolean;
}

export interface UseAllStakingResult {
  /** All staking positions across chains. */
  readonly positions: ReadonlyArray<StakingPosition>;
  /** Total staked value in USD across all chains. */
  readonly totalStakedUsd: number;
  /** Whether any chain is loading. */
  readonly isLoading: boolean;
  /** Whether any chain has an error. */
  readonly isError: boolean;
  /** Refetch all chains. */
  readonly refetch: () => Promise<void>;
}

/**
 * Hook for fetching staking positions across multiple chains.
 *
 * @param options - Configuration for multi-chain staking queries.
 * @returns Aggregated staking positions with totals.
 */
export function useAllStaking(options: UseAllStakingOptions): UseAllStakingResult {
  const { evmAddress, solanaAddress, enabled = true } = options;

  const evmStaking = useStaking({
    address: evmAddress,
    chainType: 'evm',
    chainId: 1,
    enabled: enabled && !!evmAddress,
  });

  const solanaStaking = useStaking({
    address: solanaAddress,
    chainType: 'solana',
    chainId: 'solana-mainnet',
    enabled: enabled && !!solanaAddress,
  });

  const positions = useMemo(() => {
    const all: StakingPosition[] = [];
    if (evmStaking.positions) all.push(...evmStaking.positions);
    if (solanaStaking.positions) all.push(...solanaStaking.positions);
    return all;
  }, [evmStaking.positions, solanaStaking.positions]);

  const totalStakedUsd = evmStaking.totalStakedUsd + solanaStaking.totalStakedUsd;

  const refetch = async (): Promise<void> => {
    await Promise.all([evmStaking.refetch(), solanaStaking.refetch()]);
  };

  return {
    positions,
    totalStakedUsd,
    isLoading: evmStaking.isLoading || solanaStaking.isLoading,
    isError: evmStaking.isError || solanaStaking.isError,
    refetch,
  };
}
