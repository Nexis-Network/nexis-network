"use client";

import { useCallback } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Options for the CDP offramp URL request. */
export type CdpOfframpOptions = {
  /** EVM chain ID (e.g. 8453 for Base). */
  chainId?: number;
  /** Crypto asset to sell (e.g. "ETH", "USDC"). Default: "ETH". */
  asset?: string;
  /** Pre-fill crypto amount to sell. */
  amount?: number;
  /** Target fiat currency (e.g. "USD", "EUR"). Default: "USD". */
  fiatCurrency?: string;
};

/** Result from the CDP offramp API endpoint. */
export type CdpOfframpResult = {
  url: string;
  address: string;
  asset: string;
  expiresAt: string | null;
};

/* ------------------------------------------------------------------ */
/*  Query key                                                          */
/* ------------------------------------------------------------------ */

const CDP_OFFRAMP_KEY = (
  address: string,
  chainId?: number,
  asset?: string,
  amount?: number,
  fiatCurrency?: string,
) =>
  ["cdp-offramp", address, chainId, asset, amount, fiatCurrency] as const;

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
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* ------------------------------------------------------------------ */
/*  Fetcher                                                            */
/* ------------------------------------------------------------------ */

async function fetchCdpOfframpUrl(
  address: string,
  options: CdpOfframpOptions,
  signal?: AbortSignal,
): Promise<CdpOfframpResult> {
  const headers = await getAuthHeaders();

  const params = new URLSearchParams();
  if (typeof options.chainId === "number") {
    params.set("chainId", String(options.chainId));
  }
  if (options.asset) {
    params.set("asset", options.asset);
  }
  if (typeof options.amount === "number") {
    params.set("amount", String(options.amount));
  }
  if (options.fiatCurrency) {
    params.set("fiatCurrency", options.fiatCurrency);
  }

  const query = params.toString();
  const url = `/api/cdp/wallets/${encodeURIComponent(address)}/offramp${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    signal,
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to fetch CDP offramp URL");
  }

  const payload = (await response.json()) as { data?: CdpOfframpResult };
  const data = payload.data;

  if (!data?.url) {
    throw new Error("CDP offramp response missing URL");
  }

  return data;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Fetch a Coinbase Offramp (cash-out) URL for a Nex Wallet address.
 *
 * The returned URL can be opened in a new tab to allow the user to sell
 * crypto for fiat via Coinbase Pay. Requires a linked Coinbase account.
 *
 * @param address - The wallet address to sell from. Pass `undefined` to disable.
 * @param options - Optional chain, asset, amount, and fiat currency configuration.
 *
 * @returns `{ offrampUrl, isLoading, error, openOfframp }`.
 */
export function useCdpOfframp(
  address: string | undefined,
  options: CdpOfframpOptions = {},
): {
  offrampUrl: string | null;
  isLoading: boolean;
  error: string | null;
  openOfframp: () => void;
} {
  const query: UseQueryResult<CdpOfframpResult, Error> = useQuery<
    CdpOfframpResult,
    Error
  >({
    queryKey: CDP_OFFRAMP_KEY(
      address ?? "",
      options.chainId,
      options.asset,
      options.amount,
      options.fiatCurrency,
    ),
    queryFn: ({ signal }) => fetchCdpOfframpUrl(address!, options, signal),
    enabled: !!address,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const openOfframp = useCallback(() => {
    const url = query.data?.url;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, [query.data?.url]);

  return {
    offrampUrl: query.data?.url ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    openOfframp,
  };
}
