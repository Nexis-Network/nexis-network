import "server-only";

import type { ServerRedisClient } from "@/server/services/redis";
import { logger } from "@/lib/logger";

import type { UnifiedMemoryEntry } from "./unified-memory-provider.types";

function buildShortTermKey(userId: string, index: number): string {
  return `memory:${userId}:short_term:${index}`;
}

export async function storeShortTermRedisMemory(args: {
  redisClient: ServerRedisClient;
  userId: string;
  content: string;
  metadata?: Record<string, UntypedJson>;
  ttlSeconds: number;
  maxEntries: number;
}): Promise<boolean> {
  const { redisClient, userId, content, metadata, ttlSeconds, maxEntries } = args;

  try {
    for (let index = maxEntries - 1; index > 0; index -= 1) {
      const previousValue = await redisClient.get<string>(
        buildShortTermKey(userId, index - 1),
      );

      if (!previousValue) {
        await redisClient.del(buildShortTermKey(userId, index));
        continue;
      }

      await redisClient.set(buildShortTermKey(userId, index), previousValue, {
        ex: ttlSeconds,
      });
    }

    await redisClient.set(
      buildShortTermKey(userId, 0),
      JSON.stringify({ content, metadata, createdAt: Date.now() }),
      { ex: ttlSeconds },
    );

    return true;
  } catch (error) {
    logger.error("[UnifiedMemory] Redis store failed:", error);
    return false;
  }
}

export async function fetchRedisContext(args: {
  redisClient: ServerRedisClient | null;
  userId: string;
  maxEntries: number;
}): Promise<UnifiedMemoryEntry[]> {
  const { redisClient, userId, maxEntries } = args;

  if (!redisClient) {
    return [];
  }

  try {
    const entries: UnifiedMemoryEntry[] = [];

    for (let index = 0; index < maxEntries; index += 1) {
      const key = buildShortTermKey(userId, index);
      const value = await redisClient.get<string>(key);
      if (!value) {
        continue;
      }

      try {
        const parsed = JSON.parse(value) as {
          content: string;
          metadata?: Record<string, UntypedJson>;
          createdAt: number;
        };
        entries.push({
          id: key,
          type: "short_term",
          content: parsed.content,
          metadata: parsed.metadata,
          createdAt: parsed.createdAt,
          source: "redis",
          score: 1,
        });
      } catch {
        continue;
      }
    }

    return entries;
  } catch (error) {
    logger.error("[UnifiedMemory] Redis fetch failed:", error);
    return [];
  }
}

export async function clearRedisShortTermMemory(args: {
  redisClient: ServerRedisClient | null;
  userId: string;
  maxEntries: number;
}): Promise<void> {
  const { redisClient, userId, maxEntries } = args;

  if (!redisClient) {
    return;
  }

  try {
    for (let index = 0; index < maxEntries; index += 1) {
      await redisClient.del(buildShortTermKey(userId, index));
    }
  } catch (error) {
    logger.error("[UnifiedMemory] Redis clear failed:", error);
  }
}
