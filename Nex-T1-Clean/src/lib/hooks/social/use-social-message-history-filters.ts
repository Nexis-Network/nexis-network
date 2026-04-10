"use client";

import { useDeferredValue, useState } from "react";

import { filterSocialMessagesConversations } from "@/lib/social/chat-history";
import type {
  SocialConversationSortOrder,
  SocialConversationStatus,
  SocialConversationTimePeriod,
  SocialMessagesConversation,
} from "@/lib/social/types";

type StatusFilter = SocialConversationStatus | "all";

const DEFAULT_SORT_ORDER: SocialConversationSortOrder = "desc";
const DEFAULT_STATUS_FILTER: StatusFilter = "all";
const DEFAULT_TIME_PERIOD: SocialConversationTimePeriod = "all";

export function useSocialMessageHistoryFilters(
  conversations: readonly SocialMessagesConversation[],
) {
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SocialConversationSortOrder>(DEFAULT_SORT_ORDER);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(DEFAULT_STATUS_FILTER);
  const [timePeriod, setTimePeriod] = useState<SocialConversationTimePeriod>(DEFAULT_TIME_PERIOD);
  const deferredQuery = useDeferredValue(query);

  const filteredConversations = filterSocialMessagesConversations(conversations, {
    query: deferredQuery,
    sortOrder,
    status: statusFilter,
    timePeriod,
  });

  const hasActiveFilters =
    query.trim().length > 0 ||
    sortOrder !== DEFAULT_SORT_ORDER ||
    statusFilter !== DEFAULT_STATUS_FILTER ||
    timePeriod !== DEFAULT_TIME_PERIOD;

  const activeFilterCount =
    (query.trim().length > 0 ? 1 : 0) +
    (sortOrder !== DEFAULT_SORT_ORDER ? 1 : 0) +
    (statusFilter !== DEFAULT_STATUS_FILTER ? 1 : 0) +
    (timePeriod !== DEFAULT_TIME_PERIOD ? 1 : 0);

  return {
    query,
    deferredQuery,
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
    resetFilters() {
      setQuery("");
      setSortOrder(DEFAULT_SORT_ORDER);
      setStatusFilter(DEFAULT_STATUS_FILTER);
      setTimePeriod(DEFAULT_TIME_PERIOD);
    },
  };
}
