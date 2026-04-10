"use client";

/**
 * ETH Balance Hook
 * 
 * Domain: Balance
 * Responsibility: Fetch ETH/native balance for the primary chain
 * Depends on: useNexNativeBalance
 */

import { useMemo } from "react";
import { useNexNativeBalance } from "./use-nex-native-balance";

interface UseEthBalanceProps {
  /** Optional chain ID override. If not provided, uses the primary chain */
  chainId?: number;
  /** Address to fetch balance for */
  address?: string;
  /** Whether to enable the query */
  enabled?: boolean;
  /** Refetch interval in milliseconds */
  refetchInterval?: number;
}

/**
 * Hook to fetch native balance for ETH/primary chain
 * 
 * @example
 * ```tsx
 * const { balance, loading, error } = useEthBalance({
 *   address: "0x...",
 * });
 * ```
 */
export function useEthBalance({
  chainId,
  address,
  enabled = true,
  refetchInterval,
}: UseEthBalanceProps) {
  // Resolve chain ID from primary chain if not provided
  const resolvedChainId = useMemo(() => {
    if (chainId) return chainId;
    return 1; // Ethereum mainnet
  }, [chainId]);

  return useNexNativeBalance({
    chainId: resolvedChainId,
    address,
    enabled,
    refetchInterval,
  });
}
