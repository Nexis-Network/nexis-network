import crypto from "crypto";

import { CryptorankClient } from "@/server/cryptorank/client";
import { redis } from "@/server/services/redis";
import { createLogger } from "@/server/logging/logging";
import type { CachedResponse, CryptorankTokenUnlock } from "@/types/market";

const logger = createLogger("cryptorank-market");

const CACHE_NAMESPACE = "cryptorank-market";
const DEFAULT_TIMEOUT_MS = 12_000;
const STALE_CACHE_TTL_MULTIPLIER = 6;
const MIN_STALE_CACHE_SECONDS = 10 * 60;

const TTL_TOKEN_UNLOCKS_SECONDS = 15 * 60;
const MAX_TOKEN_UNLOCKS = 50;

type CacheEntry<T> = {
  value: T;
  fetchedAt: string;
};

function stableStringify(value: UntypedJson): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, UntypedJson>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    .join(",")}}`;
}

function buildCacheKey(parts: UntypedJson[]): string {
  const signature = stableStringify(parts);
  const digest = crypto.createHash("sha1").update(signature).digest("hex");
  return `${CACHE_NAMESPACE}:${digest}`;
}

function computeStaleTtl(ttlSeconds: number): number {
  const expanded = ttlSeconds * STALE_CACHE_TTL_MULTIPLIER;
  return Math.max(expanded, MIN_STALE_CACHE_SECONDS);
}

async function readCacheEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const cached = await redis.get<CacheEntry<T>>(key);
    return cached ?? null;
  } catch (error) {
    logger.debugExpectedError(`cache read failed for key ${key}`, error);
    return null;
  }
}

async function readStaleCacheEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  const staleKey = `${key}:stale`;
  try {
    const cached = await redis.get<CacheEntry<T>>(staleKey);
    return cached ?? null;
  } catch (error) {
    logger.debugExpectedError(`stale cache read failed for key ${staleKey}`, error);
    return null;
  }
}

async function writeCacheEntry<T>(key: string, ttlSeconds: number, entry: CacheEntry<T>) {
  try {
    await redis.set(key, entry, { ex: ttlSeconds });
    await redis.set(`${key}:stale`, entry, { ex: computeStaleTtl(ttlSeconds) });
  } catch (error) {
    logger.debugExpectedError(`cache write failed for key ${key}`, error);
  }
}

async function withCache<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<CachedResponse<T>> {
  const cached = await readCacheEntry<T>(key);
  if (cached) {
    return {
      data: cached.value,
      fetchedAt: cached.fetchedAt,
      cache: "hit",
    };
  }

  try {
    const value = await fetcher();
    const fetchedAt = new Date().toISOString();
    await writeCacheEntry(key, ttlSeconds, { value, fetchedAt });
    return {
      data: value,
      fetchedAt,
      cache: "miss",
    };
  } catch (error) {
    const stale = await readStaleCacheEntry<T>(key);
    if (stale) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("serving stale cache", { key, error: message });
      return {
        data: stale.value,
        fetchedAt: stale.fetchedAt,
        cache: "hit",
        stale: true,
        error: message,
      };
    }
    throw error;
  }
}

function toNumber(value: UntypedJson): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function normalizeIsoDate(value: UntypedJson): string | null {
  if (typeof value === "string" && value.trim().length) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 10_000_000_000 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  return null;
}

function coerceString(value: UntypedJson): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function normalizeTokenUnlockRows(payload: UntypedJson, limit: number): CryptorankTokenUnlock[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { items?: UntypedJson }).items)
      ? (payload as { items: UntypedJson[] }).items
      : [];

  const cleaned = list
    .map((row) => {
      const record = row && typeof row === "object" ? (row as Record<string, UntypedJson>) : null;
      if (!record) return null;

      const symbol = coerceString(record.symbol).trim().toUpperCase();
      const name = coerceString(record.name).trim();
      const slug = coerceString(record.slug).trim().toLowerCase();
      const rawId = record.id ?? (slug ? slug : symbol ? symbol : null);
      const id = coerceString(rawId).trim();
      if (!id || !symbol || !name) return null;

      return {
        id,
        slug: slug || id,
        symbol,
        name,
        rank: toNumber(record.rank),
        marketCapUsd: toNumber(record.marketCap ?? record.market_cap ?? record.marketCapUsd ?? record.market_cap_usd),
        nextUnlockDate: normalizeIsoDate(record.nextUnlockDate ?? record.next_unlock_date ?? record.next_unlock_at),
        nextUnlockValueUsd: toNumber(record.nextUnlockValue ?? record.next_unlock_value ?? record.nextUnlockValueUsd),
        nextUnlockOfCirculating: toNumber(record.nextUnlockOfCirculating ?? record.next_unlock_of_circulating),
        nextUnlockOfSupply: toNumber(record.nextUnlockOfSupply ?? record.next_unlock_of_supply),
      } satisfies CryptorankTokenUnlock;
    })
    .filter((row): row is CryptorankTokenUnlock => Boolean(row));

  return cleaned.slice(0, limit);
}

function clampLimit(value: number | undefined): number {
  if (!Number.isFinite(value) || !value) return 10;
  return Math.min(MAX_TOKEN_UNLOCKS, Math.max(1, Math.floor(value)));
}

export async function getCryptorankTokenUnlocks(params?: {
  limit?: number;
  hideSmallUnlocks?: boolean;
  sortBy?: "nextUnlockDate" | "nextUnlockOfCirculating" | "nextUnlockOfSupply";
  sortDirection?: "ASC" | "DESC";
}): Promise<CachedResponse<CryptorankTokenUnlock[]>> {
  const apiKey = process.env.CRYPTORANK_API_KEY?.trim();
  if (!apiKey) {
    return {
      data: [],
      fetchedAt: new Date().toISOString(),
      cache: "miss",
      fallback: true,
      error: "CRYPTORANK_API_KEY is not configured",
    };
  }

  const limit = clampLimit(params?.limit);
  const hideSmallUnlocks = Boolean(params?.hideSmallUnlocks ?? true);
  const sortBy = params?.sortBy ?? "nextUnlockDate";
  const sortDirection = params?.sortDirection ?? "ASC";

  const key = buildCacheKey(["token-unlocks", { limit, hideSmallUnlocks, sortBy, sortDirection }]);

  return withCache(key, TTL_TOKEN_UNLOCKS_SECONDS, async () => {
    const client = new CryptorankClient({ apiKey, timeoutMs: DEFAULT_TIMEOUT_MS });
    const response = await client.request({
      path: "/v2/currencies/token-unlock",
      query: {
        hideSmallUnlocks,
        sortBy,
        sortDirection,
        limit: 100,
        skip: 0,
      },
    });

    if (!response.ok) {
      throw new Error(`CryptoRank token unlocks failed (${response.statusCode}): ${response.message}`);
    }

    return normalizeTokenUnlockRows(response.data, limit);
  }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("token unlocks fetch failed", { error: message });
    return {
      data: [],
      fetchedAt: new Date().toISOString(),
      cache: "miss",
      fallback: true,
      error: message,
    } satisfies CachedResponse<CryptorankTokenUnlock[]>;
  });
}

