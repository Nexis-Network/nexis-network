import { createHash } from "crypto";
import { redis, isRedisConfigured } from "@/server/services/redis";
import type { AutomationState } from "@/modules/chat/automation-preferences";
import type { StructuredChatPayload } from "./types";


import { logger } from '@/lib/logger';
const CACHE_NAMESPACE = "chat:structured-response";
const DEFAULT_TTL_SECONDS = Number(process.env.NEX_CHAT_CACHE_TTL ?? 900);

export type CacheKeyComponents = {
  userId?: string | null;
  route: string;
  profileId: string;
  automation: AutomationState;
  attachmentsSha256?: string | null;
  query: string;
  model: string;
};

export type CacheEligibility = {
  safeToReuse: boolean;
  reason?: string;
};

export const buildChatCacheKey = (components: CacheKeyComponents): string => {
  const payload = {
    ...components,
    automation: components.automation ?? {},
  } satisfies CacheKeyComponents;
  const hash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  return `${CACHE_NAMESPACE}:${hash}`;
};

export const isCacheable = (eligibility: CacheEligibility, attachmentsSha256?: string | null) => {
  // We now allow caching for logged-in users, provided other conditions are met.
  // The 'safeToReuse' flag from the pipeline will now be true for logged-in users
  // if no sensitive/dynamic context that can't be cached is present.

  if (!eligibility.safeToReuse) {
    return false;
  }

  // Never cache when attachments are present (uploaded content can be sensitive or user-specific).
  if (attachmentsSha256 && attachmentsSha256.trim().length > 0) {
    return false;
  }

  return true;
};

export const readChatCache = async (key: string): Promise<StructuredChatPayload | null> => {
  if (!isRedisConfigured) {
    return null;
  }

  try {
    const raw = await redis.get<string | StructuredChatPayload>(key);
    if (!raw) {
      return null;
    }

    if (typeof raw === "object") {
      return raw as StructuredChatPayload;
    }

    return JSON.parse(raw) as StructuredChatPayload;
  } catch (error) {
    logger.error("[chat-cache] read failed", error);
    return null;
  }
};

export const writeChatCache = async (
  key: string,
  payload: StructuredChatPayload,
  ttlSeconds = DEFAULT_TTL_SECONDS,
) => {
  if (!isRedisConfigured) {
    return;
  }

  try {
    const ttl = Math.min(ttlSeconds || DEFAULT_TTL_SECONDS, 3600); // cap at 1 hour
    await redis.setex(key, ttl, JSON.stringify(payload));
  } catch (error) {
    logger.error("[chat-cache] write failed", error);
  }
};
