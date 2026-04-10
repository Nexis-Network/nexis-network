"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchRiskPreview } from "@/lib/api/multi-agent";
import type { RiskPreviewRequest, RiskReport } from "@/types/multi-agent";

type UseRiskPreviewOptions = {
  input: RiskPreviewRequest | null;
  enabled?: boolean;
};

export function useRiskPreview({ input, enabled = true }: UseRiskPreviewOptions) {
  return useQuery<RiskReport>({
    queryKey: ["multi-agent", "risk-preview", input],
    queryFn: () => {
      if (!input) {
        throw new Error("Risk preview input is required.");
      }
      return fetchRiskPreview(input);
    },
    enabled: Boolean(input) && enabled,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}
