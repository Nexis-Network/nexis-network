/**
 * useAllowances Hook
 *
 * React Query hooks for fetching and revoking ERC-20 token allowances.
 * Delegates to the allowance-service for on-chain reads and transaction
 * preparation.
 *
 * - `useAllowances`: Fetches all non-zero allowances for a given owner.
 * - `useRevokeAllowance`: Mutation for preparing revoke transactions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  fetchAllowances,
  revokeAllowance,
  type TokenInfo,
  type RevokeAllowanceResult,
} from '@infrastructure/wallet/allowance-service';
import type { TokenAllowance } from '@domain/wallet/entities/allowance';
import type { WalletError } from '@domain/common/errors/domain-error';

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const ALLOWANCES_QUERY_KEY = 'allowances' as const;

// ---------------------------------------------------------------------------
// useAllowances Hook
// ---------------------------------------------------------------------------

export interface UseAllowancesParams {
  /** The wallet address to check allowances for. */
  readonly ownerAddress: string | undefined;
  /** The EVM chain ID. */
  readonly chainId: number;
  /** List of tokens to check allowances for. */
  readonly tokens: ReadonlyArray<TokenInfo>;
  /** Whether the query should execute. Defaults to true. */
  readonly enabled?: boolean;
}

export interface UseAllowancesReturn {
  /** The fetched allowances, or undefined if loading/error. */
  readonly allowances: ReadonlyArray<TokenAllowance> | undefined;
  /** Whether the query is currently fetching. */
  readonly isLoading: boolean;
  /** Whether the query is fetching for the first time. */
  readonly isPending: boolean;
  /** Whether the query encountered an error. */
  readonly isError: boolean;
  /** The error if the query failed, or null. */
  readonly error: WalletError | null;
  /** Refetch the allowances. */
  readonly refetch: () => Promise<void>;
}

/**
 * Hook for fetching ERC-20 token allowances for a wallet address.
 *
 * Uses React Query for caching, background refetching, and stale-while-revalidate.
 *
 * @example
 * ```tsx
 * const { allowances, isLoading, error } = useAllowances({
 *   ownerAddress: '0x...',
 *   chainId: 1,
 *   tokens: [{ address: '0x...', symbol: 'USDC', decimals: 6 }],
 * });
 * ```
 */
export function useAllowances({
  ownerAddress,
  chainId,
  tokens,
  enabled = true,
}: UseAllowancesParams): UseAllowancesReturn {
  const queryEnabled = enabled && !!ownerAddress && tokens.length > 0;

  const query = useQuery<ReadonlyArray<TokenAllowance>, WalletError>({
    queryKey: [ALLOWANCES_QUERY_KEY, chainId, ownerAddress],
    queryFn: async () => {
      if (!ownerAddress) {
        throw new Error('Owner address is required');
      }

      const result = await fetchAllowances(ownerAddress, chainId, tokens);

      if (!result.ok) {
        throw result.error;
      }

      return result.value;
    },
    enabled: queryEnabled,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });

  const refetch = async (): Promise<void> => {
    await query.refetch();
  };

  return {
    allowances: query.data,
    isLoading: query.isFetching,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error ?? null,
    refetch,
  };
}

// ---------------------------------------------------------------------------
// useRevokeAllowance Hook
// ---------------------------------------------------------------------------

export interface RevokeAllowanceParams {
  /** The EVM chain ID. */
  readonly chainId: number;
  /** The ERC-20 token contract address. */
  readonly tokenAddress: string;
  /** The spender address to revoke. */
  readonly spenderAddress: string;
}

export interface UseRevokeAllowanceReturn {
  /** Execute the revoke mutation. */
  readonly revoke: (params: RevokeAllowanceParams) => Promise<RevokeAllowanceResult>;
  /** Whether the mutation is in progress. */
  readonly isLoading: boolean;
  /** Whether the mutation is pending (not yet started). */
  readonly isPending: boolean;
  /** Whether the mutation encountered an error. */
  readonly isError: boolean;
  /** The error if the mutation failed, or null. */
  readonly error: WalletError | null;
  /** The result of the last successful mutation. */
  readonly data: RevokeAllowanceResult | undefined;
  /** Reset the mutation state. */
  readonly reset: () => void;
}

/**
 * Hook for preparing ERC-20 revoke (approve to 0) transactions.
 *
 * Returns unsigned transaction data; the caller is responsible for
 * signing and broadcasting via wallet-manager.
 *
 * Automatically invalidates allowances queries on success.
 *
 * @example
 * ```tsx
 * const { revoke, isLoading } = useRevokeAllowance();
 *
 * const handleRevoke = async () => {
 *   const result = await revoke({
 *     chainId: 1,
 *     tokenAddress: '0x...',
 *     spenderAddress: '0x...',
 *   });
 *   // result.unsignedTx contains { to, data } for signing
 * };
 * ```
 */
export function useRevokeAllowance(): UseRevokeAllowanceReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation<RevokeAllowanceResult, WalletError, RevokeAllowanceParams>({
    mutationFn: async (params: RevokeAllowanceParams) => {
      const result = await revokeAllowance(
        params.chainId,
        params.tokenAddress,
        params.spenderAddress,
      );

      if (!result.ok) {
        throw result.error;
      }

      return result.value;
    },
    onSuccess: () => {
      // Invalidate all allowances queries to trigger refetch
      void queryClient.invalidateQueries({
        queryKey: [ALLOWANCES_QUERY_KEY],
      });
    },
  });

  const revoke = async (params: RevokeAllowanceParams): Promise<RevokeAllowanceResult> => {
    return mutation.mutateAsync(params);
  };

  return {
    revoke,
    isLoading: mutation.isPending,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error ?? null,
    data: mutation.data,
    reset: mutation.reset,
  };
}
