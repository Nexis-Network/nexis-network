"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MessageSquareText } from "lucide-react";

import {
  SettingsTable,
  SettingsTableBody,
  SettingsTableCell,
  SettingsTableHead,
  SettingsTableHeader,
  SettingsTableHeaderRow,
  SettingsTablePagination,
  SettingsTableRow,
  SettingsTableShell,
} from "@/components/settings/shared/settings-table";
import type { SocialMessagesConversation } from "@/lib/social/types";

import { ChatHistoryStatusBadge } from "./chat-history-status-badge";

type ChatHistoryTableProps = {
  conversations: readonly SocialMessagesConversation[];
  hasFilters: boolean;
  paginationKey: string;
  query: string;
};

const PAGE_SIZE = 15;

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return DATE_FORMATTER.format(parsed);
}

function formatTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return TIME_FORMATTER.format(parsed);
}

function getPreviewText(conversation: SocialMessagesConversation) {
  if (conversation.lastMessage?.trim()) {
    return conversation.lastMessage;
  }

  if (conversation.status === "in_progress") {
    return "Awaiting the latest assistant response.";
  }

  if (conversation.status === "failure") {
    return "The last assistant response ended in an error state.";
  }

  return "No recent message preview available.";
}

function ChatHistoryEmptyState({
  hasFilters,
  query,
}: Pick<ChatHistoryTableProps, "hasFilters" | "query">) {
  return (
    <SettingsTableShell>
      <div className="border-y border-[var(--settings-border)]/8 px-4 py-14 text-center">
        <MessageSquareText className="mx-auto size-5 text-[var(--settings-foreground-muted)]" />
        <h3 className="mt-4 text-sm font-medium text-[var(--settings-foreground-strong)]">
          {hasFilters ? "No matching conversations" : "No conversations found"}
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--settings-foreground-muted)]">
          {hasFilters
            ? `Try a broader search${query.trim().length > 0 ? ` than "${query.trim()}"` : ""}, or clear one of the active filters.`
            : "Start a conversation in the chat workspace and it will appear here with message preview, activity time, and status."}
        </p>
      </div>
    </SettingsTableShell>
  );
}

export function ChatHistoryTable({
  conversations,
  hasFilters,
  paginationKey,
  query,
}: ChatHistoryTableProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(conversations.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedConversations = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return conversations.slice(start, start + PAGE_SIZE);
  }, [conversations, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [paginationKey]);

  if (conversations.length === 0) {
    return <ChatHistoryEmptyState hasFilters={hasFilters} query={query} />;
  }

  return (
    <SettingsTableShell>
      <SettingsTable className="min-w-[980px]">
        <SettingsTableHeader>
          <SettingsTableHeaderRow>
            <SettingsTableHead>Conversation</SettingsTableHead>
            <SettingsTableHead>Latest message</SettingsTableHead>
            <SettingsTableHead>Messages</SettingsTableHead>
            <SettingsTableHead>Date</SettingsTableHead>
            <SettingsTableHead>Time</SettingsTableHead>
            <SettingsTableHead>Status</SettingsTableHead>
          </SettingsTableHeaderRow>
        </SettingsTableHeader>

        <SettingsTableBody>
          {paginatedConversations.map((conversation) => (
            <SettingsTableRow key={conversation.id}>
              <SettingsTableCell className="align-top">
                <div className="min-w-0 max-w-[260px] space-y-1">
                  <Link
                    href={`/app?session=${encodeURIComponent(conversation.id)}`}
                    className="group inline-flex max-w-full items-center gap-2 text-sm font-normal text-[var(--settings-foreground-strong)] transition-colors hover:text-[var(--settings-accent)]"
                  >
                    <span className="truncate">{conversation.title}</span>
                    <ArrowUpRight className="size-3.5 shrink-0 text-[var(--settings-foreground-muted)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                  <p className="truncate text-xs text-[var(--settings-foreground-muted)]">
                    {conversation.model ?? "Model unavailable"}
                  </p>
                </div>
              </SettingsTableCell>

              <SettingsTableCell className="align-top">
                <p className="max-w-[420px] whitespace-normal text-sm leading-6 text-[var(--settings-foreground-muted)] line-clamp-2">
                  {getPreviewText(conversation)}
                </p>
              </SettingsTableCell>

              <SettingsTableCell className="align-top text-[var(--settings-foreground-strong)]">
                <span className="font-normal tabular-nums">
                  {conversation.messageCount}
                </span>
              </SettingsTableCell>

              <SettingsTableCell className="align-top text-[var(--settings-foreground-strong)]">
                {formatDate(conversation.lastActivityAt)}
              </SettingsTableCell>

              <SettingsTableCell className="align-top">
                {formatTime(conversation.lastActivityAt)}
              </SettingsTableCell>

              <SettingsTableCell className="align-top">
                <ChatHistoryStatusBadge status={conversation.status} />
              </SettingsTableCell>
            </SettingsTableRow>
          ))}
        </SettingsTableBody>
      </SettingsTable>

      {conversations.length > PAGE_SIZE ? (
        <SettingsTablePagination
          page={currentPage}
          pageSize={PAGE_SIZE}
          totalItems={conversations.length}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      ) : null}
    </SettingsTableShell>
  );
}
