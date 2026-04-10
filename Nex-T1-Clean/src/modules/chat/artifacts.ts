import { nanoid } from "nanoid";

import { redis, isRedisConfigured } from "@/server/services/redis";


import { logger } from '@/lib/logger';
export type ArtifactJobPayload = {
  userId?: string | null;
  submissionId?: string | null;
  userMessage?: string | null;
  assistantMessage: string;
  modelId: string;
  promptProfileId?: string;
  route: string;
  metadata?: Record<string, UntypedJson>;
  shouldExtractPreferences?: boolean;
};

export const ARTIFACT_QUEUE_KEY = process.env.NEX_ARTIFACT_QUEUE_KEY ?? "queue:chat-artifacts";

export const enqueueArtifactJob = async (payload: ArtifactJobPayload) => {
  if (!isRedisConfigured || !redis.rpush) {
    logger.warn("[chat-artifacts] Redis unavailable; skipping artifact enqueue");
    return;
  }

  const job = {
    id: nanoid(),
    enqueuedAt: new Date().toISOString(),
    ...payload,
  } satisfies ArtifactJobPayload & { id: string; enqueuedAt: string };

  try {
    await redis.rpush(ARTIFACT_QUEUE_KEY, JSON.stringify(job));
  } catch (error) {
    logger.error("[chat-artifacts] failed to enqueue job", error);
  }
};
