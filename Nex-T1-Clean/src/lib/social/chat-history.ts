import { extractNativeMessageState } from "@/modules/chat/ui-message-parts";

import type {
  SocialConversationSortOrder,
  SocialConversationStatus,
  SocialConversationTimePeriod,
  SocialMessagesConversation,
} from "./types";

type ConversationHistoryFilters = {
  query: string;
  sortOrder: SocialConversationSortOrder;
  status: SocialConversationStatus | "all";
  timePeriod: SocialConversationTimePeriod;
};

type DeriveConversationStatusParams = {
  lastMessageRole: SocialMessagesConversation["lastMessageRole"];
  parts?: Array<unknown> | null;
};

type DerivedStatusSignal = "pending" | "error" | null;

const STATUS_PERIOD_MS: Record<Exclude<SocialConversationTimePeriod, "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

function normalizeStatusSignal(value: unknown): DerivedStatusSignal | "complete" {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  if (
    normalized === "failed" ||
    normalized === "failure" ||
    normalized === "error" ||
    normalized === "errored" ||
    normalized === "denied" ||
    normalized === "input-error" ||
    normalized === "output-error" ||
    normalized === "output-denied" ||
    normalized === "cancelled" ||
    normalized === "canceled"
  ) {
    return "error";
  }

  if (
    normalized === "pending" ||
    normalized === "running" ||
    normalized === "streaming" ||
    normalized === "processing" ||
    normalized === "executing" ||
    normalized === "submitted" ||
    normalized === "routing" ||
    normalized === "in_progress" ||
    normalized === "input-start" ||
    normalized === "input-delta" ||
    normalized === "input-available" ||
    normalized === "input-streaming"
  ) {
    return "pending";
  }

  if (
    normalized === "completed" ||
    normalized === "complete" ||
    normalized === "completing" ||
    normalized === "done" ||
    normalized === "ready" ||
    normalized === "success" ||
    normalized === "output-available"
  ) {
    return "complete";
  }

  return null;
}

function mergeStatusSignals(current: DerivedStatusSignal, next: DerivedStatusSignal | "complete"): DerivedStatusSignal {
  if (current === "error" || next === "error") {
    return "error";
  }

  if (current === "pending" || next === "pending") {
    return "pending";
  }

  return null;
}

function deriveStatusFromRawParts(parts: Array<unknown>): DerivedStatusSignal {
  let signal: DerivedStatusSignal = null;

  for (const part of parts) {
    if (!part || typeof part !== "object") {
      continue;
    }

    const record = part as Record<string, unknown>;
    const type = normalizeString(record.type);

    if (type === "error" || type === "data-tool-error") {
      return "error";
    }

    if (type?.startsWith("tool-")) {
      const toolSignal = normalizeStatusSignal(record.state ?? type.slice("tool-".length));
      signal = mergeStatusSignals(signal, toolSignal);
      continue;
    }

    if (type === "data-status" || type === "data-agent-status") {
      const data = record.data as Record<string, unknown> | undefined;
      signal = mergeStatusSignals(signal, normalizeStatusSignal(data?.status));
      continue;
    }

    if (
      type === "data-artifact-card" ||
      type === "data-ide-session" ||
      type === "data-workflow-canvas" ||
      type === "data-task"
    ) {
      const data = record.data as Record<string, unknown> | undefined;
      signal = mergeStatusSignals(signal, normalizeStatusSignal(data?.status));
      continue;
    }

    if (type === "data-queue") {
      const data = record.data as Record<string, unknown> | undefined;
      const failed = Array.isArray(data?.failed) ? data.failed.length > 0 : false;
      const pending = Array.isArray(data?.pending) ? data.pending.length > 0 : false;

      if (failed) {
        return "error";
      }

      if (pending) {
        signal = "pending";
      }
    }
  }

  return signal;
}

function deriveStatusFromNativeParts(parts: Array<unknown>): DerivedStatusSignal {
  const nativeState = extractNativeMessageState(parts);
  let signal: DerivedStatusSignal = null;

  for (const artifact of nativeState.artifactCards) {
    signal = mergeStatusSignals(signal, normalizeStatusSignal(artifact.status));
    if (signal === "error") {
      return signal;
    }
  }

  signal = mergeStatusSignals(signal, normalizeStatusSignal(nativeState.workflowCanvas?.status));
  if (signal === "error") {
    return signal;
  }

  signal = mergeStatusSignals(signal, normalizeStatusSignal(nativeState.ideSession?.status));
  if (signal === "error") {
    return signal;
  }

  if (nativeState.queue?.failed.length) {
    return "error";
  }

  if (nativeState.queue?.pending.length) {
    signal = "pending";
  }

  if (nativeState.tasks.some((task) => task.status === "error")) {
    return "error";
  }

  if (nativeState.tasks.some((task) => task.status === "pending" || task.status === "in_progress")) {
    signal = "pending";
  }

  if (nativeState.testResults?.items.some((item) => item.status === "fail")) {
    return "error";
  }

  return signal;
}

export function deriveSocialConversationStatus(
  params: DeriveConversationStatusParams,
): SocialConversationStatus {
  const { lastMessageRole, parts } = params;

  if (lastMessageRole !== "assistant") {
    return "in_progress";
  }

  const normalizedParts = Array.isArray(parts) ? parts : [];
  const rawSignal = deriveStatusFromRawParts(normalizedParts);
  if (rawSignal === "error") {
    return "failure";
  }

  const nativeSignal = deriveStatusFromNativeParts(normalizedParts);
  if (nativeSignal === "error") {
    return "failure";
  }

  if (rawSignal === "pending" || nativeSignal === "pending") {
    return "in_progress";
  }

  return "success";
}

export function buildSocialConversationSearchText(
  values: Array<string | null | undefined>,
): string {
  return values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toTimestamp(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function matchesSocialConversationTimePeriod(
  value: string,
  timePeriod: SocialConversationTimePeriod,
  now = Date.now(),
): boolean {
  if (timePeriod === "all") {
    return true;
  }

  const timestamp = toTimestamp(value);
  if (!timestamp) {
    return false;
  }

  return now - timestamp <= STATUS_PERIOD_MS[timePeriod];
}

export function filterSocialMessagesConversations(
  conversations: readonly SocialMessagesConversation[],
  filters: ConversationHistoryFilters,
): SocialMessagesConversation[] {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return [...conversations]
    .filter((conversation) => {
      if (filters.status !== "all" && conversation.status !== filters.status) {
        return false;
      }

      if (!matchesSocialConversationTimePeriod(conversation.lastActivityAt, filters.timePeriod)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return conversation.searchText.includes(normalizedQuery);
    })
    .sort((left, right) => {
      const diff = toTimestamp(left.lastActivityAt) - toTimestamp(right.lastActivityAt);

      if (diff !== 0) {
        return filters.sortOrder === "asc" ? diff : -diff;
      }

      return left.title.localeCompare(right.title);
    });
}
