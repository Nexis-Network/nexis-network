"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuthContext } from "@/hooks/auth/use-auth-context";
import type { SocialMessagesConversation } from "@/lib/social/types";

import { fetchApi } from "./fetcher";

export function useSocialMessages(limit = 50) {
  const { status, user } = useAuthContext();
  const enabled = status === "authenticated" && Boolean(user);

  const queryKey = useMemo(() => ["social-messages", user?.id ?? "guest", limit], [user?.id, limit]);

  return useQuery<SocialMessagesConversation[]>({
    queryKey,
    queryFn: async () => {
      const payload = await fetchApi<{ conversations: SocialMessagesConversation[] }>(
        `/api/social/messages?limit=${limit}`,
      );
      return payload.conversations ?? [];
    },
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}
