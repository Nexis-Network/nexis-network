"use client";

import { Badge } from "@/components/ui/badge";
import type { SocialPostKind } from "@/lib/social/types";

const KIND_LABELS: Record<SocialPostKind, string> = {
  post: "Post",
  prompt_template: "Prompt",
  skill_template: "Skill.md",
};

export function SocialKindBadge({ kind }: { kind: SocialPostKind }) {
  const label = KIND_LABELS[kind] ?? "Post";

  return (
    <Badge variant="outline" className="border-[var(--bento-border)] bg-[var(--bento-bg)] text-[10px] uppercase tracking-[0.08em] text-[var(--bento-text-muted)]">
      {label}
    </Badge>
  );
}
