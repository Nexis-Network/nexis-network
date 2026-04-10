"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthContext } from "@/hooks/auth/use-auth-context";
import { getApiErrorMessage, unwrapApiPayload } from "@/lib/api-platform";
import type { RewardsMutationResult, RewardsSummaryPayload } from "@/lib/rewards/types";

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

function requirePayload<T>(payload: unknown, fallbackMessage: string): T {
  const unwrapped = unwrapApiPayload<T>(payload);
  if (!unwrapped) {
    throw new Error(getApiErrorMessage(payload, fallbackMessage));
  }
  return unwrapped;
}

async function fetchRewardsSummary(): Promise<RewardsSummaryPayload> {
  const response = await fetch("/api/rewards/summary", {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Failed to fetch rewards summary"));
  }

  return requirePayload<RewardsSummaryPayload>(payload, "Invalid rewards summary response");
}

async function postDailyQuestClaim(): Promise<RewardsMutationResult> {
  const response = await fetch("/api/rewards/quests/daily-claim", {
    method: "POST",
    credentials: "include",
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Failed to claim daily quest"));
  }

  return requirePayload<RewardsMutationResult>(payload, "Invalid daily quest claim response");
}

async function postQuestComplete(questCode: string): Promise<RewardsMutationResult> {
  const response = await fetch(`/api/rewards/quests/${encodeURIComponent(questCode)}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({}),
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Failed to complete quest"));
  }

  return requirePayload<RewardsMutationResult>(payload, "Invalid quest completion response");
}

export function useRewardsSummary() {
  const { isAuthenticated } = useAuthContext();
  const canQuery = typeof window !== "undefined" && isAuthenticated;

  return useQuery({
    queryKey: ["rewards", "summary"],
    queryFn: fetchRewardsSummary,
    enabled: canQuery,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useClaimDailyQuestXp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postDailyQuestClaim,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rewards", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["xp", "daily-status"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
      ]);
    },
  });
}

export function useCompleteQuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postQuestComplete,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rewards", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["xp", "daily-status"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
      ]);
    },
  });
}
