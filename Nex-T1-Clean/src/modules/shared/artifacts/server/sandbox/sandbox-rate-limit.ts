import { logger } from "@/lib/logger";
import { isRedisConfigured, redis } from "@/server/services/redis";

const RATE_LIMIT_WINDOW_SECONDS = 3600;
const RATE_LIMIT_MAX_SANDBOXES = 20;
const CONCURRENT_SANDBOX_LIMIT = 5;

export type SandboxRateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export async function checkSandboxRateLimit(
  userId: string,
): Promise<SandboxRateLimitResult> {
  if (!isRedisConfigured) {
    logger.warn("[sandbox] Rate limiting disabled - Redis not configured");
    return { allowed: true, remaining: RATE_LIMIT_MAX_SANDBOXES, resetAt: 0 };
  }

  const key = `sandbox:rate:${userId}`;
  const count = await redis!.incr(key);

  if (count === 1 && redis?.expire) {
    await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
  }

  const ttl = redis ? await redis.ttl(key) : 0;
  return {
    allowed: count <= RATE_LIMIT_MAX_SANDBOXES,
    remaining: Math.max(0, RATE_LIMIT_MAX_SANDBOXES - count),
    resetAt: Date.now() + ttl * 1000,
  };
}

export async function trackActiveSandbox(
  userId: string,
  sandboxId: string,
): Promise<boolean> {
  if (!isRedisConfigured) {
    return true;
  }

  const key = `sandbox:active:${userId}`;
  const activeCount = await redis!.scard(key);
  if (activeCount >= CONCURRENT_SANDBOX_LIMIT) {
    return false;
  }

  await redis!.sadd(key, sandboxId);
  if (redis?.expire) {
    await redis.expire(key, 3600);
  }
  return true;
}

export function getConcurrentSandboxLimit(): number {
  return CONCURRENT_SANDBOX_LIMIT;
}
