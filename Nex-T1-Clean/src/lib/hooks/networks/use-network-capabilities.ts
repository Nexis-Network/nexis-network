"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import type { ResolvedNetworkCapability } from "@/lib/networks/capabilities";

const NETWORK_CAPABILITIES_QUERY_KEY = ["network-capabilities"] as const;

async function fetchNetworkCapabilities(signal?: AbortSignal): Promise<ResolvedNetworkCapability[]> {
  const response = await fetch("/api/networks/capabilities", {
    method: "GET",
    signal,
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load network capabilities");
  }

  const payload = (await response.json()) as {
    data?: { networks?: ResolvedNetworkCapability[] };
  };

  return payload.data?.networks ?? [];
}

export function useNetworkCapabilities(): UseQueryResult<ResolvedNetworkCapability[], Error> {
  return useQuery<ResolvedNetworkCapability[], Error>({
    queryKey: NETWORK_CAPABILITIES_QUERY_KEY,
    queryFn: ({ signal }) => fetchNetworkCapabilities(signal),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
