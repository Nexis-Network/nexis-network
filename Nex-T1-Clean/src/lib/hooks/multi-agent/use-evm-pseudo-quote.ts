"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchEvmPseudoQuote } from "@/lib/api/multi-agent";
import type { EvmPseudoQuoteRequest, TradeQuote } from "@/types/multi-agent";

type UseEvmPseudoQuoteOptions = {
  input: EvmPseudoQuoteRequest | null;
  enabled?: boolean;
};

export function useEvmPseudoQuote({ input, enabled = true }: UseEvmPseudoQuoteOptions) {
  return useQuery<TradeQuote>({
    queryKey: ["multi-agent", "evm-quote", input],
    queryFn: () => {
      if (!input) {
        throw new Error("Quote input is required.");
      }
      return fetchEvmPseudoQuote(input);
    },
    enabled: Boolean(input) && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}
