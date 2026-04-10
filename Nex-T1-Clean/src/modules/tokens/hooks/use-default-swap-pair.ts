"use client";

import { useMemo } from "react";

import { useTokenRegistry } from "@/modules/tokens/hooks/use-token-registry";

export function useDefaultSwapPair(chainId: number) {
  const registry = useTokenRegistry({ chainId });

  const pair = useMemo(() => {
    const defaultPair = registry.defaultPairs.find((candidate) => candidate.chainId === chainId);
    if (!defaultPair) {
      return null;
    }

    const sellAsset =
      registry.tokens.find((token) => token.assetId === defaultPair.sellAssetId) ?? null;
    const buyAsset =
      registry.tokens.find((token) => token.assetId === defaultPair.buyAssetId) ?? null;

    if (!sellAsset || !buyAsset) {
      return null;
    }

    return { pair: defaultPair, sellAsset, buyAsset };
  }, [chainId, registry.defaultPairs, registry.tokens]);

  return {
    ...registry,
    pair,
  };
}
