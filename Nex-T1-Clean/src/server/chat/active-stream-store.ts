import { nanoid } from "nanoid";

import { redis } from "@/server/services/redis";

const ACTIVE_STREAM_KEY_PREFIX = "chat:active-stream:";
const ACTIVE_STREAM_TTL_SECONDS = 60 * 60;

function getActiveStreamKey(conversationId: string): string {
  return `${ACTIVE_STREAM_KEY_PREFIX}${conversationId}`;
}

export function createChatResumableStreamId(conversationId: string): string {
  return `chat-stream:${conversationId}:${nanoid()}`;
}

export async function getActiveChatStreamId(
  conversationId: string,
): Promise<string | null> {
  const normalizedConversationId = conversationId.trim();
  if (!normalizedConversationId) {
    return null;
  }

  const value = await redis.get<string>(getActiveStreamKey(normalizedConversationId));
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function setActiveChatStreamId(
  conversationId: string,
  streamId: string,
): Promise<void> {
  const normalizedConversationId = conversationId.trim();
  const normalizedStreamId = streamId.trim();
  if (!normalizedConversationId || !normalizedStreamId) {
    return;
  }

  await redis.set(getActiveStreamKey(normalizedConversationId), normalizedStreamId, {
    ex: ACTIVE_STREAM_TTL_SECONDS,
  });
}

export async function clearActiveChatStreamId(
  conversationId: string,
  expectedStreamId?: string | null,
): Promise<boolean> {
  const normalizedConversationId = conversationId.trim();
  if (!normalizedConversationId) {
    return false;
  }

  const key = getActiveStreamKey(normalizedConversationId);
  if (expectedStreamId) {
    const currentStreamId = await redis.get<string>(key);
    if (typeof currentStreamId === "string" && currentStreamId !== expectedStreamId) {
      return false;
    }
  }

  await redis.del(key);
  return true;
}
