"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/settings/shared/settings-button";
import { Textarea } from "@/components/ui/textarea";
import { usePostInteraction, useRemovePostInteraction, useSocialComments } from "@/lib/hooks/social/use-social-posts";

type SocialCommentsThreadProps = {
  postId: string;
  highlightCommentId?: string | null;
};

export function SocialCommentsThread({ postId, highlightCommentId = null }: SocialCommentsThreadProps) {
  const { data: comments = [], isLoading } = useSocialComments(postId);
  const [draft, setDraft] = useState("");

  const addComment = usePostInteraction();
  const removeComment = useRemovePostInteraction();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.trim()) {
      return;
    }

    try {
      await addComment.mutateAsync({
        postId,
        payload: {
          action: "comment",
          content: draft.trim(),
        },
      });
      setDraft("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to comment");
    }
  };

  const onDelete = async (commentId: string) => {
    try {
      await removeComment.mutateAsync({
        postId,
        payload: {
          action: "comment",
          commentId,
        },
      });
      toast.success("Comment removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove comment");
    }
  };

  useEffect(() => {
    if (!highlightCommentId || comments.length === 0) {
      return;
    }

    const target = document.getElementById(`social-comment-${highlightCommentId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [comments, highlightCommentId]);

  return (
    <div className="space-y-3 rounded-lg border border-[var(--bento-border)] bg-[var(--bento-bg)] p-3">
      <form onSubmit={onSubmit} className="space-y-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a comment"
          className="min-h-[84px]"
          disabled={addComment.isPending}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={addComment.isPending || draft.trim().length === 0}>
            {addComment.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Send className="h-3.5 w-3.5" />
                Comment
              </span>
            )}
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-xs text-[var(--bento-text-muted)]">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-[var(--bento-text-muted)]">No comments yet.</p>
        ) : (
          comments.map((comment) => {
            const display = comment.author.displayName || comment.author.username || "User";
            const isFocusedComment = highlightCommentId === comment.id;
            return (
              <div
                id={`social-comment-${comment.id}`}
                key={comment.id}
                className={`rounded-md border p-2.5 ${
                  isFocusedComment
                    ? "border-white/35 bg-white/[0.08]"
                    : "border-[var(--bento-border)]/80 bg-black/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <Avatar className="h-8 w-8 border border-[var(--bento-border)]">
                      {comment.author.avatarUrl ? <AvatarImage src={comment.author.avatarUrl} alt={display} /> : null}
                      <AvatarFallback>{display.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-medium text-[var(--bento-text-primary)]">{display}</span>
                        <span className="text-[10px] text-[var(--bento-text-muted)]">{formatRelative(comment.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-xs leading-5 text-[var(--bento-text-primary)]/90">
                        {comment.content}
                      </p>
                    </div>
                  </div>

                  {comment.isOwnComment ? (
                    <button
                      type="button"
                      onClick={() => onDelete(comment.id)}
                      className="inline-flex items-center justify-center rounded p-1 text-[var(--bento-text-muted)] transition-colors hover:bg-white/5 hover:text-red-400"
                      aria-label="Delete comment"
                    >
                      {removeComment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
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
