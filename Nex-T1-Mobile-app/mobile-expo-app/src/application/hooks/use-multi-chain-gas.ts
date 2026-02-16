/**
 * React Query hook for multi-chain gas estimation.
 *
 * Provides unified gas fee estimation across EVM, Solana, and Stellar chains.
 * Automatically fetches the native token price and calculates USD-denominated
 * fee estimates.
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, error } = useMultiChainGas({
 *   chainType: 'evm',
 *   chainId: 1,
 *   enabled: true,
 * });
 *
 * if (data?.chain === 'evm') {
 *   console.log('Standard fee:', data.tiers[1].estimatedFeeUsd);
 * }
 * ```
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
  estimateEvmGas,
  estimateSolanaGas,
  estimateStellarGas,
} from '@infrastructure/wallet/gas-service';
import { usePrices, getPriceById } from '@application/hooks/use-prices';
import { resolveCoinGeckoId } from '@domain/market/entities/price';
import type { GasEstimate } from '@domain/wallet/entities/gas';
import type { ChainType } from '@domain/wallet/entities/wallet';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MULTI_CHAIN_GAS_QUERY_KEY = 'multi-chain-gas';
const STALE_TIME_MS = 10_000;
const REFETCH_INTERVAL_MS = 15_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseMultiChainGasParams {
  /** The type of chain (evm, solana, stellar). */
  readonly chainType: ChainType;
  /** Numeric chain ID for EVM chains (required for EVM, ignored for others). */
  readonly chainId?: number;
  /** Whether to enable the query. Defaults to true. */
  readonly enabled?: boolean;
}

export type UseMultiChainGasReturn = UseQueryResult<GasEstimate, Error>;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetch gas estimates for a given chain.
 *
 * For EVM chains, returns 3 speed tiers (slow, standard, fast).
 * For Solana and Stellar, returns a single estimate.
 *
 * @param params - Chain parameters and query options.
 * @returns React Query result with gas estimate data.
 */
export function useMultiChainGas(params: UseMultiChainGasParams): UseMultiChainGasReturn {
  const { chainType, chainId, enabled = true } = params;

  // Resolve the CoinGecko ID for the native token
  const coinGeckoId = resolveCoinGeckoId(chainType, chainId);
  const priceIds = coinGeckoId ? [coinGeckoId] : [];

  // Fetch the native token price
  const pricesQuery = usePrices({
    ids: priceIds,
    enabled: enabled && priceIds.length > 0,
  });

  const usdPrice = coinGeckoId
    ? getPriceById(pricesQuery.data, coinGeckoId) ?? 0
    : 0;

  // Determine if we can run the gas estimation query
  const canEstimate =
    enabled &&
    (chainType === 'evm' ? typeof chainId === 'number' && chainId > 0 : true) &&
    usdPrice > 0;

  return useQuery<GasEstimate, Error>({
    queryKey: [MULTI_CHAIN_GAS_QUERY_KEY, chainType, chainId, usdPrice],
    queryFn: async (): Promise<GasEstimate> => {
      switch (chainType) {
        case 'evm': {
          if (typeof chainId !== 'number' || chainId <= 0) {
            throw new Error('EVM chain requires a valid numeric chainId');
          }
          const evmResult = await estimateEvmGas(chainId, usdPrice);
          if (!evmResult.ok) {
            throw new Error(evmResult.error.message);
          }
          return evmResult.value;
        }

        case 'solana': {
          const solanaResult = await estimateSolanaGas(usdPrice);
          if (!solanaResult.ok) {
            throw new Error(solanaResult.error.message);
          }
          return solanaResult.value;
        }

        case 'stellar': {
          const stellarResult = await estimateStellarGas(usdPrice);
          if (!stellarResult.ok) {
            throw new Error(stellarResult.error.message);
          }
          return stellarResult.value;
        }

        case 'sui': {
          // SUI is not yet supported in the gas service
          throw new Error('SUI gas estimation is not yet supported');
        }

        default: {
          const _exhaustive: never = chainType;
          throw new Error(`Unknown chain type: ${_exhaustive}`);
        }
      }
    },
    enabled: canEstimate,
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    retry: 2,
  });
}

// ---------------------------------------------------------------------------
// Utility exports
// ---------------------------------------------------------------------------

/**
 * Extract the standard (medium) fee from a gas estimate.
 *
 * For EVM, returns the middle tier. For Solana/Stellar, returns the single estimate.
 *
 * @param estimate - The gas estimate from useMultiChainGas.
 * @returns The fee in USD or undefined if no estimate.
 */
export function getStandardFeeUsd(estimate: GasEstimate | undefined): number | undefined {
  if (!estimate) return undefined;

  switch (estimate.chain) {
    case 'evm':
      // Standard tier is at index 1
      return estimate.tiers[1]?.estimatedFeeUsd;
    case 'solana':
      return estimate.estimate.feeUsd;
    case 'stellar':
      return estimate.estimate.feeUsd;
    default:
      return undefined;
  }
}

/**
 * Format a gas estimate as a human-readable string.
 *
 * @param estimate - The gas estimate from useMultiChainGas.
 * @param speed - For EVM, which speed tier to use. Defaults to 'standard'.
 * @returns Formatted fee string (e.g., "0.001234 ETH (~$2.50)").
 */
export function formatGasEstimate(
  estimate: GasEstimate | undefined,
  speed: 'slow' | 'standard' | 'fast' = 'standard',
): string | undefined {
  if (!estimate) return undefined;

  switch (estimate.chain) {
    case 'evm': {
      const tierIndex = speed === 'slow' ? 0 : speed === 'fast' ? 2 : 1;
      const tier = estimate.tiers[tierIndex];
      if (!tier) return undefined;
      return `${tier.estimatedFeeNative} ETH (~$${tier.estimatedFeeUsd.toFixed(2)})`;
    }
    case 'solana': {
      const { feeSol, feeUsd } = estimate.estimate;
      return `${feeSol} SOL (~$${feeUsd.toFixed(4)})`;
    }
    case 'stellar': {
      const { feeXlm, feeUsd } = estimate.estimate;
      return `${feeXlm} XLM (~$${feeUsd.toFixed(4)})`;
    }
    default:
      return undefined;
  }
}
