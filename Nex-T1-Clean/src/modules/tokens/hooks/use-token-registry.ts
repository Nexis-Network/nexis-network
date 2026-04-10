"use client";

import { useMemo } from "react";
import useSWR from "swr";

import { getApiErrorMessage, unwrapApiPayload } from "@/lib/api-platform";
import { useCustomTokens } from "@/lib/hooks/portfolio/use-custom-tokens";
import { resolveChainId, SOLANA_CHAIN_ID } from "@/modules/tokens/chains";
import { customTokenToAssetInfo } from "@/modules/tokens/registry/custom-tokens";
import type {
  TokenAssetInfo,
  TokenRegistryQuery,
  TokenRegistrySnapshot,
} from "@/modules/tokens/types";

type RegistryPayload = TokenRegistrySnapshot;

const fetcher = async (url: string): Promise<RegistryPayload> => {
  const response = await fetch(url, { credentials: "same-origin" });
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Failed to load token registry"));
  }

  const unwrapped = unwrapApiPayload<RegistryPayload>(payload);
  if (!unwrapped) {
    throw new Error("Token registry payload was empty");
  }

  return unwrapped;
};

function buildRegistryUrl(query: TokenRegistryQuery): string {
  const searchParams = new URLSearchParams();

  if (query.chainId) searchParams.set("chainId", String(query.chainId));
  if (query.search) searchParams.set("search", query.search);
  if (query.includeUnsupported) searchParams.set("includeUnsupported", "true");
  if (query.includeBroken) searchParams.set("includeBroken", "true");
  if (query.includeBanned) searchParams.set("includeBanned", "true");

  const serialized = searchParams.toString();
  return serialized ? `/api/tokens/registry?${serialized}` : "/api/tokens/registry";
}

function toCustomTokenChainId(chainId?: number): string | undefined {
  if (!chainId) {
    return undefined;
  }

  return chainId === SOLANA_CHAIN_ID ? "solana" : String(chainId);
}

function mergeTokens(
  registryTokens: TokenAssetInfo[],
  customTokens: TokenAssetInfo[],
): TokenAssetInfo[] {
  const merged = new Map<string, TokenAssetInfo>();

  for (const token of registryTokens) {
    merged.set(token.assetId, token);
  }

  for (const token of customTokens) {
    merged.set(token.assetId, token);
  }

  return Array.from(merged.values());
}

function matchesSearch(token: TokenAssetInfo, search?: string): boolean {
  if (!search) {
    return true;
  }

  const normalized = search.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return (
    token.symbol.toLowerCase().includes(normalized) ||
    token.name.toLowerCase().includes(normalized) ||
    token.address.toLowerCase() === normalized
  );
}

export function useTokenRegistry(query: TokenRegistryQuery = {}) {
  const url = useMemo(() => buildRegistryUrl(query), [query]);
  const {
    data,
    error: registryError,
    isLoading: registryLoading,
    mutate,
  } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  const {
    customTokens,
    isLoading: customLoading,
    error: customError,
  } = useCustomTokens(toCustomTokenChainId(query.chainId));

  const normalizedCustomTokens = useMemo(() => {
    if (query.includeCustom === false) {
      return [];
    }

    return customTokens
      .map((token) =>
        customTokenToAssetInfo({
          chainId: resolveChainId(token.chain_id) ?? token.chain_id,
          contractAddress: token.contract_address,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          logoUrl: token.logo_url,
        }),
      )
      .filter((token) => !query.chainId || token.chainId === query.chainId)
      .filter((token) => matchesSearch(token, query.search));
  }, [customTokens, query.chainId, query.includeCustom, query.search]);

  const tokens = useMemo(
    () => mergeTokens(data?.tokens ?? [], normalizedCustomTokens),
    [data?.tokens, normalizedCustomTokens],
  );

  return {
    snapshot: data
      ? {
          ...data,
          tokens,
        }
      : null,
    tokens,
    chains: data?.chains ?? [],
    commonBases: data?.commonBases ?? {},
    defaultPairs: data?.defaultPairs ?? [],
    loading: registryLoading || customLoading,
    error:
      (registryError as Error | undefined)?.message ??
      (customError instanceof Error ? customError.message : null),
    mutate,
  };
}
