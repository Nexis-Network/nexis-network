"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { BentoCard } from "@/components/settings/shared/bento-card";
import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { SocialPostKind } from "@/lib/social/types";
import { useCreateSocialPost } from "@/lib/hooks/social/use-social-posts";

type SocialPostComposerProps = {
  defaultKind?: SocialPostKind;
};

const KIND_META: Record<SocialPostKind, { label: string; placeholder: string }> = {
  post: {
    label: "Post",
    placeholder: "Share an update with your followers...",
  },
  prompt_template: {
    label: "Prompt template",
    placeholder: "Write a reusable prompt template...",
  },
  skill_template: {
    label: "Skill.md template",
    placeholder: "Share a skill.md template...",
  },
};

export function SocialPostComposer({ defaultKind = "post" }: SocialPostComposerProps) {
  const [kind, setKind] = useState<SocialPostKind>(defaultKind);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const createPost = useCreateSocialPost();

  const kindMeta = useMemo(() => KIND_META[kind], [kind]);
  const isTemplate = kind !== "post";
  const isSubmitting = createPost.isPending;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }

    try {
      await createPost.mutateAsync({
        kind,
        title: title.trim() || null,
        content: content.trim(),
      });

      setTitle("");
      setContent("");
      toast.success(`${kindMeta.label} published`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to publish");
    }
  };

  return (
    <BentoCard>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-[var(--bento-text-primary)]">Create post</h3>
          <p className="text-xs text-[var(--bento-text-muted)]">
            Publish updates, prompt templates, and skill.md templates to your profile.
          </p>
        </div>
        <Sparkles className="mt-0.5 h-4 w-4 text-[var(--bento-icon)]" />
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="post-kind">Content type</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as SocialPostKind)}>
              <SelectTrigger id="post-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="post">Post</SelectItem>
                <SelectItem value="prompt_template">Prompt template</SelectItem>
                <SelectItem value="skill_template">Skill.md template</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="post-title">Title {isTemplate ? "(recommended)" : "(optional)"}</Label>
            <Input
              id="post-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              placeholder={isTemplate ? "Give your template a concise title" : "Optional title"}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="post-content">Content</Label>
          <Textarea
            id="post-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-h-[132px]"
            maxLength={10000}
            placeholder={kindMeta.placeholder}
            disabled={isSubmitting}
          />
          <div className="text-right text-[11px] text-[var(--bento-text-muted)]">
            {content.length}/10000
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || content.trim().length === 0}>
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing
              </span>
            ) : (
              `Publish ${kindMeta.label}`
            )}
          </Button>
        </div>
      </form>
    </BentoCard>
  );
}
