"use client";

import { useQuery } from "@tanstack/react-query";

import type { OverviewContributionGraph } from "@/server/settings/overview-activity";

async function fetchOverviewActivity(): Promise<OverviewContributionGraph> {
  const response = await fetch("/api/settings/overview/activity", {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load overview activity");
  }

  const payload = await response.json();
  return payload as OverviewContributionGraph;
}

export function useOverviewActivity() {
  return useQuery({
    queryKey: ["settings-overview-activity"],
    queryFn: fetchOverviewActivity,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
