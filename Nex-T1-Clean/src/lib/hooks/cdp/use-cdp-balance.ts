"use client";

import { useMemo } from "react";
import {
  useQueries,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";

import {
  CDP_BALANCE_KEY,
  fetchCdpBalance,
} from "./cdp-balance.fetcher";
import type {
  CdpWalletDescriptor,
  WalletBalanceResult,
} from "./cdp-balance.types";

export type {
  CdpTokenBalance,
  CdpWalletDescriptor,
  WalletBalanceResult,
} from "./cdp-balance.types";

export function useCdpBalance(
  address: string | null,
  platform: "evm" | "solana",
  chainId?: number,
): UseQueryResult<WalletBalanceResult, Error> {
  return useQuery<WalletBalanceResult, Error>({
    queryKey: CDP_BALANCE_KEY(address ?? "", platform, chainId),
    queryFn: ({ signal }) =>
      fetchCdpBalance(address!, platform, chainId, signal),
    enabled: !!address,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useCdpAggregatedBalance(wallets: CdpWalletDescriptor[]): {
  balances: WalletBalanceResult[];
  totalUsdValue: number;
  isLoading: boolean;
} {
  const stableWallets = useMemo(
    () =>
      wallets.map((wallet) => ({
        address: wallet.address,
        platform: wallet.platform,
        chainId: wallet.chainId,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(wallets)],
  );

  const results = useQueries({
    queries: stableWallets.map((wallet) => ({
      queryKey: CDP_BALANCE_KEY(
        wallet.address,
        wallet.platform,
        wallet.chainId,
      ),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchCdpBalance(
          wallet.address,
          wallet.platform,
          wallet.chainId,
          signal,
        ),
      enabled: !!wallet.address,
      staleTime: 15_000,
      refetchInterval: 30_000,
      refetchOnWindowFocus: false,
    })),
  });

  const balances = useMemo(
    () =>
      results
        .map((result) => result.data)
        .filter((result): result is WalletBalanceResult => result != null),
    [results],
  );

  const totalUsdValue = useMemo(
    () => balances.reduce((sum, balance) => sum + balance.totalUsdValue, 0),
    [balances],
  );

  const isLoading = results.some((result) => result.isLoading);
  return { balances, totalUsdValue, isLoading };
}

