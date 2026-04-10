"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  SettingsPage,
  SettingsPageHeader,
} from "@/components/settings-v2/primitives/page";
import { ChatHistoryTable } from "@/components/settings/social/chat-history/chat-history-table";
import { ChatHistoryTableSkeleton } from "@/components/settings/social/chat-history/chat-history-table-skeleton";
import { ChatHistoryToolbar } from "@/components/settings/social/chat-history/chat-history-toolbar";
import { useSocialMessageHistoryFilters } from "@/lib/hooks/social/use-social-message-history-filters";
import { useSocialMessages } from "@/lib/hooks/social/use-social-messages";

export function SocialMessagesPage() {
  const { data: conversations = [], isLoading } = useSocialMessages(80);
  const {
    query,
    sortOrder,
    statusFilter,
    timePeriod,
    filteredConversations,
    hasActiveFilters,
    activeFilterCount,
    setQuery,
    setSortOrder,
    setStatusFilter,
    setTimePeriod,
    resetFilters,
  } = useSocialMessageHistoryFilters(conversations);

  return (
    <SettingsPage>
      <SettingsPageHeader
        title="Messages"
        description="Your conversation history with AI agents and assistants."
        action={
          <Link
            href="/app"
            className="inline-flex items-center gap-1 rounded-[10px] border border-[var(--settings-border)]/8 bg-[var(--settings-surface)] px-3 py-2 text-xs text-[var(--settings-foreground-strong)] transition-colors hover:bg-[var(--settings-elevated)]"
          >
            Open chat workspace
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="space-y-4">
        {!isLoading ? (
          <ChatHistoryToolbar
            query={query}
            sortOrder={sortOrder}
            statusFilter={statusFilter}
            timePeriod={timePeriod}
            resultCount={filteredConversations.length}
            totalCount={conversations.length}
            activeFilterCount={activeFilterCount}
            hasActiveFilters={hasActiveFilters}
            onQueryChange={setQuery}
            onSortOrderChange={setSortOrder}
            onStatusFilterChange={setStatusFilter}
            onTimePeriodChange={setTimePeriod}
            onResetFilters={resetFilters}
          />
        ) : null}

        {isLoading ? (
          <ChatHistoryTableSkeleton />
        ) : (
          <ChatHistoryTable
            conversations={filteredConversations}
            hasFilters={hasActiveFilters}
            paginationKey={`${query}|${sortOrder}|${statusFilter}|${timePeriod}|${filteredConversations.length}`}
            query={query}
          />
        )}
      </div>
    </SettingsPage>
  );
}
