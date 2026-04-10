"use client";

import { RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  SocialConversationSortOrder,
  SocialConversationStatus,
  SocialConversationTimePeriod,
} from "@/lib/social/types";

type ChatHistoryToolbarProps = {
  query: string;
  sortOrder: SocialConversationSortOrder;
  statusFilter: SocialConversationStatus | "all";
  timePeriod: SocialConversationTimePeriod;
  resultCount: number;
  totalCount: number;
  activeFilterCount: number;
  hasActiveFilters: boolean;
  onQueryChange: (value: string) => void;
  onSortOrderChange: (value: SocialConversationSortOrder) => void;
  onStatusFilterChange: (value: SocialConversationStatus | "all") => void;
  onTimePeriodChange: (value: SocialConversationTimePeriod) => void;
  onResetFilters: () => void;
};

const CONTROL_CLASS_NAME =
  "h-10 min-w-[150px] rounded-[12px] border border-[var(--settings-border-soft)] bg-[var(--settings-card-bg)] text-sm text-[var(--settings-foreground-strong)] shadow-none";

export function ChatHistoryToolbar({
  query,
  sortOrder,
  statusFilter,
  timePeriod,
  resultCount,
  totalCount,
  activeFilterCount,
  hasActiveFilters,
  onQueryChange,
  onSortOrderChange,
  onStatusFilterChange,
  onTimePeriodChange,
  onResetFilters,
}: ChatHistoryToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Search conversation history</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--settings-foreground-muted)]" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search conversations, models, or recent message text"
            className="h-10 rounded-[12px] border border-[var(--settings-border-soft)] bg-[var(--settings-card-bg)] pl-9 text-sm text-[var(--settings-foreground-strong)] shadow-none placeholder:text-[var(--settings-foreground-muted)]"
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
          <Select value={sortOrder} onValueChange={(value) => onSortOrderChange(value as SocialConversationSortOrder)}>
            <SelectTrigger aria-label="Sort conversations" className={CONTROL_CLASS_NAME}>
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest first</SelectItem>
              <SelectItem value="asc">Oldest first</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as SocialConversationStatus | "all")}>
            <SelectTrigger aria-label="Filter by status" className={CONTROL_CLASS_NAME}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timePeriod} onValueChange={(value) => onTimePeriodChange(value as SocialConversationTimePeriod)}>
            <SelectTrigger aria-label="Filter by time period" className={CONTROL_CLASS_NAME}>
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any time</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="h-10 rounded-[12px] border border-[var(--settings-border-soft)] bg-[var(--settings-card-bg)] px-3 text-[var(--settings-foreground-strong)] hover:bg-[var(--settings-elevated)]"
            >
              <RotateCcw className="size-4" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--settings-foreground-muted)]">
        <p>
          Showing {resultCount} of {totalCount} conversations
        </p>
        {hasActiveFilters ? <p>{activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active</p> : null}
      </div>
    </div>
  );
}
