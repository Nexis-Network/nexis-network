import { redis } from "@/server/services/redis";

const PREFIX = "idem:";

export async function claimIdempotencyKey(key: string, ttlSeconds = 300) {
  const redisKey = `${PREFIX}${key}`;
  try {
    const existing = await redis.get(redisKey);
    if (existing) return { ok: false as const };
    await redis.set(redisKey, "1", { ex: ttlSeconds });
    return { ok: true as const };
  } catch {
    // If Redis is unavailable, fail open to avoid blocking; caller should still rely on DB uniqueness where applicable.
    return { ok: true as const };
  }
}
