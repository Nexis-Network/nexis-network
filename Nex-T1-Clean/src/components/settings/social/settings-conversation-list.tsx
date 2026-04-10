import Link from "next/link";
import { ArrowUpRight, ChevronRight, Plus } from "lucide-react";

import type { SocialMessagesConversation } from "@/lib/social/types";
import { cn } from "@/lib/utils";

type ConversationFooterIcon = "open" | "plus";

type SettingsConversationListProps = {
  conversations: readonly SocialMessagesConversation[];
  className?: string;
  footerHref?: string;
  footerLabel?: string;
  footerIcon?: ConversationFooterIcon;
};

const AVATAR_PALETTES = [
  ["#73e0ff", "#142131"],
  ["#ffb06b", "#27150b"],
  ["#8dffcf", "#12231a"],
  ["#f8a7ff", "#26152a"],
  ["#ffe27a", "#2a1c09"],
  ["#9ab0ff", "#151b2d"],
] as const;

export function SettingsConversationList({
  conversations,
  className,
  footerHref,
  footerLabel,
  footerIcon = "open",
}: SettingsConversationListProps) {
  return (
    <div className={cn("flex w-full flex-col items-stretch", className)}>
      {conversations.map((conversation, index) => {
        const badgeLabel = formatConversationBadgeLabel(conversation.model);
        const updatedLabel = formatRelative(conversation.updatedAt);
        const hasFooter = Boolean(footerHref && footerLabel);
        const isFirst = index === 0;
        const isLast = index === conversations.length - 1 && !hasFooter;

        return (
          <Link
            key={conversation.id}
            href={`/app?session=${encodeURIComponent(conversation.id)}`}
            className={cn(
              "group relative flex h-10 w-full items-center gap-[10px] border border-[var(--settings-border-soft)] bg-[var(--settings-card-bg)] backdrop-blur-lg px-[10px] py-[7px] text-left font-[family-name:var(--font-inter)] shadow-none transition-[background-color,border-color,color,transform] hover:border-[var(--settings-border-strong)] hover:bg-[var(--settings-elevated)]",
              index > 0 && "-mt-px",
              isFirst ? "rounded-t-[10px]" : "rounded-t-none",
              isLast ? "rounded-b-[10px]" : "rounded-b-none",
            )}
            title={[updatedLabel, `${conversation.messageCount} messages`, conversation.model].filter(Boolean).join(" · ")}
          >
            <span
              aria-hidden="true"
              className="relative flex size-[18px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--settings-border-soft)] bg-[var(--settings-elevated)] text-[8px] font-semibold uppercase tracking-[0.08em] text-[var(--settings-foreground-strong)]"
            >
              <span className="absolute inset-[1px] rounded-full opacity-95" style={getConversationAvatarStyle(conversation.title)} />
              <span className="absolute inset-0 rounded-full bg-[var(--settings-foreground-strong)]/8" />
              <span className="relative">{getConversationInitials(conversation.title)}</span>
            </span>

            <div className="flex min-w-0 flex-1 items-center gap-[6px]">
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-5 text-[var(--settings-foreground-strong)]">
                {conversation.title}
              </span>
              {badgeLabel ? (
                <span
                  className="inline-flex h-5 max-w-[42%] shrink-0 items-center rounded-full bg-[var(--settings-elevated)] px-2 text-[12px] font-medium leading-4 tracking-[0.03125px] text-[var(--settings-foreground-strong)]"
                  title={conversation.model ?? undefined}
                >
                  <span className="truncate">{badgeLabel}</span>
                </span>
              ) : null}
            </div>

            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center rounded-full transition-colors group-hover:bg-[var(--settings-foreground-strong)]/5"
            >
              <ChevronRight className="size-4 text-[var(--settings-foreground-subtle)] transition-transform duration-150 group-hover:translate-x-0.5" />
            </span>
            <span className="sr-only">
              Updated {updatedLabel}. {conversation.messageCount} messages.
            </span>
          </Link>
        );
      })}

      {footerHref && footerLabel ? (
        <Link
          href={footerHref}
          className={cn(
            "group flex h-10 w-full items-center gap-[10px] border border-[var(--settings-border-soft)] bg-[var(--settings-card-bg)] backdrop-blur-lg px-[10px] py-[7px] font-[family-name:var(--font-inter)] text-[var(--settings-foreground-subtle)] shadow-none transition-[background-color,border-color,color] hover:border-[var(--settings-border-strong)] hover:bg-[var(--settings-elevated)] hover:text-[var(--settings-foreground-strong)]",
            conversations.length > 0 && "-mt-px",
            "rounded-b-[10px]",
          )}
        >
          <span className="flex size-[18px] shrink-0 items-center justify-center">
            {footerIcon === "plus" ? (
              <Plus className="size-[18px]" />
            ) : (
              <ArrowUpRight className="size-[18px]" />
            )}
          </span>
          <span className="truncate text-[14px] font-medium leading-5">{footerLabel}</span>
        </Link>
      ) : null}
    </div>
  );
}

function getConversationInitials(title: string) {
  const segments = title
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (segments.length === 0) return "NX";
  if (segments.length === 1) return segments[0].slice(0, 2).toUpperCase();
  return `${segments[0][0]}${segments[segments.length - 1][0]}`.toUpperCase();
}

function formatConversationBadgeLabel(model: string | null) {
  if (!model) return null;

  const normalized = (model.split("/").pop() ?? model)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return null;

  const humanized = normalized
    .split(" ")
    .map((segment) => {
      if (/^(gpt|claude|gemini)$/i.test(segment)) return segment.toUpperCase();
      if (/^o\d+$/i.test(segment)) return segment.toLowerCase();
      if (/^\d+(\.\d+)?$/i.test(segment)) return segment;
      return segment[0]?.toUpperCase() + segment.slice(1);
    })
    .join(" ");

  return humanized.length > 16 ? `${humanized.slice(0, 15)}…` : humanized;
}

function getConversationAvatarStyle(title: string) {
  const hash = Array.from(title).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const [start, end] = AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
  const angle = 36 + (Math.abs(hash) % 108);

  return {
    backgroundImage: `linear-gradient(${angle}deg, ${start} 0%, ${end} 100%)`,
  };
}

function formatRelative(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";

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
