import type { CoinGeckoWsPriceUpdate } from "@/server/market/coingecko-ws";
import { getCoinPricesByIds } from "@/server/market/coingecko";
import { getOrSet } from "@/server/services/redis/cache";
import { normalizeMarketStreamLookupToken } from "@/modules/markets/utils/stream-identifiers";

export type StreamUpdatePayload = Record<
  string,
  {
    price: number;
    change_24h: number | null;
    market_cap: number | null;
    volume_24h: number | null;
    last_updated_at: number | null;
  }
>;

const SNAPSHOT_CACHE_TTL_SECONDS = 15;
const SNAPSHOT_STALE_TTL_SECONDS = 60;

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function normalizeWsSnapshot(
  snapshot: CoinGeckoWsPriceUpdate,
): StreamUpdatePayload[string] {
  return {
    price: snapshot.price,
    change_24h: snapshot.change24hPct,
    market_cap: snapshot.marketCapUsd,
    volume_24h: snapshot.volume24hUsd,
    last_updated_at: snapshot.lastUpdatedAt,
  };
}

export function normalizeIncomingUpdate(
  value: unknown,
): StreamUpdatePayload[string] | null {
  if (typeof value === "number") {
    return {
      price: value,
      change_24h: null,
      market_cap: null,
      volume_24h: null,
      last_updated_at: null,
    };
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return null;
    }

    return {
      price: parsed,
      change_24h: null,
      market_cap: null,
      volume_24h: null,
      last_updated_at: null,
    };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const price = toFiniteNumber(record.price);
  if (price == null) {
    return null;
  }

  return {
    price,
    change_24h:
      toFiniteNumber(record.change_24h) ??
      toFiniteNumber(record.change24hPct) ??
      toFiniteNumber(record.usd_24h_change),
    market_cap:
      toFiniteNumber(record.market_cap) ?? toFiniteNumber(record.marketCapUsd),
    volume_24h:
      toFiniteNumber(record.volume_24h) ?? toFiniteNumber(record.volume24hUsd),
    last_updated_at:
      toFiniteNumber(record.last_updated_at) ??
      toFiniteNumber(record.lastUpdatedAt),
  };
}

export async function getCachedSimplePriceSnapshot(
  coinIds: string[],
): Promise<StreamUpdatePayload> {
  const normalizedIds = Array.from(
    new Set(
      coinIds
        .map((coinId) => normalizeMarketStreamLookupToken(coinId))
        .filter(Boolean),
    ),
  ).sort();

  if (!normalizedIds.length) {
    return {};
  }

  const cacheKey = `market-stream:simple-price:usd:${normalizedIds.join(",")}`;
  const prices = await getOrSet(cacheKey, () => getCoinPricesByIds(normalizedIds), {
    ttlSeconds: SNAPSHOT_CACHE_TTL_SECONDS,
    staleTtlSeconds: SNAPSHOT_STALE_TTL_SECONDS,
    coalesce: true,
    namespace: "coingecko-stream",
  });

  const normalized: StreamUpdatePayload = {};
  for (const coinId of normalizedIds) {
    const entry = prices[coinId];
    const price = toFiniteNumber(entry?.usd);
    if (price == null) {
      continue;
    }

    normalized[coinId] = {
      price,
      change_24h: toFiniteNumber(entry?.usd_24h_change),
      market_cap: null,
      volume_24h: null,
      last_updated_at: null,
    };
  }

  return normalized;
}
