"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

export type NztRollupBalanceResult = {
  address: string;
  platform: "evm";
  chainId: number;
  native: {
    symbol: string;
    balance: string;
    rawBalance: string;
    usdValue: number | null;
  };
  tokens: [];
  totalUsdValue: number | null;
};

const NZT_ROLLUP_BALANCE_QUERY_KEY = (address: string) => ["nzt-rollup-balance", address] as const;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await createClient().auth.getSession();

  const token = session?.access_token;

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchNztRollupBalance(
  address: string,
  signal?: AbortSignal,
): Promise<NztRollupBalanceResult> {
  const headers = await getAuthHeaders();

  const response = await fetch(
    `/api/rollup/nzt/balance?address=${encodeURIComponent(address)}`,
    {
      method: "GET",
      signal,
      cache: "no-store",
      headers,
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | {
          error?: {
            message?: string;
          };
        }
      | null;

    throw new Error(payload?.error?.message ?? "Failed to fetch NZT rollup balance");
  }

  const payload = (await response.json()) as { data?: NztRollupBalanceResult };
  if (!payload.data) {
    throw new Error("NZT rollup balance response missing data");
  }

  return payload.data;
}

export function useNztRollupBalance(
  address: string | null,
): UseQueryResult<NztRollupBalanceResult, Error> {
  return useQuery<NztRollupBalanceResult, Error>({
    queryKey: NZT_ROLLUP_BALANCE_QUERY_KEY(address ?? ""),
    queryFn: ({ signal }) => fetchNztRollupBalance(address!, signal),
    enabled: Boolean(address),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });
}
