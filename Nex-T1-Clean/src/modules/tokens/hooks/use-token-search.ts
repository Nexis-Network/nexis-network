"use client";

import { useTokenRegistry } from "@/modules/tokens/hooks/use-token-registry";
import type { TokenRegistryQuery } from "@/modules/tokens/types";

export function useTokenSearch(
  search: string,
  query: Omit<TokenRegistryQuery, "search"> = {},
) {
  return useTokenRegistry({
    ...query,
    search,
  });
}
