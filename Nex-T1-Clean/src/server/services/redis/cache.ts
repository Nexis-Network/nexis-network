import { randomUUID } from "crypto";

import { recordCacheHit, recordCacheMiss, recordCacheWrite } from "@/server/services/redis/cache-metrics";
import { metrics } from "@/server/instrumentation/metrics";
import { redis } from "@/server/services/redis";


import { logger } from '@/lib/logger';
export type GetOrSetOptions<T> = {
  ttlSeconds: number;
  staleTtlSeconds?: number;
  coalesce?: boolean;
  lockTtlSeconds?: number;
  namespace?: string;
  serialize?: (value: T) => UntypedJson;
  deserialize?: (raw: UntypedJson) => T | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const META_SUFFIX = ":meta" as const;
const MIN_LOCK_TTL_SECONDS = 5;

export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: GetOrSetOptions<T>,
): Promise<T> {
  const ns = opts.namespace ?? "default";
  const allowServingStale = typeof opts.staleTtlSeconds === "number" && opts.staleTtlSeconds > 0;
  const metaKey = allowServingStale ? buildMetaKey(key) : null;
  const lockKey = `lock:${key}`;
  const lockTtl = Math.max(MIN_LOCK_TTL_SECONDS, opts.lockTtlSeconds ?? 10);
  let staleValue: T | null = null;

  try {
    const cached = await redis.get<UntypedJson>(key);
    if (cached !== null && cached !== undefined) {
      metrics.cacheHit(ns);
      recordCacheHit(ns);
      const value = opts.deserialize ? opts.deserialize(cached) : (cached as T);
      if (value !== null) {
        if (!metaKey) {
          return value;
        }

        const cachedAt = await readCachedTimestamp(metaKey);
        if (!cachedAt) {
          return value;
        }

        const ageMs = Date.now() - cachedAt;
        const freshWindowMs = opts.ttlSeconds * 1000;
        const staleWindowMs = Math.max(opts.staleTtlSeconds ?? 0, opts.ttlSeconds) * 1000;

        if (ageMs <= freshWindowMs || !allowServingStale) {
          return value;
        }

        if (ageMs <= staleWindowMs) {
          staleValue = value;
        }
      }
    } else {
      metrics.cacheMiss(ns);
      recordCacheMiss(ns);
    }
  } catch {
    // ignore read errors
  }

  if (staleValue !== null) {
    scheduleBackgroundRefresh(key, metaKey, lockKey, lockTtl, fetcher, opts, ns);
    return staleValue;
  }

  const computeFresh = async () => {
    const value = await fetcher();
    await storeCacheValue(key, metaKey, value, opts, ns);
    return value;
  };

  if (!opts.coalesce) {
    return computeFresh();
  }

  // Best-effort coalescing: attempt to acquire a lock by writing a short-lived value.
  const lock = await tryAcquireLock(lockKey, lockTtl);
  if (lock.acquired) {
    try {
      return await computeFresh();
    } finally {
      await releaseLock(lockKey, lock.owner);
    }
  }

  // Another worker likely computing. Poll a few times for a fresh value.
  const deadline = Date.now() + lockTtl * 1000;
  while (Date.now() < deadline) {
    await sleep(50);
    try {
      const cached = await redis.get<UntypedJson>(key);
      if (cached !== null && cached !== undefined) {
        const value = opts.deserialize ? opts.deserialize(cached) : (cached as T);
        if (value !== null) return value;
      }
    } catch {}
  }

  // Still nothing — compute locally to avoid stalling.
  return computeFresh();
}

async function tryAcquireLock(lockKey: string, ttlSeconds: number): Promise<{ acquired: boolean; owner: string }> {
  try {
    // Stronger coalescing: atomic NX with TTL when supported by client.
    const owner = randomUUID();
    const ok = await redis.trySetNx(lockKey, owner, ttlSeconds);
    return { acquired: !!ok, owner };
  } catch {
    // Fallback best-effort if trySetNx unavailable
    try {
      const existing = await redis.get(lockKey);
      if (existing) {
        return { acquired: false, owner: String(existing) };
      }
      const owner = randomUUID();
      await redis.set(lockKey, owner, { ex: ttlSeconds });
      return { acquired: true, owner };
    } catch {
      return { acquired: false, owner: "" };
    }
  }
}

async function releaseLock(lockKey: string, owner: string) {
  try {
    if (owner) {
      const ok = await redis.tryReleaseLock(lockKey, owner);
      if (ok) return;
    }
    await redis.del(lockKey);
  } catch {}
}

function buildMetaKey(key: string): string {
  return `${key}${META_SUFFIX}`;
}

async function readCachedTimestamp(metaKey: string): Promise<number | null> {
  try {
    const raw = await redis.get(metaKey);
    if (raw === null || raw === undefined) {
      return null;
    }

    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }

    if (typeof raw === "string") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    if (typeof raw === "object" && raw !== null && "value" in (raw as Record<string, UntypedJson>)) {
      const value = (raw as Record<string, UntypedJson>).value;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
  } catch {
    // ignore timestamp read failures
  }
  return null;
}

async function storeCacheValue<T>(
  key: string,
  metaKey: string | null,
  value: T,
  opts: GetOrSetOptions<T>,
  namespace: string,
) {
  try {
    const serial = opts.serialize ? opts.serialize(value) : (value as UntypedJson);
    const ttlSeconds = resolveCacheTtl(opts);
    await redis.set(key, serial, { ex: ttlSeconds });
    if (metaKey) {
      await redis.set(metaKey, Date.now().toString(), { ex: ttlSeconds });
    }
    metrics.cacheWrite(namespace);
    recordCacheWrite(namespace);
  } catch {
    // ignore write errors
  }
}

function resolveCacheTtl<T>(opts: GetOrSetOptions<T>): number {
  const staleTtl = opts.staleTtlSeconds ?? 0;
  if (staleTtl > opts.ttlSeconds) {
    return staleTtl;
  }
  return opts.ttlSeconds;
}

function scheduleBackgroundRefresh<T>(
  key: string,
  metaKey: string | null,
  lockKey: string,
  lockTtlSeconds: number,
  fetcher: () => Promise<T>,
  opts: GetOrSetOptions<T>,
  namespace: string,
) {
  void (async () => {
    const lock = await tryAcquireLock(lockKey, lockTtlSeconds);
    if (!lock.acquired) {
      return;
    }

    try {
      const value = await fetcher();
      await storeCacheValue(key, metaKey, value, opts, namespace);
    } catch (error) {
      if (process.env.NODE_ENV !== "test") {
        logger.warn("cache_background_refresh_failed", {
          key,
          namespace,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      await releaseLock(lockKey, lock.owner);
    }
  })();
}
