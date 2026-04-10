import type { Redis } from "ioredis";

import { deserializeRedisValue, serializeRedisValue } from "@/lib/utils/redis-config";

type ZaddArg = string | number | { score: number; member: string };

export class IoredisAdapter {
  private client: Redis;

  constructor(client: Redis) {
    this.client = client;
  }

  async get<T = UntypedJson>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (value === null) return null;
    return deserializeRedisValue(value) as T;
  }

  async set(key: string, value: UntypedJson, opts?: { ex?: number }): Promise<"OK"> {
    const payload = serializeRedisValue(value);
    if (opts?.ex) {
      await this.client.set(key, payload, "EX", opts.ex);
    } else {
      await this.client.set(key, payload);
    }
    return "OK";
  }

  async setex(key: string, ttlSeconds: number, value: UntypedJson): Promise<"OK"> {
    const payload = serializeRedisValue(value);
    await this.client.set(key, payload, "EX", ttlSeconds);
    return "OK";
  }

  async trySetNx(key: string, value: UntypedJson, ttlSeconds: number): Promise<boolean> {
    const payload = serializeRedisValue(value);
    const res = await this.client.set(key, payload, "EX", ttlSeconds, "NX");
    return res === "OK";
  }

  async tryReleaseLock(key: string, owner: string): Promise<boolean> {
    const script = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
    const result = await this.client.eval(script, 1, key, owner);
    return Number(result) === 1;
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.client.del(...keys);
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    return this.client.expire(key, ttlSeconds);
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return this.client.hincrby(key, field, increment);
  }

  async hset(key: string, values: Record<string, UntypedJson>): Promise<number> {
    const serialized: Record<string, string> = {};
    for (const [field, value] of Object.entries(values)) {
      serialized[field] = serializeRedisValue(value);
    }
    return this.client.hset(key, serialized);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (members.length === 0) return 0;
    return this.client.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    if (members.length === 0) return 0;
    return this.client.srem(key, ...members);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    if (values.length === 0) return 0;
    return this.client.rpush(key, ...values);
  }

  async lpop(key: string): Promise<string | null> {
    return this.client.lpop(key);
  }

  async brpop(key: string, timeoutSeconds: number): Promise<string | null> {
    const result = await this.client.brpop(key, timeoutSeconds);
    return Array.isArray(result) ? (result[1] ?? null) : null;
  }

  async zadd(key: string, ...args: ZaddArg[]): Promise<number | null> {
    if (args.length === 0) return 0;
    const payload: Array<string | number> = [];
    for (const arg of args) {
      if (typeof arg === "object" && arg !== null) {
        payload.push(arg.score, arg.member);
      } else {
        payload.push(arg);
      }
    }
    return this.client.zadd(key, ...payload);
  }

  async zremrangebyscore(key: string, min: number | string, max: number | string): Promise<number> {
    return this.client.zremrangebyscore(key, min, max);
  }

  async zcard(key: string): Promise<number> {
    return this.client.zcard(key);
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async scard(key: string): Promise<number> {
    return this.client.scard(key);
  }
}
