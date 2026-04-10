"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Per-network USDC rewards breakdown. */
export type CdpUsdcRewardsNetworkBreakdown = {
  network: string;
  balance: string;
  earned: string;
};

/** USDC rewards information for a Nex Wallet address. */
export type CdpUsdcRewardsInfo = {
  totalEarned: string;
  currentApy: number;
  balance: string;
  lastAccrual: string | null;
  networks: CdpUsdcRewardsNetworkBreakdown[];
};

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

const CDP_USDC_REWARDS_KEY = (address: string) =>
  ["cdp-usdc-rewards", address.toLowerCase()] as const;

/* ------------------------------------------------------------------ */
/*  Auth helper                                                        */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Fetcher                                                            */
/* ------------------------------------------------------------------ */

async function fetchUsdcRewards(
  address: string,
  signal?: AbortSignal,
): Promise<CdpUsdcRewardsInfo> {
  const headers = await getAuthHeaders();
  const url = `/api/cdp/rewards/usdc?address=${encodeURIComponent(address)}`;

  const response = await fetch(url, {
    method: "GET",
    signal,
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || `Failed to fetch USDC rewards for ${address}`);
  }

  const payload = (await response.json()) as { data?: CdpUsdcRewardsInfo };
  const data = payload.data;

  if (!data) {
    throw new Error("USDC rewards response missing data");
  }

  return data;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Fetch USDC rewards information for a Nex Wallet address.
 *
 * Polls every 2 minutes and treats data as stale after 60 seconds.
 * The query is disabled when no address is provided.
 *
 * @param address - The EVM wallet address. Pass `undefined` to disable.
 *
 * @returns `{ data, isLoading, error }`.
 */
export function useCdpUsdcRewards(address: string | undefined): {
  data: CdpUsdcRewardsInfo | null;
  isLoading: boolean;
  error: string | null;
} {
  const { data, isLoading, error } = useQuery<CdpUsdcRewardsInfo, Error>({
    queryKey: CDP_USDC_REWARDS_KEY(address ?? ""),
    queryFn: ({ signal }) => fetchUsdcRewards(address!, signal),
    enabled: !!address && /^0x[a-fA-F0-9]{40}$/.test(address),
    staleTime: 60_000, // 1 minute
    refetchInterval: 120_000, // 2 minutes
    refetchOnWindowFocus: false,
  });

  return {
    data: data ?? null,
    isLoading,
    error: error?.message ?? null,
  };
}
