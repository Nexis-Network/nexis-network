"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthContext } from "@/hooks/auth/use-auth-context";
import type { SocialFollowsResponse } from "@/lib/social/types";

import { fetchApi } from "./fetcher";

export function useSocialFollows(targetUserId?: string, limit = 60) {
  const { status, user } = useAuthContext();
  const enabled = status === "authenticated" && Boolean(user);

  const queryKey = useMemo(
    () => ["social-follows", targetUserId ?? user?.id ?? "me", limit],
    [targetUserId, user?.id, limit],
  );

  return useQuery<SocialFollowsResponse>({
    queryKey,
    queryFn: async () => {
      const query = new URLSearchParams({
        limit: String(limit),
      });
      if (targetUserId) {
        query.set("userId", targetUserId);
      }
      return fetchApi<SocialFollowsResponse>(`/api/social/follows?${query.toString()}`);
    },
    enabled,
    staleTime: 15_000,
  });
}

export function useFollowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { targetUserId: string; follow: boolean }) => {
      const method = params.follow ? "POST" : "DELETE";
      return fetchApi<{ success: boolean }>("/api/social/follows", {
        method,
        body: JSON.stringify({ targetUserId: params.targetUserId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-follows"] });
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      queryClient.invalidateQueries({ queryKey: ["social-profile"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
