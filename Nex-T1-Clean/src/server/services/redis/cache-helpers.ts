import crypto from "crypto";

import { redis } from "@/server/services/redis";


import { logger } from '@/lib/logger';
type CacheEnvelope<T> = {
  value: T;
  storedAt: string;
};

const NS_KEY_PREFIX = "cache:ns:";
function nsKey(namespace: string) {
  return `${NS_KEY_PREFIX}${namespace}`;
}

function stableStringify(value: UntypedJson): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, UntypedJson>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`).join(",")}}`;
}

function createCacheKey(namespace: string, parts: UntypedJson[]): string {
  const digest = crypto.createHash("sha1").update(stableStringify(parts)).digest("hex");
  return `${namespace}:${digest}`;
}

async function readCache<T>(key: string): Promise<CacheEnvelope<T> | null> {
  try {
    const entry = await redis.get<CacheEnvelope<T>>(key);
    if (!entry) {
      return null;
    }
    return entry;
  } catch (error) {
    logger.warn(`[cache] Failed to read key ${key}`, error);
    return null;
  }
}

async function writeCache<T>(namespace: string, key: string, value: T, ttlSeconds: number): Promise<void> {
  const envelope: CacheEnvelope<T> = {
    value,
    storedAt: new Date().toISOString(),
  };
  try {
    await redis.set(key, envelope, { ex: ttlSeconds });
    // Track membership cross-instance for reliable invalidation
    await redis.sadd(nsKey(namespace), key);
  } catch (error) {
    logger.warn(`[cache] Failed to write key ${key}`, error);
  }
}

export async function getCachedValue<T>(
  namespace: string,
  parts: UntypedJson[],
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    return fetcher();
  }

  const key = createCacheKey(namespace, parts);
  const cached = await readCache<T>(key);
  if (cached) {
    return cached.value;
  }

  const value = await fetcher();
  await writeCache(namespace, key, value, ttlSeconds);
  return value;
}

export async function clearCacheNamespace(namespace: string): Promise<void> {
  try {
    const setKey = nsKey(namespace);
    const members = await redis.smembers(setKey);
    if (members && members.length > 0) {
      await redis.del(...members);
    }
    await redis.del(setKey);
  } catch (error) {
    logger.warn(`[cache] Failed to clear namespace ${namespace}`, error);
  }
}
