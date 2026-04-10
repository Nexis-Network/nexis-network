"use client";

const ACTIVE_STREAM_CONVERSATION_STORAGE_KEY =
  "nex-chat-active-stream-conversation-id";
const LOCAL_CONVERSATION_PREFIX = "local-conversation-";

function normalizeConversationId(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeResumableConversationId(value?: string | null): string | null {
  const normalizedConversationId = normalizeConversationId(value);
  if (!normalizedConversationId) {
    return null;
  }

  return normalizedConversationId.startsWith(LOCAL_CONVERSATION_PREFIX)
    ? null
    : normalizedConversationId;
}

function parseBooleanFlag(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (typeof value !== "string") {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

export function isAiChatResumeEnabled(): boolean {
  return parseBooleanFlag(
    process.env.NEXT_PUBLIC_AI_CHAT_RESUME_ENABLED,
    false,
  );
}

export function readStoredActiveStreamConversationId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return normalizeResumableConversationId(
      window.sessionStorage.getItem(ACTIVE_STREAM_CONVERSATION_STORAGE_KEY),
    );
  } catch {
    return null;
  }
}

export function writeStoredActiveStreamConversationId(
  conversationId: string | null,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const normalizedConversationId =
      normalizeResumableConversationId(conversationId);
    if (normalizedConversationId) {
      window.sessionStorage.setItem(
        ACTIVE_STREAM_CONVERSATION_STORAGE_KEY,
        normalizedConversationId,
      );
      return;
    }

    window.sessionStorage.removeItem(ACTIVE_STREAM_CONVERSATION_STORAGE_KEY);
  } catch {
    // Ignore storage write failures.
  }
}

export function shouldResumeChatStreamOnMount(
  conversationId: string | null,
): boolean {
  const normalizedConversationId =
    normalizeResumableConversationId(conversationId);
  if (!normalizedConversationId || !isAiChatResumeEnabled()) {
    return false;
  }

  return readStoredActiveStreamConversationId() === normalizedConversationId;
}
