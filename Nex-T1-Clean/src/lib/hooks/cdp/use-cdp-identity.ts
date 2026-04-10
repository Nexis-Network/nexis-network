"use client";

import { useQuery } from "@tanstack/react-query";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Resolved identity information for an EVM address. */
export type CdpResolvedIdentity = {
  address: string;
  name: string | null;
  avatar: string | null;
  source: "ens" | "basename" | null;
};

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

const CDP_IDENTITY_KEY = (address: string) =>
  ["cdp-identity", address.toLowerCase()] as const;

/* ------------------------------------------------------------------ */
/*  Fetcher                                                            */
/* ------------------------------------------------------------------ */

async function fetchIdentity(
  address: string,
  signal?: AbortSignal,
): Promise<CdpResolvedIdentity> {
  const url = `/api/cdp/identity/resolve?address=${encodeURIComponent(address)}`;

  const response = await fetch(url, {
    method: "GET",
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || `Failed to resolve identity for ${address}`);
  }

  const payload = (await response.json()) as { data?: CdpResolvedIdentity };
  const data = payload.data;

  if (!data) {
    throw new Error("Identity resolution response missing data");
  }

  return data;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Resolve an EVM address to a human-readable name (ENS or Basename).
 *
 * Uses a 5-minute stale time since names rarely change. The query is
 * disabled when no address is provided.
 *
 * @param address - The EVM address to resolve. Pass `undefined` to disable.
 *
 * @returns `{ name, avatar, source, isLoading }`.
 */
export function useCdpIdentity(address: string | undefined): {
  name: string | null;
  avatar: string | null;
  source: "ens" | "basename" | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery<CdpResolvedIdentity, Error>({
    queryKey: CDP_IDENTITY_KEY(address ?? ""),
    queryFn: ({ signal }) => fetchIdentity(address!, signal),
    enabled: !!address && /^0x[a-fA-F0-9]{40}$/.test(address),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    name: data?.name ?? null,
    avatar: data?.avatar ?? null,
    source: data?.source ?? null,
    isLoading,
  };
}
