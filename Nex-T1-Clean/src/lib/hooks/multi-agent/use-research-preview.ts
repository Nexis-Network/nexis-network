"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchResearchPreview } from "@/lib/api/multi-agent";
import type { ResearchPreviewRequest, ResearchPreviewResponse } from "@/types/multi-agent";

type UseResearchPreviewOptions = {
  input: ResearchPreviewRequest | null;
  enabled?: boolean;
};

export function useResearchPreview({ input, enabled = true }: UseResearchPreviewOptions) {
  return useQuery<ResearchPreviewResponse>({
    queryKey: ["multi-agent", "research-preview", input],
    queryFn: () => {
      if (!input) {
        throw new Error("Research preview input is required.");
      }
      return fetchResearchPreview(input);
    },
    enabled: Boolean(input) && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });
}
