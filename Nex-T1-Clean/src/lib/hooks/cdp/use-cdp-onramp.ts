"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Options for the CDP onramp URL request. */
export type CdpOnrampOptions = {
  /** Fiat amount to onramp (e.g. `100`). */
  amount?: number;
  /** Fiat currency code (default: `"USD"`). */
  currency?: string;
  /** Target chain ID (e.g. `8453` for Base). */
  chainId?: number;
};

/** Result from the CDP onramp API endpoint. */
export type CdpOnrampResult = {
  url: string;
};

/* ------------------------------------------------------------------ */
/*  Query key                                                          */
/* ------------------------------------------------------------------ */

const CDP_ONRAMP_KEY = (
  address: string,
  amount?: number,
  currency?: string,
  chainId?: number,
) => ["cdp-onramp", address, amount, currency, chainId] as const;

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

async function fetchCdpOnrampUrl(
  address: string,
  options: CdpOnrampOptions,
  signal?: AbortSignal,
): Promise<CdpOnrampResult> {
  const headers = await getAuthHeaders();

  const params = new URLSearchParams();
  if (typeof options.amount === "number") {
    params.set("amount", String(options.amount));
  }
  if (options.currency) {
    params.set("currency", options.currency);
  }
  if (typeof options.chainId === "number") {
    params.set("chainId", String(options.chainId));
  }

  const query = params.toString();
  const url = `/api/cdp/wallets/${encodeURIComponent(address)}/onramp${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    signal,
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to fetch CDP onramp URL");
  }

  const payload = (await response.json()) as { data?: CdpOnrampResult };
  const data = payload.data;

  if (!data?.url) {
    throw new Error("CDP onramp response missing URL");
  }

  return data;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Fetch a fiat onramp URL for a Nex Wallet address.
 *
 * The returned URL can be opened in a new tab or embedded in an iframe
 * to allow the user to purchase crypto with fiat. The URL is cached for
 * 60 seconds since it does not change frequently.
 *
 * @param address - The wallet address to onramp to. Pass `null` to disable.
 * @param options - Optional amount, currency, and chain configuration.
 *
 * @returns `{ url, isLoading, error }`.
 */
export function useCdpOnramp(
  address: string | null,
  options: CdpOnrampOptions = {},
): {
  url: string | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const query: UseQueryResult<CdpOnrampResult, Error> = useQuery<
    CdpOnrampResult,
    Error
  >({
    queryKey: CDP_ONRAMP_KEY(
      address ?? "",
      options.amount,
      options.currency,
      options.chainId,
    ),
    queryFn: ({ signal }) => fetchCdpOnrampUrl(address!, options, signal),
    enabled: !!address,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    url: query.data?.url,
    isLoading: query.isLoading,
    error: query.error,
  };
}
