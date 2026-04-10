"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthContext } from "@/hooks/auth/use-auth-context";
import type { SocialProfile } from "@/lib/social/types";

import { fetchApi } from "./fetcher";

type SocialProfilePayload = {
  bio?: string | null;
  bannerUrl?: string | null;
};

export function useSocialProfile(userId?: string) {
  const { status, user } = useAuthContext();
  const enabled = status === "authenticated" && Boolean(user);

  const queryKey = useMemo(
    () => ["social-profile", userId ?? user?.id ?? "me"],
    [userId, user?.id],
  );

  return useQuery<SocialProfile>({
    queryKey,
    queryFn: async () => {
      const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
      return fetchApi<SocialProfile>(`/api/social/profile${query}`);
    },
    enabled,
    staleTime: 20_000,
  });
}

export function useUpdateSocialProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SocialProfilePayload) => {
      return fetchApi<SocialProfile>("/api/social/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile-aggregate"] });
    },
  });
}
