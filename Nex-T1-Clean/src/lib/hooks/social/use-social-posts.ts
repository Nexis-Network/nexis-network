"use client";

import { useMemo } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthContext } from "@/hooks/auth/use-auth-context";
import type { SocialComment, SocialPost, SocialPostKind } from "@/lib/social/types";

import { fetchApi } from "./fetcher";

type SocialPostsScope = "me" | "explore" | "following" | "bookmarks" | "shared" | "user";

type UseSocialPostsOptions = {
  scope?: SocialPostsScope;
  kind?: SocialPostKind | "all";
  userId?: string;
  limit?: number;
};

type SocialPostsPage = {
  posts: SocialPost[];
  page: {
    offset: number;
    limit: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
};

type CreatePostPayload = {
  kind: SocialPostKind;
  title?: string | null;
  content: string;
  metadata?: Record<string, UntypedJson>;
};

type InteractionAction = "like" | "bookmark" | "share" | "comment";

type InteractionPayload =
  | { action: "like" }
  | { action: "bookmark" }
  | { action: "share" }
  | { action: "comment"; content: string };

type InteractionDeletePayload =
  | { action: "like" }
  | { action: "bookmark" }
  | { action: "share" }
  | { action: "comment"; commentId: string };

export function useSocialPosts(options: UseSocialPostsOptions = {}) {
  const { status, user } = useAuthContext();
  const enabled = status === "authenticated" && Boolean(user);

  const scope = options.scope ?? "explore";
  const kind = options.kind ?? "all";
  const limit = options.limit ?? 20;

  const queryKey = useMemo(
    () => ["social-posts", scope, kind, options.userId ?? "", limit],
    [scope, kind, options.userId, limit],
  );

  return useQuery<SocialPost[]>({
    queryKey,
    queryFn: async () => {
      const query = new URLSearchParams({
        scope,
        kind,
        limit: String(limit),
      });

      if (options.userId) {
        query.set("userId", options.userId);
      }

      const payload = await fetchApi<{ posts: SocialPost[] }>(`/api/social/posts?${query.toString()}`);
      return payload.posts ?? [];
    },
    enabled,
    staleTime: 10_000,
  });
}

export function useInfiniteSocialPosts(options: UseSocialPostsOptions = {}) {
  const { status, user } = useAuthContext();
  const enabled = status === "authenticated" && Boolean(user);

  const scope = options.scope ?? "explore";
  const kind = options.kind ?? "all";
  const limit = options.limit ?? 20;

  const queryKey = useMemo(
    () => ["social-posts", "infinite", scope, kind, options.userId ?? "", limit],
    [scope, kind, options.userId, limit],
  );

  const query = useInfiniteQuery<SocialPostsPage>({
    queryKey,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = typeof pageParam === "number" && Number.isFinite(pageParam) ? Math.max(0, pageParam) : 0;
      const query = new URLSearchParams({
        scope,
        kind,
        limit: String(limit),
        offset: String(offset),
      });

      if (options.userId) {
        query.set("userId", options.userId);
      }

      return fetchApi<SocialPostsPage>(`/api/social/posts?${query.toString()}`);
    },
    getNextPageParam: (lastPage) => (lastPage.page?.hasMore ? lastPage.page.nextOffset ?? undefined : undefined),
    enabled,
    staleTime: 10_000,
  });

  const posts = useMemo(
    () => query.data?.pages.flatMap((page) => page.posts ?? []) ?? [],
    [query.data?.pages],
  );

  return {
    ...query,
    posts,
  };
}

export function useSocialPost(postId?: string) {
  const { status, user } = useAuthContext();
  const enabled = status === "authenticated" && Boolean(user) && Boolean(postId);

  return useQuery<SocialPost | null>({
    queryKey: ["social-post", postId ?? ""],
    queryFn: async () => {
      if (!postId) {
        return null;
      }
      const payload = await fetchApi<{ post: SocialPost | null }>(`/api/social/posts/${postId}`);
      return payload.post ?? null;
    },
    enabled,
    staleTime: 10_000,
  });
}

export function useCreateSocialPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePostPayload) => {
      return fetchApi<{ post: SocialPost | null }>("/api/social/posts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      queryClient.invalidateQueries({ queryKey: ["social-profile"] });
    },
  });
}

export function usePostInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { postId: string; payload: InteractionPayload }) => {
      return fetchApi<{ success: boolean }>(`/api/social/posts/${params.postId}/interactions`, {
        method: "POST",
        body: JSON.stringify(params.payload),
      });
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      queryClient.invalidateQueries({ queryKey: ["social-post", variables.postId] });
      if (variables.payload.action === "comment") {
        queryClient.invalidateQueries({ queryKey: ["social-comments", variables.postId] });
      }
    },
  });
}

export function useRemovePostInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { postId: string; payload: InteractionDeletePayload }) => {
      return fetchApi<{ success: boolean }>(`/api/social/posts/${params.postId}/interactions`, {
        method: "DELETE",
        body: JSON.stringify(params.payload),
      });
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      queryClient.invalidateQueries({ queryKey: ["social-post", variables.postId] });
      if (variables.payload.action === "comment") {
        queryClient.invalidateQueries({ queryKey: ["social-comments", variables.postId] });
      }
    },
  });
}

export function useSocialComments(postId: string, limit = 120) {
  const { status, user } = useAuthContext();
  const enabled = status === "authenticated" && Boolean(user) && Boolean(postId);

  return useQuery<SocialComment[]>({
    queryKey: ["social-comments", postId, limit],
    queryFn: async () => {
      const payload = await fetchApi<{ comments: SocialComment[] }>(
        `/api/social/posts/${postId}/comments?limit=${limit}`,
      );
      return payload.comments ?? [];
    },
    enabled,
    staleTime: 5_000,
  });
}

export function useDeleteSocialPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      return fetchApi<{ success: boolean }>(`/api/social/posts/${postId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      queryClient.invalidateQueries({ queryKey: ["social-post"] });
      queryClient.invalidateQueries({ queryKey: ["social-profile"] });
    },
  });
}

export function useTogglePostReaction(
  action: Exclude<InteractionAction, "comment">,
) {
  const addMutation = usePostInteraction();
  const removeMutation = useRemovePostInteraction();

  const isPending = addMutation.isPending || removeMutation.isPending;

  const toggle = async (postId: string, active: boolean) => {
    if (active) {
      await removeMutation.mutateAsync({ postId, payload: { action } });
      return;
    }
    await addMutation.mutateAsync({ postId, payload: { action } });
  };

  return {
    toggle,
    isPending,
  };
}
