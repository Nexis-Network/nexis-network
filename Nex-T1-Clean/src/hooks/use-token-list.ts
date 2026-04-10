"use client";

import { useMemo } from "react";

import { useTokenRegistry } from "@/modules/tokens/hooks/use-token-registry";
import { isTokenSelectable } from "@/modules/tokens/utils/warnings";
import type { TokenInfo } from "@/stores/use-swap-store";

export interface TokenListState {
  tokens: TokenInfo[];
  loading: boolean;
  error: string | null;
}

export function useTokenList(): TokenListState & {
  addCustomToken: (_token: TokenInfo) => void;
} {
  const registry = useTokenRegistry({
    includeCustom: true,
  });

  const tokens = useMemo(
    () => registry.tokens.filter((token) => isTokenSelectable(token)) as TokenInfo[],
    [registry.tokens],
  );

  return {
    tokens,
    loading: registry.loading,
    error: registry.error,
    addCustomToken: () => {
      // Legacy compatibility only. Manual imports are selected directly by the caller.
    },
  };
}
