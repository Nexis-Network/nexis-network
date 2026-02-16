/**
 * useNFTs Hook
 *
 * React hook for fetching NFTs owned by a wallet address. Leverages
 * TanStack Query for caching, background refetching, and stale-while-
 * revalidate behaviour.
 *
 * Supports multiple chain types with chain-specific fetching strategies.
 */

import { useQuery } from '@tanstack/react-query';

import type { WalletError } from '@domain/common/errors/domain-error';
import type { NFT } from '@domain/wallet/entities/nft';
import type { ChainType } from '@domain/wallet/entities/wallet';

import { fetchEvmNFTs, fetchSolanaNFTs } from '@infrastructure/wallet/nft-service';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const NFT_KEYS = {
  all: ['nfts'] as const,
  byChain: (chainType: ChainType, chainId: number | string | undefined, address: string) =>
    ['nfts', chainType, chainId, address] as const,
} as const;

// ---------------------------------------------------------------------------
// Cache durations (ms)
// ---------------------------------------------------------------------------

/** NFTs change infrequently, so use longer stale time */
const NFT_STALE_TIME = 60_000; // 1 minute

/** Background refetch interval */
const NFT_REFETCH_INTERVAL = 120_000; // 2 minutes

// ---------------------------------------------------------------------------
// Hook params
// ---------------------------------------------------------------------------

export interface UseNFTsParams {
  /** Wallet address to fetch NFTs for */
  readonly address: string | undefined;
  /** Chain type (evm, solana, etc.) */
  readonly chainType: ChainType;
  /** Chain ID (numeric for EVM, optional for other chains) */
  readonly chainId?: number | string | undefined;
  /** Whether the query is enabled */
  readonly enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface UseNFTsReturn {
  /** List of NFTs owned by the address */
  readonly nfts: ReadonlyArray<NFT>;
  /** Whether NFTs are currently loading */
  readonly isLoading: boolean;
  /** Whether the initial fetch is in progress */
  readonly isFetching: boolean;
  /** Error from the last fetch attempt */
  readonly error: WalletError | null;
  /** Whether the query is enabled and has data */
  readonly isSuccess: boolean;
  /** Refetch NFTs manually */
  readonly refetch: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches NFTs for a wallet address on a specific chain.
 *
 * @example
 * ```tsx
 * const { nfts, isLoading, error } = useNFTs({
 *   address: wallet.address,
 *   chainType: 'evm',
 *   chainId: 1, // Ethereum mainnet
 *   enabled: !!wallet,
 * });
 * ```
 */
export function useNFTs({
  address,
  chainType,
  chainId,
  enabled = true,
}: UseNFTsParams): UseNFTsReturn {
  const queryKey = NFT_KEYS.byChain(chainType, chainId, address ?? '');

  const query = useQuery<ReadonlyArray<NFT>, WalletError>({
    queryKey,
    queryFn: async (): Promise<ReadonlyArray<NFT>> => {
      if (!address) {
        return [];
      }

      let result;

      switch (chainType) {
        case 'evm': {
          if (typeof chainId !== 'number') {
            throw new Error('chainId must be a number for EVM chains');
          }
          result = await fetchEvmNFTs(address, chainId);
          break;
        }
        case 'solana': {
          result = await fetchSolanaNFTs(address);
          break;
        }
        case 'sui':
        case 'stellar': {
          // Not yet supported; return empty array
          return [];
        }
        default: {
          const _exhaustive: never = chainType;
          throw new Error(`Unsupported chain type: ${String(_exhaustive)}`);
        }
      }

      // Throw on failure for React Query error handling
      if (!result.ok) {
        throw result.error;
      }

      return result.value;
    },
    enabled: enabled && !!address,
    staleTime: NFT_STALE_TIME,
    refetchInterval: NFT_REFETCH_INTERVAL,
  });

  const refetch = async (): Promise<void> => {
    await query.refetch();
  };

  return {
    nfts: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ?? null,
    isSuccess: query.isSuccess,
    refetch,
  };
}
