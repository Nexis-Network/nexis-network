"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/settings/shared/settings-button";
import type { SocialPost } from "@/lib/social/types";

import { SocialPostCard } from "./social-post-card";

type SocialPostFeedProps = {
  posts: SocialPost[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  showAuthor?: boolean;
  focusPostId?: string;
  focusCommentId?: string;
  autoScrollToFocus?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
};

export function SocialPostFeed({
  posts,
  isLoading = false,
  emptyTitle = "No posts yet",
  emptyDescription = "When posts are published they appear here.",
  showAuthor = true,
  focusPostId,
  focusCommentId,
  autoScrollToFocus = false,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
}: SocialPostFeedProps) {
  const focusedPostScrolledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!autoScrollToFocus || !focusPostId || posts.length === 0) {
      return;
    }

    if (focusedPostScrolledRef.current === focusPostId) {
      return;
    }

    const focusInCurrentFeed = posts.some((post) => post.id === focusPostId);
    if (!focusInCurrentFeed) {
      return;
    }

    const targetElement = document.getElementById(`social-post-${focusPostId}`);
    if (!targetElement) {
      return;
    }

    targetElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    focusedPostScrolledRef.current = focusPostId;
  }, [autoScrollToFocus, focusPostId, posts]);

  useEffect(() => {
    if (!focusPostId) {
      focusedPostScrolledRef.current = null;
    }
  }, [focusPostId]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[var(--bento-border)] bg-[var(--bento-bg)] p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[var(--bento-text-muted)]" />
        <p className="mt-3 text-sm text-[var(--bento-text-muted)]">Loading posts...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--bento-border)] bg-[var(--bento-bg)] p-8 text-center">
        <p className="text-sm font-medium text-[var(--bento-text-primary)]">{emptyTitle}</p>
        <p className="mt-1 text-xs text-[var(--bento-text-muted)]">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <SocialPostCard
          key={post.id}
          post={post}
          showAuthor={showAuthor}
          highlightPost={Boolean(focusPostId && post.id === focusPostId)}
          initialCommentsOpen={Boolean(focusPostId && focusCommentId && post.id === focusPostId)}
          highlightCommentId={focusPostId && post.id === focusPostId ? focusCommentId ?? null : null}
        />
      ))}
      {hasMore ? (
        <div className="pt-1">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onLoadMore}
            disabled={isLoadingMore || !onLoadMore}
          >
            {isLoadingMore ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading more
              </span>
            ) : (
              "Load more posts"
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
