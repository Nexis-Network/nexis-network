"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

type UseSuiBalanceOptions = {
  address?: string | null;
  enabled?: boolean;
  refetchInterval?: number;
  rpcUrl?: string;
};

type UseSuiBalanceResult = {
  balance: string | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

const balanceCache = new Map<string, { balance: string; timestamp: number }>();
const CACHE_TTL = 45_000;

export function useSuiBalance({
  address,
  enabled = true,
  refetchInterval = 45_000,
  rpcUrl,
}: UseSuiBalanceOptions): UseSuiBalanceResult {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const normalizedAddress = address?.trim() ?? "";
  const cacheKey = normalizedAddress ? `sui:${normalizedAddress}` : null;

  const client = useMemo(() => {
    const url = rpcUrl?.trim() || getFullnodeUrl("mainnet");
    return new SuiClient({ url });
  }, [rpcUrl]);

  const fetchBalance = useCallback(async () => {
    if (!enabled || !normalizedAddress || !cacheKey) {
      setBalance(null);
      setError(null);
      return;
    }

    const cached = balanceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setBalance(cached.balance);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await client.getBalance({
        owner: normalizedAddress,
      });
      const displayValue = response?.totalBalance ? String(Number(response.totalBalance) / 10 ** 9) : "0";
      balanceCache.set(cacheKey, { balance: displayValue, timestamp: Date.now() });
      setBalance(displayValue);
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error("Failed to fetch SUI balance");
      setError(nextError);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, client, enabled, normalizedAddress]);

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
    loading,
    error,
    refetch: fetchBalance,
  };
}
