import type { Tool } from "ai";

import { isBuildEvaluation } from "@/lib/server/build-evaluation";
import { isRedisExternalConfigured, redis } from "@/server/services/redis";
import { cached } from "@/server/services/redis/cache-managers/ai-sdk-cache";


import { logger } from '@/lib/logger';
type InternalCacheEntry<T = UntypedJson> = {
  result: T;
  timestamp: number;
  key: string;
};

type CacheStore<T = UntypedJson> = {
  get(key: string): InternalCacheEntry<T> | undefined | Promise<InternalCacheEntry<T> | undefined>;
  set(key: string, entry: InternalCacheEntry<T>): void | Promise<void>;
  delete(key: string): boolean | Promise<boolean>;
  clear(): void | Promise<void>;
  has(key: string): boolean | Promise<boolean>;
  size(): number | Promise<number>;
  keys(): string[] | Promise<string[]>;
  getDefaultTTL?(): number | undefined;
  getMetadata?(key: string): CacheEntry | undefined | Promise<CacheEntry | undefined>;
  getAllMetadata?(): CacheEntry[] | Promise<CacheEntry[]>;
};

export interface CacheEntry {
  key: string;
  value: UntypedJson;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CacheInvalidationResult {
  success: boolean;
}

interface ArtifactCacheStoreOptions {
  ttl?: number;
}

interface StoredEntry {
  entry: InternalCacheEntry;
  metadata: CacheEntry;
}

class InMemoryArtifactCacheStore implements CacheStore {
  private readonly entries = new Map<string, StoredEntry>();

  constructor(private readonly options: ArtifactCacheStoreOptions = {}) { }

  getDefaultTTL() {
    return this.options.ttl;
  }

  private isExpired(entry: StoredEntry) {
    if (!entry.metadata.expiresAt) {
      return false;
    }
    return new Date(entry.metadata.expiresAt).getTime() <= Date.now();
  }

  get(key: string) {
    const stored = this.entries.get(key);
    if (!stored) {
      return undefined;
    }
    if (this.isExpired(stored)) {
      this.entries.delete(key);
      return undefined;
    }
    return stored.entry;
  }

  set(key: string, entry: InternalCacheEntry) {
    const now = new Date();
    const ttl = this.options.ttl ?? defaultTtlMs;
    const expiresAt = ttl > 0 ? new Date(now.getTime() + ttl).toISOString() : null;
    const existing = this.entries.get(key)?.metadata;

    const metadata: CacheEntry = {
      key,
      value: entry.result,
      expiresAt,
      createdAt: existing?.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.entries.set(key, {
      entry,
      metadata,
    });
  }

  delete(key: string) {
    return this.entries.delete(key);
  }

  clear() {
    this.entries.clear();
  }

  has(key: string) {
    const stored = this.entries.get(key);
    if (!stored) return false;
    if (this.isExpired(stored)) {
      this.entries.delete(key);
      return false;
    }
    return true;
  }

  size() {
    return this.entries.size;
  }

  keys() {
    return Array.from(this.entries.keys());
  }

  getMetadata(key: string) {
    const stored = this.entries.get(key);
    if (!stored) {
      return undefined;
    }
    if (this.isExpired(stored)) {
      this.entries.delete(key);
      return undefined;
    }
    return stored.metadata;
  }

  getAllMetadata() {
    return Array.from(this.entries.values())
      .filter((record) => !this.isExpired(record))
      .map((record) => record.metadata);
  }
}

class RedisArtifactCacheStore implements CacheStore {
  private static readonly ENTRY_PREFIX = "artifact-cache:entry";
  private static readonly INDEX_KEY = "artifact-cache:keys";

  constructor(private readonly options: ArtifactCacheStoreOptions = {}) { }

  getDefaultTTL() {
    return this.options.ttl;
  }

  private getEntryKey(key: string) {
    return `${RedisArtifactCacheStore.ENTRY_PREFIX}:${key}`;
  }

  private ttlSeconds(): number | undefined {
    const ttl = this.options.ttl ?? defaultTtlMs;
    if (!ttl || ttl <= 0) {
      return undefined;
    }
    return Math.ceil(ttl / 1000);
  }

  private async persist(key: string, record: StoredEntry) {
    const ttlSeconds = this.ttlSeconds();
    await redis.set(this.getEntryKey(key), record, ttlSeconds ? { ex: ttlSeconds } : undefined);
    await redis.sadd(RedisArtifactCacheStore.INDEX_KEY, key);
  }

  private async removeKey(key: string) {
    await redis.del(this.getEntryKey(key));
    await redis.srem(RedisArtifactCacheStore.INDEX_KEY, key);
  }

  async get(key: string) {
    const stored = await redis.get<StoredEntry>(this.getEntryKey(key));
    if (!stored) {
      return undefined;
    }
    return stored.entry;
  }

  async set(key: string, entry: InternalCacheEntry) {
    const now = new Date();
    const ttl = this.options.ttl ?? defaultTtlMs;
    const expiresAt = ttl > 0 ? new Date(now.getTime() + ttl).toISOString() : null;
    const metadata: CacheEntry = {
      key,
      value: entry.result,
      expiresAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const stored: StoredEntry = {
      entry,
      metadata,
    };

    await this.persist(key, stored);
  }

  async delete(key: string) {
    const removed = await redis.del(this.getEntryKey(key));
    await redis.srem(RedisArtifactCacheStore.INDEX_KEY, key);
    return removed > 0;
  }

  async clear() {
    const keys = await redis.smembers(RedisArtifactCacheStore.INDEX_KEY);
    if (keys.length > 0) {
      await redis.del(...keys.map((key) => this.getEntryKey(key)));
    }
    await redis.del(RedisArtifactCacheStore.INDEX_KEY);
  }

  async has(key: string) {
    const stored = await redis.get(this.getEntryKey(key));
    return Boolean(stored);
  }

  async size() {
    const keys = await redis.smembers(RedisArtifactCacheStore.INDEX_KEY);
    return keys.length;
  }

  async keys() {
    return redis.smembers(RedisArtifactCacheStore.INDEX_KEY);
  }

  async getMetadata(key: string) {
    const stored = await redis.get<StoredEntry>(this.getEntryKey(key));
    return stored?.metadata;
  }

  async getAllMetadata() {
    const keys = await redis.smembers(RedisArtifactCacheStore.INDEX_KEY);
    if (keys.length === 0) {
      return [];
    }

    const resolved = await Promise.all(
      keys.map(async (key) => {
        const stored = await redis.get<StoredEntry>(this.getEntryKey(key));
        if (!stored) {
          await redis.srem(RedisArtifactCacheStore.INDEX_KEY, key);
          return null;
        }
        return stored.metadata;
      }),
    );

    return resolved.filter((value): value is CacheEntry => Boolean(value));
  }

  async assertHealthy() {
    const healthKey = this.getEntryKey(`health:${Date.now()}`);
    await redis.set(healthKey, { timestamp: Date.now() }, { ex: 5 });
    await redis.del(healthKey);
  }
}

const defaultTtlMs = 10 * 60 * 1000;
const forceDriver = (process.env.NEX_ARTIFACT_CACHE_DRIVER ?? "").trim().toLowerCase();
const isTestEnv = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
const shouldUseRedisStore =
  forceDriver === "redis" ? true : forceDriver === "memory" ? false : isTestEnv ? false : isRedisExternalConfigured;

if (!shouldUseRedisStore && process.env.NODE_ENV === "production" && !isBuildEvaluation()) {
  logger.warn(
    "[artifact-cache] Falling back to in-memory cache because Redis credentials are missing. Cache consistency is not guaranteed across instances.",
  );
}

const artifactStore = shouldUseRedisStore
  ? new RedisArtifactCacheStore({ ttl: defaultTtlMs })
  : new InMemoryArtifactCacheStore({ ttl: defaultTtlMs });

function stableStringify(value: UntypedJson): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, UntypedJson>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

function hashString(value: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

export function generateCacheKey(toolId: string, params: UntypedJson, context?: string) {
  const base = `${toolId}:${stableStringify(params)}${context ? `:${context}` : ""}`;
  return `${toolId}:${hashString(base)}`;
}

export type ExecutableTool = Tool & {
  execute: NonNullable<Tool["execute"]>;
  getCacheKey?: (params: UntypedJson) => string;
};

export function withArtifactCache<T extends ExecutableTool>(tool: T, toolId: string) {
  const getCacheKey = (params: UntypedJson) => generateCacheKey(toolId, params);
  return Object.assign(cached(tool, {
    store: artifactStore,
    keyGenerator: getCacheKey,
  }), { getCacheKey }) as unknown as T & { getCacheKey: typeof getCacheKey };
}

export async function invalidateCache(key: string): Promise<CacheInvalidationResult> {
  const success = await artifactStore.delete(key);
  return { success };
}

export async function listCacheEntries(): Promise<CacheEntry[]> {
  if (typeof artifactStore.getAllMetadata !== "function") {
    return [];
  }
  return artifactStore.getAllMetadata();
}

export async function clearArtifactCache(): Promise<void> {
  if (typeof artifactStore.clear === "function") {
    await artifactStore.clear();
  }
}
