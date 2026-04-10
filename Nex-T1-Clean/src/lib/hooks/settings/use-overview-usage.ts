"use client";

import { useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/api-platform";
import type { SettingsOverviewUsageSummary } from "@/server/settings/overview-usage";

async function fetchOverviewUsage(): Promise<SettingsOverviewUsageSummary> {
  const response = await fetch("/api/settings/overview/usage", {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<SettingsOverviewUsageSummary> | null;
  if (!response.ok || !payload?.success || !payload.data) {
    throw new Error(
      payload?.error?.message ?? `Failed to load overview usage (${response.status})`,
    );
  }

  return payload.data;
}

export function useOverviewUsage() {
  return useQuery({
    queryKey: ["settings-overview-usage"],
    queryFn: fetchOverviewUsage,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
