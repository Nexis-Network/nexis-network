import { sanitizeEnv } from "@/lib/utils/redis-config";
import { createIoredisClient } from "./factory";
import { IoredisAdapter } from "./ioredis-adapter";

const allowInMemorySetting = (process.env.NEX_ALLOW_IN_MEMORY_REDIS ?? "").trim().toLowerCase();
const nodeEnv = process.env.NODE_ENV;
const isTestEnv =
  nodeEnv === "test" ||
  process.env.VITEST === "true" ||
  (typeof process.env.JEST_WORKER_ID === "string" && process.env.JEST_WORKER_ID.length > 0);
const isEdge = process.env.NEXT_RUNTIME === "edge";
const isBuildEvaluation =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build" ||
  process.env.npm_lifecycle_script?.includes("next build") === true;

// In unit tests we default to in-memory Redis to avoid flaky external network calls.
// If you explicitly want to run tests against a real Redis, set NEX_ALLOW_IN_MEMORY_REDIS=redis.
const forceExternalRedis = allowInMemorySetting === "redis";
const preferInMemoryRedis =
  isTestEnv
    ? !forceExternalRedis
    : nodeEnv !== "production" &&
      (allowInMemorySetting === "true" ||
        allowInMemorySetting === "1" ||
        allowInMemorySetting === "yes" ||
        allowInMemorySetting === "memory" ||
        allowInMemorySetting === "");

export type ServerRedisClient = {
  get<T = UntypedJson>(key: string): Promise<T | null>;
  set(key: string, value: UntypedJson, opts?: { ex?: number }): Promise<UntypedJson>;
  setex(key: string, ttlSeconds: number, value: UntypedJson): Promise<UntypedJson>;
  trySetNx(key: string, value: UntypedJson, ttlSeconds: number): Promise<boolean>;
  tryReleaseLock(key: string, owner: string): Promise<boolean>;
  del(...keys: string[]): Promise<number>;
  exists?(key: string): Promise<number>;
  keys?(pattern: string): Promise<string[]>;
  expire?(key: string, ttlSeconds: number): Promise<number>;
  hincrby(key: string, field: string, increment: number): Promise<number>;
  hset(key: string, values: Record<string, UntypedJson>): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  srem(key: string, ...members: string[]): Promise<number>;
  rpush?(key: string, ...values: string[]): Promise<number>;
  lpop?(key: string): Promise<string | null>;
  brpop?(key: string, timeoutSeconds: number): Promise<string | null>;
  zadd?(key: string, ...args: (string | number)[]): Promise<number | null>;
  zremrangebyscore?(key: string, min: number | string, max: number | string): Promise<number>;
  zcard?(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  ttl(key: string): Promise<number>;
  scard(key: string): Promise<number>;
  ping?(): Promise<string>;
};

type KvEntry = { value: UntypedJson; expiresAt?: number };

class InMemoryRedis implements ServerRedisClient {
  private kvStore = new Map<string, KvEntry>();
  private hashStore = new Map<string, Map<string, UntypedJson>>();
  private setStore = new Map<string, Set<string>>();

  async get<T = UntypedJson>(key: string): Promise<T | null> {
    const entry = this.kvStore.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.kvStore.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: UntypedJson, opts?: { ex?: number }): Promise<"OK"> {
    const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : undefined;
    this.kvStore.set(key, { value, expiresAt });
    return "OK";
  }

  async setex(key: string, ttlSeconds: number, value: UntypedJson): Promise<"OK"> {
    return this.set(key, value, { ex: ttlSeconds });
  }

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      let deleted = false;
      if (this.kvStore.delete(key)) deleted = true;
      if (this.hashStore.delete(key)) deleted = true;
      if (this.setStore.delete(key)) deleted = true;
      if (deleted) removed += 1;
    }
    return removed;
  }

  async exists(key: string): Promise<number> {
    const value = await this.get(key);
    return value === null ? 0 : 1;
  }

  async keys(pattern: string): Promise<string[]> {
    const normalizedPattern = String(pattern || "*");
    if (normalizedPattern === "*") {
      const keys = new Set<string>([
        ...this.kvStore.keys(),
        ...this.hashStore.keys(),
        ...this.setStore.keys(),
        ...this.lists.keys(),
        ...this.zsets.keys(),
      ]);
      return Array.from(keys);
    }

    const regex = new RegExp(
      `^${normalizedPattern
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")}$`,
    );

    const keys = new Set<string>([
      ...this.kvStore.keys(),
      ...this.hashStore.keys(),
      ...this.setStore.keys(),
      ...this.lists.keys(),
      ...this.zsets.keys(),
    ]);

    return Array.from(keys).filter((key) => regex.test(key));
  }

  async trySetNx(key: string, value: UntypedJson, ttlSeconds: number): Promise<boolean> {
    if (this.kvStore.has(key)) return false;
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.kvStore.set(key, { value, expiresAt });
    return true;
  }

  async tryReleaseLock(key: string, owner: string): Promise<boolean> {
    const entry = this.kvStore.get(key);
    if (!entry) return false;
    if (String(entry.value) !== String(owner)) return false;
    this.kvStore.delete(key);
    return true;
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    const hash = this.ensureHash(key);
    const current = Number(hash.get(field) ?? 0);
    const next = current + increment;
    hash.set(field, next);
    return next;
  }

  async hset(key: string, values: Record<string, UntypedJson>): Promise<number> {
    const hash = this.ensureHash(key);
    let updated = 0;
    for (const [field, value] of Object.entries(values)) {
      hash.set(field, value);
      updated += 1;
    }
    return updated;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    const set = this.ensureSet(key);
    let added = 0;
    for (const m of members) {
      const before = set.size;
      set.add(m);
      if (set.size > before) added += 1;
    }
    return added;
  }

  async smembers(key: string): Promise<string[]> {
    return Array.from(this.ensureSet(key));
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.ensureSet(key);
    let removed = 0;
    for (const m of members) {
      if (set.delete(m)) removed += 1;
    }
    return removed;
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    const list = this.ensureList(key);
    for (const v of values) list.push(v);
    return list.length;
  }

  async lpop(key: string): Promise<string | null> {
    const list = this.ensureList(key);
    const value = list.shift();
    return value ?? null;
  }

  async zadd(key: string, ...args: (string | number)[]): Promise<number | null> {
    const set = this.ensureZset(key);
    for (let i = 0; i < args.length; i += 2) {
      const score = Number(args[i]);
      const member = String(args[i + 1]);
      set.set(member, score);
    }
    return set.size;
  }

  async zremrangebyscore(key: string, min: number | string, max: number | string): Promise<number> {
    const set = this.ensureZset(key);
    let removed = 0;
    const minNum = Number(min);
    const maxNum = Number(max);
    for (const [member, score] of Array.from(set.entries())) {
      if (score >= minNum && score <= maxNum) {
        set.delete(member);
        removed += 1;
      }
    }
    return removed;
  }

  async zcard(key: string): Promise<number> {
    return this.ensureZset(key).size;
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    const entry = this.kvStore.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + ttlSeconds * 1000;
    this.kvStore.set(key, entry);
    return 1;
  }

  async ping(): Promise<string> {
    return "PONG";
  }

  private lists = new Map<string, string[]>();
  private zsets = new Map<string, Map<string, number>>();

  private ensureList(key: string): string[] {
    let list = this.lists.get(key);
    if (!list) {
      list = [];
      this.lists.set(key, list);
    }
    return list;
  }

  private ensureZset(key: string): Map<string, number> {
    let set = this.zsets.get(key);
    if (!set) {
      set = new Map();
      this.zsets.set(key, set);
    }
    return set;
  }

  private ensureHash(key: string): Map<string, UntypedJson> {
    let hash = this.hashStore.get(key);
    if (!hash) {
      hash = new Map();
      this.hashStore.set(key, hash);
    }
    return hash;
  }

  private ensureSet(key: string): Set<string> {
    let set = this.setStore.get(key);
    if (!set) {
      set = new Set();
      this.setStore.set(key, set);
    }
    return set;
  }

  async scard(key: string): Promise<number> {
    return this.ensureSet(key).size;
  }

  async incr(key: string): Promise<number> {
    const entry = this.kvStore.get(key);
    let current = 0;
    let expiresAt: number | undefined;

    if (entry) {
      if (entry.expiresAt && entry.expiresAt <= Date.now()) {
        this.kvStore.delete(key);
      } else {
        current = Number(entry.value);
        if (Number.isNaN(current)) throw new Error("Value is not an integer or out of range");
        expiresAt = entry.expiresAt;
      }
    }

    const next = current + 1;
    this.kvStore.set(key, { value: next, expiresAt });
    return next;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.kvStore.get(key);
    if (!entry) return -2;
    if (!entry.expiresAt) return -1;
    
    const now = Date.now();
    if (entry.expiresAt <= now) {
      this.kvStore.delete(key);
      return -2;
    }
    
    return Math.ceil((entry.expiresAt - now) / 1000);
  }
}
const ioredisInstance =
  preferInMemoryRedis || isEdge || isBuildEvaluation
    ? null
    : createIoredisClient();

// `next build` evaluates route modules while collecting page data. Keep the
// production Redis requirement for the actual server runtime, but don't crash
// the build process when the build container lacks runtime-only Redis secrets.
if (
  !isTestEnv &&
  !isEdge &&
  nodeEnv === "production" &&
  !ioredisInstance &&
  !isBuildEvaluation
) {
  throw new Error(
    "External Redis is required in production. Configure a real Redis connection before starting the app.",
  );
}

const client: ServerRedisClient = ioredisInstance
  ? new IoredisAdapter(ioredisInstance)
  : new InMemoryRedis();

export const redis = client;
// `isRedisConfigured` now reflects only a real external Redis connection.
// In-memory fallback remains available for local development/tests, but it should
// no longer be mistaken for a production-ready Redis runtime.
export const isRedisConfigured = Boolean(ioredisInstance);
export const isRedisInMemoryFallback = !Boolean(ioredisInstance);
export const isRedisExternalConfigured = Boolean(ioredisInstance);

export async function assertRedisHealthy() {
  if (!isRedisConfigured) {
    throw new Error("Redis is not configured");
  }
  if (client.ping) {
    await client.ping();
  }
}

// Expose a helper to eagerly close the client on teardown in tests
try {
  const _teardown = sanitizeEnv(process.env.JEST_WORKER_ID) ?? null;
  // ioredis teardown is handled by process lifecycle in tests.
} catch {
  // ignore
}
