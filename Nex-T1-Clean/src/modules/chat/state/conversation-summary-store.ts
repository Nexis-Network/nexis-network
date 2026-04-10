import { redis } from "@/server/services/redis";


import { logger } from '@/lib/logger';
const SUMMARY_KEY_PREFIX = "chat:summary:";
const DEFAULT_TTL_SECONDS = 60 * 60 * 6; // 6 hours

export type ConversationSummaryPayload = {
  submissionId: string;
  userId: string;
  query: string;
  response: string;
  model: string;
  promptProfileId?: string;
  createdAt?: string;
};

export async function cacheConversationSummary(
  payload: ConversationSummaryPayload,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
) {
  if (!payload.userId || !payload.submissionId) {
    return;
  }

  const key = `${SUMMARY_KEY_PREFIX}${payload.userId}:${payload.submissionId}`;
  const record = {
    ...payload,
    createdAt: payload.createdAt ?? new Date().toISOString(),
  };

  try {
    await redis.set(key, JSON.stringify(record), { ex: ttlSeconds });
  } catch (error) {
    logger.warn("[chat] Failed to cache conversation summary", { key, error });
  }
}
