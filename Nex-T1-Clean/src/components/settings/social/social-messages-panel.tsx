"use client";

import Link from "next/link";
import { ArrowUpRight, MessageSquareText } from "lucide-react";

import { BentoCard } from "@/components/settings/shared/bento-card";
import { SettingsConversationList } from "@/components/settings/social/settings-conversation-list";
import { useSocialMessages } from "@/lib/hooks/social/use-social-messages";

export function SocialMessagesPanel() {
  const { data: conversations = [], isLoading } = useSocialMessages();

  return (
    <BentoCard>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-[var(--bento-text-primary)]">Messages</h3>
          <p className="text-xs text-[var(--bento-text-muted)]">
            Conversation history between you and your agents.
          </p>
        </div>
        <Link
          href="/app"
          className="inline-flex items-center gap-1 text-xs text-[var(--bento-text-muted)] transition-colors hover:text-[var(--bento-text-primary)]"
        >
          Open workspace
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-3 space-y-2">
        {isLoading ? (
          <p className="text-xs text-[var(--bento-text-muted)]">Loading conversation history...</p>
        ) : conversations.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--bento-border)] p-4 text-center">
            <MessageSquareText className="mx-auto h-4 w-4 text-[var(--bento-text-muted)]" />
            <p className="mt-2 text-xs text-[var(--bento-text-muted)]">No conversations yet.</p>
          </div>
        ) : (
          <SettingsConversationList
            conversations={conversations}
            footerHref="/app"
            footerLabel="Start new conversation"
            footerIcon="plus"
          />
        )}
      </div>
    </BentoCard>
  );
}
