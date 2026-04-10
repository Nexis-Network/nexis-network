import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { getErrorMessage } from "@/lib/utils/error";
import { redis, isRedisInMemoryFallback } from "@/server/services/redis";
import { metrics } from "@/server/instrumentation/metrics";
import { withTimeoutFallback, withTimeoutFallbackResult } from "@/lib/utils/timeout";


import { logger } from '@/lib/logger';
/**
 * Session deduplication TTL in seconds.
 * Sessions won't be re-recorded within this window for the same user+token.
 * Set to 1 hour to balance deduplication with fresh session tracking.
 */
const SESSION_DEDUP_TTL_SECONDS = 3600;
const SESSION_LOG_TIMEOUT_MS = Number(process.env.SESSION_LOG_TIMEOUT_MS ?? 1500);
const SESSION_LOG_DRAIN_BATCH = Math.max(1, Number(process.env.SESSION_LOG_DRAIN_BATCH ?? 50));
const SESSION_LOG_DEADLETTER_KEY = "session:deadletter";

/**
 * In-memory fallback for development/testing ONLY.
 * This is NOT safe for horizontally scaled production environments.
 * Each pod/function instance maintains its own state.
 */
const inMemoryDedupCache = new Map<string, number>();
let drainInProgress = false;
let drainScheduled = false;
let drainRescheduleRequested = false;

type LogSessionParams = {
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
  tokenHash?: string | null;
};

async function enqueueForRetry(params: LogSessionParams, reason: string): Promise<void> {
  try {
    await withTimeoutFallback(
      redis.sadd(SESSION_LOG_DEADLETTER_KEY, JSON.stringify({ ...params, reason, queuedAt: Date.now() })),
      {
        timeoutMs: 2000,
        fallback: () => 0,
        scope: "session_log_enqueue",
      }
    ); metrics.vendorCall("session_log_enqueue", true);
  } catch (error) {
    metrics.vendorCall("session_log_enqueue", false);
    if (process.env.NODE_ENV !== "production") {
      logger.warn("session_log_enqueue_failed", getErrorMessage(error, "redis_error"));
    }
  }
}

async function drainQueuedSessions(limit = SESSION_LOG_DRAIN_BATCH): Promise<void> {
  if (drainInProgress) return;
  drainInProgress = true;
  drainRescheduleRequested = false;

  try {
    const entries = await redis.smembers(SESSION_LOG_DEADLETTER_KEY);
    if (!entries?.length) {
      return;
    }

    let processed = 0;
    const batch = entries.slice(0, limit);

    for (const raw of batch) {
      let parsed: LogSessionParams | null = null;
      try {
        parsed = JSON.parse(raw) as LogSessionParams;
      } catch {
        // Skip malformed entries
        await redis.srem(SESSION_LOG_DEADLETTER_KEY, raw);
        continue;
      }

      const outcome = await persistSession(parsed, { source: "drain" });
      if (outcome === "ok") {
        await redis.srem(SESSION_LOG_DEADLETTER_KEY, raw);
        processed += 1;
      }
    }

    if (processed > 0) {
      metrics.vendorCall("session_log_drain", true);
    }

    if (entries.length > batch.length) {
      // More to drain; schedule another pass without blocking the caller.
      scheduleDrainQueuedSessions();
    }
  } catch (error) {
    metrics.vendorCall("session_log_drain", false);
    if (process.env.NODE_ENV !== "production") {
      logger.warn("session_log_drain_failed", getErrorMessage(error, "redis_error"));
    }
  } finally {
    drainInProgress = false;
  }
}

function scheduleDrainQueuedSessions() {
  if (drainInProgress) {
    drainRescheduleRequested = true;
    return;
  }

  if (drainScheduled) return;
  drainScheduled = true;
  setTimeout(() => {
    void drainQueuedSessions().finally(() => {
      drainScheduled = false;
      if (drainRescheduleRequested) {
        drainRescheduleRequested = false;
        scheduleDrainQueuedSessions();
      }
    });
  }, 0);
}

/**
 * Check if we've recently recorded this session using Redis SETNX.
 * Returns true if this is a new session (should record), false if duplicate.
 */
async function tryAcquireSessionSlot(dedupKey: string): Promise<boolean> {
  const redisKey = `session:dedup:${dedupKey}`;

  // If Redis is available, use atomic SETNX for distributed deduplication
  if (!isRedisInMemoryFallback) {
    try {
      const acquired = await withTimeoutFallback(
        redis.trySetNx(redisKey, "1", SESSION_DEDUP_TTL_SECONDS),
        {
          timeoutMs: 2000,
          fallback: () => true, // Fail open: allow insert if Redis is slow
          scope: "session_dedup_redis",
        }
      ); return acquired;
    } catch (error) {
      // If Redis fails, log but don't block the session insert
      // Better to have duplicate sessions than no session tracking
      if (process.env.NODE_ENV !== "production") {
        logger.warn("session_dedup_redis_failed", getErrorMessage(error, "redis_error"));
      }
      return true; // Allow insert on Redis failure
    }
  }

  // In-memory fallback for dev/test (NOT safe for production scaling)
  const now = Date.now();
  const expiresAt = inMemoryDedupCache.get(dedupKey);

  if (expiresAt && expiresAt > now) {
    return false; // Already recorded recently
  }

  // Clean up expired entries periodically (every 100th insert)
  if (inMemoryDedupCache.size > 0 && Math.random() < 0.01) {
    for (const [key, expires] of inMemoryDedupCache.entries()) {
      if (expires <= now) {
        inMemoryDedupCache.delete(key);
      }
    }
  }

  inMemoryDedupCache.set(dedupKey, now + SESSION_DEDUP_TTL_SECONDS * 1000);
  return true;
}

type PersistOutcome = "ok" | "timeout" | "failed";

async function persistSession(
  params: LogSessionParams,
  { source = "live" }: { source?: "live" | "drain" } = {},
): Promise<PersistOutcome> {
  const supabase = createServiceRoleClient();

  try {
    const { value, timedOut } = await withTimeoutFallbackResult(
      supabase.from("user_session").insert({
        user_id: params.userId,
        ip: params.ip ?? null,
        user_agent: params.userAgent ?? null,
        last_seen: new Date().toISOString(),
      }) as UntypedJson as Promise<UntypedJson>,
      {
        timeoutMs: SESSION_LOG_TIMEOUT_MS,
        scope: source === "drain" ? "record_user_session_drain" : "record_user_session",
        onError: (error) => {
          const message = getErrorMessage(error, "insert_failed");
          logger.warn("record_user_session_failed", { userId: params.userId, error: message, source });
        },
        fallback: async () => {
          logger.warn("record_user_session_timeout", {
            userId: params.userId,
            timeoutMs: SESSION_LOG_TIMEOUT_MS,
            source,
          });
          return { data: null, error: "timeout" } as UntypedJson as Awaited<ReturnType<typeof supabase.from>>;
        },
      },
    );

    const hasError = Boolean((value as { error?: UntypedJson } | null)?.error);
    const outcome: PersistOutcome = timedOut ? "timeout" : hasError ? "failed" : "ok";
    metrics.vendorCall("session_log_supabase", outcome === "ok");
    return outcome;
  } catch (error) {
    metrics.vendorCall("session_log_supabase", false);
    const message = getErrorMessage(error, "insert_failed");
    logger.warn("record_user_session_failed", { userId: params.userId, error: message, source });
    return "failed";
  }
}

/**
 * Record a user session with distributed deduplication.
 * 
 * Uses Redis SETNX for atomic distributed locking to prevent duplicate
 * session records across multiple pods/serverless functions.
 * 
 * This function is non-blocking and will not throw errors that could
 * disrupt the authentication pipeline.
 */
export async function recordUserSession(params: LogSessionParams): Promise<void> {
  // Create a dedup key from user ID and token hash
  // Include a short hash to prevent collisions while keeping key size reasonable
  const tokenSuffix = params.tokenHash?.slice(0, 16) ?? crypto.randomUUID().slice(0, 8);
  const dedupKey = `${params.userId}:${tokenSuffix}`;

  // Check deduplication before hitting the database
  const shouldRecord = await tryAcquireSessionSlot(dedupKey);
  if (!shouldRecord) {
    return; // Already recorded this session recently
  }
  // Write-Behind: Always enqueue to Redis first for zero-latency logging
  // The background drainer will handle the Supabase insert
  await enqueueForRetry(params, "write_behind");
  scheduleDrainQueuedSessions();
}

/**
 * For testing: clear the in-memory dedup cache
 */
export function __clearSessionDedupCacheForTests(): void {
  inMemoryDedupCache.clear();
}
