"use client";

import { useMemo } from "react";

import { useTokenRegistry } from "@/modules/tokens/hooks/use-token-registry";

export function useTokenAssetInfo(assetId?: string | null) {
  const registry = useTokenRegistry({
    includeUnsupported: true,
    includeBroken: true,
    includeBanned: true,
  });

  const token = useMemo(
    () => registry.tokens.find((candidate) => candidate.assetId === assetId) ?? null,
    [assetId, registry.tokens],
  );

  return {
    ...registry,
    token,
  };
}
