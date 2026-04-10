"use client";

/**
 * Native Balance Hook (Nex Implementation)
 * 
 * Fetches native token balance using viem directly.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPublicClient, http, formatUnits, type Chain } from "viem";
import {
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
  bsc,
  avalanche,
  sepolia,
  baseSepolia,
} from "viem/chains";

type UseNexNativeBalanceOptions = {
  chainId?: number | null;
  address?: string | null;
  enabled?: boolean;
  refetchInterval?: number;
};

type UseNexNativeBalanceResult = {
  balance: string | null;
  balanceRaw: bigint | null;
  symbol: string | null;
  decimals: number | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

// Chain lookup
const CHAIN_MAP: Record<number, Chain> = {
  1: mainnet,
  8453: base,
  42161: arbitrum,
  10: optimism,
  137: polygon,
  56: bsc,
  43114: avalanche,
  11155111: sepolia,
  84532: baseSepolia,
};

// Balance cache
const balanceCache = new Map<
  string,
  {
    balance: string;
    balanceRaw: bigint;
    symbol: string;
    decimals: number;
    timestamp: number;
  }
>();

const CACHE_TTL = 30_000; // 30 seconds

export function useNexNativeBalance({
  chainId,
  address,
  enabled = true,
  refetchInterval = 30_000,
}: UseNexNativeBalanceOptions): UseNexNativeBalanceResult {
  const chain = useMemo(() => {
    if (!chainId) return null;
    return CHAIN_MAP[chainId] ?? null;
  }, [chainId]);

  const normalizedAddress = useMemo(
    () => (address ? address.toLowerCase() as `0x${string}` : null),
    [address]
  );

  const cacheKey = useMemo(
    () => (normalizedAddress && chain ? `${chain.id}:${normalizedAddress}` : null),
    [normalizedAddress, chain]
  );

  const [balance, setBalance] = useState<string | null>(null);
  const [balanceRaw, setBalanceRaw] = useState<bigint | null>(null);
  const [symbol, setSymbol] = useState<string | null>(null);
  const [decimals, setDecimals] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!enabled || !chain || !normalizedAddress || !cacheKey) {
      setBalance(null);
      setBalanceRaw(null);
      setSymbol(null);
      setDecimals(null);
      setError(null);
      return;
    }

    // Check cache
    const cached = balanceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setBalance(cached.balance);
      setBalanceRaw(cached.balanceRaw);
      setSymbol(cached.symbol);
      setDecimals(cached.decimals);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const client = createPublicClient({
        chain,
        transport: http(),
      });

      const rawBalance = await client.getBalance({ address: normalizedAddress });
      const chainDecimals = chain.nativeCurrency.decimals;
      const chainSymbol = chain.nativeCurrency.symbol;
      const displayValue = formatUnits(rawBalance, chainDecimals);

      // Update cache
      balanceCache.set(cacheKey, {
        balance: displayValue,
        balanceRaw: rawBalance,
        symbol: chainSymbol,
        decimals: chainDecimals,
        timestamp: Date.now(),
      });

      setBalance(displayValue);
      setBalanceRaw(rawBalance);
      setSymbol(chainSymbol);
      setDecimals(chainDecimals);
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error("Failed to fetch balance");
      setError(nextError);
      setBalance(null);
      setBalanceRaw(null);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, chain, enabled, normalizedAddress]);

  useEffect(() => {
    fetchBalance();

    if (!enabled || !refetchInterval || refetchInterval <= 0) {
      return;
    }

    const interval = setInterval(fetchBalance, refetchInterval);
    return () => clearInterval(interval);
  }, [enabled, fetchBalance, refetchInterval]);

  return {
    balance,
    balanceRaw,
    symbol,
    decimals,
    loading,
    error,
    refetch: fetchBalance,
  };
}

/**
 * Convenience hook for ETH balance on mainnet
 */
export function useEthMainnetBalance(address: string | null | undefined) {
  return useNexNativeBalance({
    chainId: 1,
    address,
    enabled: Boolean(address),
  });
}

/**
 * Convenience hook for ETH balance on Base
 */
export function useBaseBalance(address: string | null | undefined) {
  return useNexNativeBalance({
    chainId: 8453,
    address,
    enabled: Boolean(address),
  });
}



