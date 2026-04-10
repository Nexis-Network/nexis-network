"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bookmark, Heart, Loader2, MessageSquare, Repeat2, Trash2, UserPlus, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";

import { BentoCard } from "@/components/settings/shared/bento-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/settings/shared/settings-button";
import { useDeleteSocialPost, useTogglePostReaction } from "@/lib/hooks/social/use-social-posts";
import { useFollowMutation } from "@/lib/hooks/social/use-social-follows";
import type { SocialPost } from "@/lib/social/types";

import { SocialCommentsThread } from "./social-comments-thread";
import { SocialKindBadge } from "./social-kind-badge";

type SocialPostCardProps = {
  post: SocialPost;
  showAuthor?: boolean;
  initialCommentsOpen?: boolean;
  highlightCommentId?: string | null;
  highlightPost?: boolean;
};

export function SocialPostCard({
  post,
  showAuthor = true,
  initialCommentsOpen = false,
  highlightCommentId = null,
  highlightPost = false,
}: SocialPostCardProps) {
  const [commentsOpen, setCommentsOpen] = useState(initialCommentsOpen);

  const likeToggle = useTogglePostReaction("like");
  const bookmarkToggle = useTogglePostReaction("bookmark");
  const shareToggle = useTogglePostReaction("share");
  const deletePost = useDeleteSocialPost();
  const followMutation = useFollowMutation();

  const displayName = useMemo(
    () => post.author.displayName || post.author.username || "User",
    [post.author.displayName, post.author.username],
  );
  const sharedByDisplayName = useMemo(() => {
    if (!post.sharedContext) {
      return null;
    }
    return (
      post.sharedContext.user.displayName
      || post.sharedContext.user.username
      || "User"
    );
  }, [post.sharedContext]);
  const profileHref = post.viewer.isOwnPost
    ? "/settings/profile"
    : `/settings/profile?userId=${encodeURIComponent(post.authorId)}`;
  const sharedByProfileHref = post.sharedContext
    ? post.sharedContext.isViewerShare
      ? "/settings/profile"
      : `/settings/profile?userId=${encodeURIComponent(post.sharedContext.userId)}`
    : null;

  const onToggleLike = async () => {
    try {
      await likeToggle.toggle(post.id, post.viewer.liked);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update like");
    }
  };

  const onToggleBookmark = async () => {
    try {
      await bookmarkToggle.toggle(post.id, post.viewer.bookmarked);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update bookmark");
    }
  };

  const onToggleShare = async () => {
    try {
      await shareToggle.toggle(post.id, post.viewer.shared);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update share");
    }
  };

  const onDeletePost = async () => {
    try {
      await deletePost.mutateAsync(post.id);
      toast.success("Post removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove post");
    }
  };

  const onToggleFollow = async () => {
    try {
      await followMutation.mutateAsync({
        targetUserId: post.authorId,
        follow: !post.viewer.isFollowingAuthor,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update follow status");
    }
  };

  const reactionsBusy = likeToggle.isPending || bookmarkToggle.isPending || shareToggle.isPending;

  useEffect(() => {
    if (initialCommentsOpen) {
      setCommentsOpen(true);
    }
  }, [initialCommentsOpen]);

  return (
    <div
      id={`social-post-${post.id}`}
      data-social-post-id={post.id}
      className={
        highlightPost
          ? "scroll-mt-28 rounded-xl ring-2 ring-[#1A76FF]/60 ring-offset-2 ring-offset-transparent"
          : "scroll-mt-28"
      }
    >
      <BentoCard className="space-y-3">
        {post.sharedContext ? (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--bento-text-muted)]">
            <Repeat2 className="h-3.5 w-3.5" />
            {sharedByDisplayName && sharedByProfileHref ? (
              <Link href={sharedByProfileHref} className="font-medium text-[var(--bento-text-primary)] hover:underline">
                {sharedByDisplayName}
              </Link>
            ) : (
              <span className="font-medium text-[var(--bento-text-primary)]">
                {sharedByDisplayName ?? "User"}
              </span>
            )}
            <span>shared this</span>
            <span>{formatRelative(post.sharedContext.sharedAt)}</span>
          </div>
        ) : null}

        {showAuthor ? (
          <div className="flex items-start justify-between gap-3">
            <Link href={profileHref} className="flex min-w-0 items-center gap-3 rounded-md p-1 transition-colors hover:bg-white/5">
              <Avatar className="h-10 w-10 border border-[var(--bento-border)]">
                {post.author.avatarUrl ? <AvatarImage src={post.author.avatarUrl} alt={displayName} /> : null}
                <AvatarFallback>{displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--bento-text-primary)]">{displayName}</p>
                <div className="flex items-center gap-2 text-xs text-[var(--bento-text-muted)]">
                  {post.author.username ? <span>@{post.author.username}</span> : null}
                  <span>{formatRelative(post.createdAt)}</span>
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <SocialKindBadge kind={post.kind} />
              {!post.viewer.isOwnPost ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  onClick={onToggleFollow}
                  disabled={followMutation.isPending}
                >
                  {followMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : post.viewer.isFollowingAuthor ? (
                    <UserRoundCheck className="h-3.5 w-3.5" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  {post.viewer.isFollowingAuthor ? "Following" : "Follow"}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={onDeletePost}
                  disabled={deletePost.isPending}
                  aria-label="Delete post"
                >
                  {deletePost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <SocialKindBadge kind={post.kind} />
            <span className="text-xs text-[var(--bento-text-muted)]">{formatRelative(post.createdAt)}</span>
          </div>
        )}

        {post.title ? <h4 className="text-sm font-semibold text-[var(--bento-text-primary)]">{post.title}</h4> : null}

        {post.kind === "skill_template" ? (
          <pre className="overflow-x-auto rounded-lg border border-[var(--bento-border)] bg-black/20 p-3 text-xs leading-5 text-[var(--bento-text-primary)]">
            <code>{post.content}</code>
          </pre>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--bento-text-primary)]/95">{post.content}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <ReactionButton
            active={post.viewer.liked}
            label="Like"
            count={post.stats.likes}
            icon={<Heart className="h-4 w-4" />}
            onClick={onToggleLike}
            disabled={reactionsBusy}
          />
          <ReactionButton
            active={post.viewer.bookmarked}
            label="Bookmark"
            count={post.stats.bookmarks}
            icon={<Bookmark className="h-4 w-4" />}
            onClick={onToggleBookmark}
            disabled={reactionsBusy}
          />
          <ReactionButton
            active={post.viewer.shared}
            label="Share"
            count={post.stats.shares}
            icon={<Repeat2 className="h-4 w-4" />}
            onClick={onToggleShare}
            disabled={reactionsBusy}
          />
          <ReactionButton
            active={commentsOpen}
            label="Comments"
            count={post.stats.comments}
            icon={<MessageSquare className="h-4 w-4" />}
            onClick={() => setCommentsOpen((value) => !value)}
          />
        </div>

        {commentsOpen ? (
          <SocialCommentsThread postId={post.id} highlightCommentId={highlightCommentId} />
        ) : null}
      </BentoCard>
    </div>
  );
}

type ReactionButtonProps = {
  active?: boolean;
  label: string;
  count: number;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
};

function ReactionButton({ active = false, label, count, icon, onClick, disabled }: ReactionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors ${
        active
          ? "border-white/25 bg-white/10 text-[var(--bento-text-primary)]"
          : "border-[var(--bento-border)] bg-transparent text-[var(--bento-text-muted)] hover:border-white/20 hover:text-[var(--bento-text-primary)]"
      }`}
      aria-label={label}
    >
      {icon}
      <span>{count}</span>
    </button>
  );
}

function formatRelative(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
