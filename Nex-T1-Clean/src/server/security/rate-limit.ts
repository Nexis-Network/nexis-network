import { redis, isRedisConfigured } from "@/server/services/redis";


import { logger } from '@/lib/logger';
export type RateLimiter = {
  limit(identifier: string): Promise<LimitResult>;
};

type LimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const DEFAULT_LIMIT = Number.parseInt(process.env.NEX_RATE_LIMIT_MAX ?? "", 10) || 100;
const DEFAULT_WINDOW_MS = parseWindowMs(process.env.NEX_RATE_LIMIT_WINDOW ?? "1h");
const REDIS_LIMIT_TIMEOUT_MS =
  Number.parseInt(process.env.RATE_LIMIT_TIMEOUT_MS ?? "", 10) || 1_200; // fail fast if Redis is slow

function parseWindowMs(window: string): number {
  const m = window.trim().match(/^(\d+)\s*([smhd])$/i);
  if (!m) return 60 * 60 * 1000;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  switch (unit) {
    case "s": return n * 1000;
    case "m": return n * 60 * 1000;
    case "h": return n * 60 * 60 * 1000;
    case "d": return n * 24 * 60 * 60 * 1000;
    default: return 60 * 60 * 1000;
  }
}

class RedisSlidingWindowLimiter implements RateLimiter {
  constructor(private readonly tokens: number, private readonly windowMs: number, private readonly prefix: string) { }

  async limit(identifier: string): Promise<LimitResult> {
    const key = `${this.prefix}:${identifier}`;
    const now = Date.now();
    const ttlSeconds = Math.ceil(this.windowMs / 1000);

    // increment count atomically and set TTL if new
    const count = await redis.hincrby(key, "count", 1);
    // ensure expiry
    await redis.expire?.(key, ttlSeconds);

    const success = count <= this.tokens;
    const remaining = Math.max(this.tokens - count, 0);
    return {
      success,
      limit: this.tokens,
      remaining,
      reset: now + this.windowMs,
    };
  }
}

class InMemoryLimiter implements RateLimiter {
  private store = new Map<string, { count: number; reset: number }>();
  constructor(private readonly tokens: number, private readonly windowMs: number, private readonly prefix: string) { }

  async limit(identifier: string): Promise<LimitResult> {
    const key = `${this.prefix}:${identifier}`;
    const now = Date.now();
    let bucket = this.store.get(key);
    if (!bucket || now >= bucket.reset) {
      bucket = { count: 0, reset: now + this.windowMs };
    }
    if (bucket.count < this.tokens) {
      bucket.count += 1;
    }
    this.store.set(key, bucket);
    const success = bucket.count <= this.tokens;
    const remaining = Math.max(this.tokens - bucket.count, 0);
    return { success, limit: this.tokens, remaining, reset: bucket.reset };
  }
}

export function createSlidingWindowLimiter(
  tokens = DEFAULT_LIMIT,
  windowMs = DEFAULT_WINDOW_MS,
  prefix = "ratelimit",
): RateLimiter {
  const isProd = process.env.NODE_ENV === "production";

  // Primary limiter (Redis) when configured.
  const primary = isRedisConfigured ? new RedisSlidingWindowLimiter(tokens, windowMs, prefix) : null;
  // Always keep a hot in-memory fallback so we can fail open if Redis is slow or unreachable.
  const fallback = new InMemoryLimiter(tokens, windowMs, `${prefix}-mem`);

  if (primary) {
    return {
      async limit(identifier: string): Promise<LimitResult> {
        try {
          return await promiseWithTimeout(primary.limit(identifier), REDIS_LIMIT_TIMEOUT_MS);
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            const message = error instanceof Error ? error.message : String(error);
            logger.warn("[ratelimit] redis fallback engaged", { prefix, message });
          }
          return fallback.limit(identifier);
        }
      },
    };
  }

  if (isProd && process.env.ALLOW_MEMORY_RATE_LIMIT !== "true") {
    // fail-closed in production when Redis is missing and fallback explicitly disallowed
    return {
      async limit(): Promise<LimitResult> {
        return { success: false, limit: 0, remaining: 0, reset: Date.now() + windowMs };
      },
    };
  }

  return fallback;
}

export const otpRateLimit = createSlidingWindowLimiter(10, 60 * 60 * 1000, "otp"); // 10 requests per hour
export const walletChallengeRateLimit = createSlidingWindowLimiter(100, 60 * 60 * 1000, "wallet-challenge"); // 100 requests per hour
export const walletVerifyRateLimit = createSlidingWindowLimiter(20, 60 * 60 * 1000, "wallet-verify"); // 20 requests per hour
export const stripeCheckoutRateLimit = createSlidingWindowLimiter(10, 60 * 60 * 1000, "stripe-checkout"); // 10 checkouts per hour
export const walletProvisionRateLimit = createSlidingWindowLimiter(5, 60 * 60 * 1000, "wallet-provision"); // 5 provisions per hour
export const walletBootstrapRateLimit = createSlidingWindowLimiter(20, 60 * 60 * 1000, "wallet-bootstrap"); // 20 bootstrap triggers per hour
export const swapQuoteRateLimit = createSlidingWindowLimiter(60, 60 * 1000, "swap-quote"); // 60 quotes per minute
export const sessionKeyGrantRateLimit = createSlidingWindowLimiter(10, 60 * 60 * 1000, "session-key-grant"); // 10 grants per hour
export const txExecuteRateLimit = createSlidingWindowLimiter(20, 60 * 60 * 1000, "tx-execute"); // 20 executions per hour
export const cdpBalanceRateLimit = createSlidingWindowLimiter(30, 60 * 1000, "cdp-balance"); // 30 balance checks per minute
export const cdpSpendPermissionRateLimit = createSlidingWindowLimiter(5, 60 * 60 * 1000, "cdp-spend-perm"); // 5 permission changes per hour
export const cdpPolicyRateLimit = createSlidingWindowLimiter(10, 60 * 60 * 1000, "cdp-policy"); // 10 policy changes per hour
export const ensSubnameClaimRateLimit = createSlidingWindowLimiter(10, 60 * 60 * 1000, "ens-subname-claim"); // 10 ENS claim mutations per hour
export const taskScheduleRateLimit = createSlidingWindowLimiter(10, 60 * 60 * 1000, "task-schedule"); // 10 task creations per hour
export const solidityCompileRateLimit = createSlidingWindowLimiter(10, 60 * 60 * 1000, "solidity-compile"); // 10 compilations per hour

export async function checkRateLimit(identifier: string, limiter: RateLimiter) {
  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    headers: {
      "X-RateLimit-Limit": result.limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": result.reset.toString(),
    },
  };
}

function promiseWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Rate limit backend timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}
