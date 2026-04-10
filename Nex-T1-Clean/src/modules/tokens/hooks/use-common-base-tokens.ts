"use client";

import { useMemo } from "react";

import { useTokenRegistry } from "@/modules/tokens/hooks/use-token-registry";

export function useCommonBaseTokens(chainId: number) {
  const registry = useTokenRegistry({ chainId });

  const tokens = useMemo(() => {
    const commonBaseIds = registry.commonBases[String(chainId)] ?? [];
    return commonBaseIds
      .map((assetId) => registry.tokens.find((token) => token.assetId === assetId) ?? null)
      .filter((token): token is NonNullable<typeof token> => Boolean(token));
  }, [chainId, registry.commonBases, registry.tokens]);

  return {
    ...registry,
    tokens,
  };
}
