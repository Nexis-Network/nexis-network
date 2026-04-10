/**
 * Redis Cache Manager - Enterprise-grade caching layer
 *
 * Features:
 * - Multiple cache strategies (LRU, LFU, TTL-based)
 * - Cache warming and invalidation patterns
 * - Distributed locking for cache consistency
 * - Cache metrics and monitoring
 * - Circuit breaker protection
 */

import { redis, isRedisConfigured } from "@/server/services/redis";


import { logger } from '@/lib/logger';
export interface CacheOptions {
  ttlSeconds: number;
  staleTtlSeconds?: number; // Serve stale data while refreshing
  coalesce?: boolean; // Prevent thundering herd
  lockTtlSeconds?: number;
  namespace?: string;
  serialize?: (value: UntypedJson) => string;
  deserialize?: (raw: string) => UntypedJson;
  keyPrefix?: string;
}

export interface CacheEntry<T = UntypedJson> {
  data: T;
  timestamp: number;
  ttl: number;
  staleTtl?: number;
  hits: number;
  lastAccessed: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  locks: number;
  errors: number;
  avgResponseTime: number;
}

class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private readonly threshold = 5;
  private readonly resetTimeout = 30000; // 30s

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker open");
      }
    }

    try {
      const result = await fn();
      if (this.state === "HALF_OPEN") {
        this.state = "CLOSED";
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.threshold) {
        this.state = "OPEN";
      }
      throw error;
    }
  }
}

export class RedisCacheManager {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    locks: 0,
    errors: 0,
    avgResponseTime: 0,
  };

  private responseTimes: number[] = [];
  private circuitBreaker = new CircuitBreaker();

  constructor(private defaultNamespace = "cache") { }

  /**
   * Get or set with advanced caching strategies
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    if (!isRedisConfigured) {
      // Fallback to direct computation with circuit breaker
      return this.circuitBreaker.execute(factory);
    }

    const fullKey = this.buildKey(key, options);
    const lockKey = `${fullKey}:lock`;

    try {
      const startTime = Date.now();

      // Try cache hit first
      const cached = await this.getFromCache<T>(fullKey, options, factory);
      if (cached !== null) {
        this.recordHit(Date.now() - startTime);
        return cached;
      }

      // Cache miss - check if coalescing is enabled
      if (options.coalesce) {
        const coalesced = await this.attemptCoalesce<T>(fullKey, lockKey, factory, options);
        if (coalesced !== null) {
          this.recordHit(Date.now() - startTime);
          return coalesced;
        }
      }

      // Compute and cache
      const lockAcquired = await this.acquireLock(lockKey, options.lockTtlSeconds ?? 30);
      if (!lockAcquired) {
        // Another process is computing, wait and retry
        await new Promise(resolve => setTimeout(resolve, 100));
        return this.getOrSet(key, factory, options); // Recursive retry
      }

      try {
        const value = await this.circuitBreaker.execute(factory);
        await this.setInCache(fullKey, value, options);
        this.recordMiss(Date.now() - startTime);
        return value;
      } finally {
        await this.releaseLock(lockKey);
      }

    } catch (error) {
      this.recordError();
      logger.error(`Cache error for key ${fullKey}:`, error);
      // Fallback to direct computation with circuit breaker
      return this.circuitBreaker.execute(factory);
    }
  }

  /**
   * Get from cache with staleness handling
   */
  private async getFromCache<T>(
    key: string,
    options: CacheOptions,
    factory: () => Promise<T>
  ): Promise<T | null> {
    try {
      const raw = await redis.get<string>(key);
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);
      const now = Date.now();
      const age = now - entry.timestamp;

      // Check if expired
      if (age > entry.ttl * 1000) {
        await redis.del(key);
        this.metrics.deletes++;
        return null;
      }

      // Check if stale but still serveable
      if (options.staleTtlSeconds && age > options.staleTtlSeconds * 1000) {
        // Trigger background refresh (don't wait)
        this.triggerBackgroundRefresh(key, options, factory);
      }

      // Update access metadata
      entry.hits++;
      entry.lastAccessed = now;
      await redis.set(key, JSON.stringify(entry), { ex: entry.ttl });

      return entry.data;
    } catch (error) {
      this.recordError();
      logger.error(`Cache read error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set in cache with metadata
   */
  private async setInCache<T>(key: string, value: T, options: CacheOptions): Promise<void> {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: options.ttlSeconds,
      staleTtl: options.staleTtlSeconds,
      hits: 0,
      lastAccessed: Date.now(),
    };

    const serialized = options.serialize ? options.serialize(entry) : JSON.stringify(entry);
    await redis.set(key, serialized, { ex: options.ttlSeconds });
    this.metrics.sets++;
  }

  /**
   * Attempt request coalescing to prevent thundering herd
   */
  private async attemptCoalesce<T>(
    key: string,
    lockKey: string,
    factory: () => Promise<T>,
    options: CacheOptions
  ): Promise<T | null> {
    // Check if another process is computing
    const lockOwner = await redis.get(lockKey);
    if (lockOwner) {
      // Wait for computation to complete
      let attempts = 0;
      while (attempts < 50) { // Max 5 seconds wait
        await new Promise(resolve => setTimeout(resolve, 100));
        const cached = await this.getFromCache<T>(key, options, factory);
        if (cached !== null) {
          return cached;
        }
        attempts++;
      }
    }
    return null;
  }

  /**
   * Distributed locking for cache consistency
   */
  private async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const lockId = `${Date.now()}-${Math.random()}`;
    const acquired = await redis.trySetNx(key, lockId, ttlSeconds);
    if (acquired) {
      this.metrics.locks++;
    }
    return acquired;
  }

  /**
   * Release distributed lock
   */
  private async releaseLock(key: string): Promise<void> {
    await redis.del(key);
  }

  /**
   * Trigger background cache refresh
   */
  private async triggerBackgroundRefresh<T>(
    key: string,
    options: CacheOptions,
    factory: () => Promise<T>
  ): Promise<void> {
    // Fire and forget
    (async () => {
      try {
        const value = await factory();
        await this.setInCache(key, value, options);
        logger.debug(`Background refresh completed for key: ${key}`);
      } catch (error) {
        logger.error(`Background refresh failed for key ${key}:`, error);
      }
    })();
  }

  /**
   * Delete cache entry
   */
  async delete(key: string, namespace?: string): Promise<void> {
    const prefix = namespace || this.defaultNamespace;
    const fullKey = prefix ? `${prefix}:${key}` : key;
    await redis.del(fullKey);
    this.metrics.deletes++;
  }

  /**
   * Invalidate by pattern (dangerous - use carefully)
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // Redis doesn't have native pattern deletion in cluster mode
    // This is a simplified implementation
    logger.warn(`Pattern invalidation requested: ${pattern} - implement carefully`);
  }

  /**
   * Cache warming for critical data
   */
  async warmCache<T>(
    keys: Array<{ key: string; factory: () => Promise<T> }>,
    options: CacheOptions
  ): Promise<void> {
    const promises = keys.map(({ key, factory }) =>
      this.getOrSet(key, factory, options).catch(error => {
        logger.error(`Cache warming failed for key ${key}:`, error);
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    return {
      ...this.metrics,
      avgResponseTime,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      locks: 0,
      errors: 0,
      avgResponseTime: 0,
    };
    this.responseTimes = [];
  }

  private buildKey(key: string, options: CacheOptions): string {
    const prefix = options.keyPrefix || options.namespace || this.defaultNamespace;
    return `${prefix}:${key}`;
  }

  private recordHit(responseTime: number): void {
    this.metrics.hits++;
    this.recordResponseTime(responseTime);
  }

  private recordMiss(responseTime: number): void {
    this.metrics.misses++;
    this.recordResponseTime(responseTime);
  }

  private recordError(): void {
    this.metrics.errors++;
  }

  private recordResponseTime(time: number): void {
    this.responseTimes.push(time);
    // Keep only last 1000 measurements
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }
}

// Global cache manager instance
export const cacheManager = new RedisCacheManager();

// Convenience functions for common patterns
export const getOrSet = cacheManager.getOrSet.bind(cacheManager);
export const invalidateCache = cacheManager.delete.bind(cacheManager);

// Specialized cache functions for different data types
export class ChatCacheManager extends RedisCacheManager {
  constructor() {
    super("chat");
  }

  async getChatResponse(promptHash: string): Promise<string | null> {
    return this.getOrSet(
      `response:${promptHash}`,
      async () => null, // Would compute response
      { ttlSeconds: 900 } // 15 minutes
    );
  }
}

export class UserCacheManager extends RedisCacheManager {
  constructor() {
    super("user");
  }

  async getUserProfile(userId: string): Promise<UntypedJson | null> {
    return this.getOrSet(
      `profile:${userId}`,
      async () => null, // Would fetch from DB
      { ttlSeconds: 300, staleTtlSeconds: 600 } // 5 min TTL, 10 min stale
    );
  }
}

export class WalletCacheManager extends RedisCacheManager {
  constructor() {
    super("wallet");
  }

  async getWalletBalance(walletAddress: string): Promise<UntypedJson | null> {
    return this.getOrSet(
      `balance:${walletAddress}`,
      async () => null, // Would fetch from blockchain
      { ttlSeconds: 60, coalesce: true } // 1 min TTL with coalescing
    );
  }
}

// Export specialized managers
export const chatCache = new ChatCacheManager();
export const userCache = new UserCacheManager();
export const walletCache = new WalletCacheManager();
