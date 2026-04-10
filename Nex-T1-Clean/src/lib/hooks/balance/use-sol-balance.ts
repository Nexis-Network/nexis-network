"use client";

import { useState, useEffect, useCallback } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

interface UseSolBalanceProps {
  connection: UntypedJson;
  publicKey: UntypedJson;
  enabled?: boolean;
  refetchInterval?: number;
}

interface UseSolBalanceReturn {
  balance: string | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Simple in-memory cache with TTL
const balanceCache = new Map<string, { balance: string; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export function useSolBalance({
  connection,
  publicKey,
  enabled = true,
  refetchInterval = 30000,
}: UseSolBalanceProps): UseSolBalanceReturn {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const cacheKey = publicKey?.toBase58() || "";

  const fetchBalance = useCallback(async () => {
    if (!enabled || !connection || !publicKey) {
      setBalance(null);
      setError(null);
      return;
    }

    // Check cache first
    const cached = balanceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setBalance(cached.balance);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const lamports = await connection.getBalance(publicKey);
      
      // Convert lamports to SOL
      const sol = lamports / LAMPORTS_PER_SOL;
      const balanceValue = sol.toString();
      
      // Update cache
      balanceCache.set(cacheKey, {
        balance: balanceValue,
        timestamp: Date.now(),
      });

      setBalance(balanceValue);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch SOL balance");
      setError(error);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, enabled, cacheKey]);

  useEffect(() => {
    fetchBalance();

    // Set up polling
    const interval = refetchInterval > 0 ? setInterval(fetchBalance, refetchInterval) : null;

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [fetchBalance, refetchInterval]);

  return {
    balance,
    loading,
    error,
    refetch: fetchBalance,
  };
}
