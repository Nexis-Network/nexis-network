import "server-only";

import type {
  SettingsPortfolioRange,
  SettingsPortfolioSummary,
  SettingsPortfolioWalletFilter,
} from "@/lib/portfolio/settings-summary";
import { isRedisConfigured, redis } from "@/server/services/redis";

import { getSettingsPortfolioSummary } from "@/server/portfolio/settings-summary";

const SETTINGS_SUMMARY_CACHE_PREFIX = "settings:portfolio-summary:v3";
const SETTINGS_SUMMARY_FRESH_TTL_SECONDS = Number.parseInt(
  process.env.NEX_SETTINGS_PORTFOLIO_CACHE_TTL_SECONDS ?? "90",
  10,
);
const SETTINGS_SUMMARY_STALE_TTL_SECONDS = Number.parseInt(
  process.env.NEX_SETTINGS_PORTFOLIO_CACHE_STALE_TTL_SECONDS ?? "900",
  10,
);

type CachedSettingsPortfolioSummary = {
  summary: SettingsPortfolioSummary;
  cachedAt: string;
};

export type SettingsPortfolioSummaryCacheEntry = {
  summary: SettingsPortfolioSummary;
  cachedAt: string;
  status: "fresh" | "stale";
};

export function buildSettingsPortfolioSummaryCacheKey(
  userId: string,
  range: SettingsPortfolioRange,
  walletScope: SettingsPortfolioWalletFilter = "all",
): string {
  return `${SETTINGS_SUMMARY_CACHE_PREFIX}:${userId}:${range}:${walletScope}`;
}

function isValidCachedSettingsPortfolioSummary(
  value: CachedSettingsPortfolioSummary | null | undefined,
): value is CachedSettingsPortfolioSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  return typeof value.cachedAt === "string" && typeof value.summary === "object" && value.summary !== null;
}

function resolveCacheStatus(cachedAt: string): "fresh" | "stale" | null {
  const parsed = Date.parse(cachedAt);
  if (Number.isNaN(parsed)) {
    return null;
  }

  const ageMs = Date.now() - parsed;
  if (ageMs <= SETTINGS_SUMMARY_FRESH_TTL_SECONDS * 1000) {
    return "fresh";
  }

  if (ageMs <= SETTINGS_SUMMARY_STALE_TTL_SECONDS * 1000) {
    return "stale";
  }

  return null;
}

export async function readCachedSettingsPortfolioSummary(params: {
  userId: string;
  range: SettingsPortfolioRange;
  walletScope?: SettingsPortfolioWalletFilter;
}): Promise<SettingsPortfolioSummaryCacheEntry | null> {
  if (!isRedisConfigured) {
    return null;
  }

  const key = buildSettingsPortfolioSummaryCacheKey(
    params.userId,
    params.range,
    params.walletScope ?? "all",
  );
  const cached = await redis.get<CachedSettingsPortfolioSummary>(key).catch(() => null);
  if (!isValidCachedSettingsPortfolioSummary(cached)) {
    return null;
  }

  const status = resolveCacheStatus(cached.cachedAt);
  if (!status) {
    return null;
  }

  return {
    summary: cached.summary,
    cachedAt: cached.cachedAt,
    status,
  };
}

export async function writeCachedSettingsPortfolioSummary(params: {
  userId: string;
  range: SettingsPortfolioRange;
  walletScope?: SettingsPortfolioWalletFilter;
  summary: SettingsPortfolioSummary;
  cachedAt?: string;
}): Promise<void> {
  if (!isRedisConfigured) {
    return;
  }

  const key = buildSettingsPortfolioSummaryCacheKey(
    params.userId,
    params.range,
    params.walletScope ?? "all",
  );
  const payload: CachedSettingsPortfolioSummary = {
    summary: params.summary,
    cachedAt: params.cachedAt ?? new Date().toISOString(),
  };

  await redis.set(key, payload, { ex: SETTINGS_SUMMARY_STALE_TTL_SECONDS }).catch(() => {});
}

export async function refreshSettingsPortfolioSummaryCache(params: {
  userId: string;
  range: SettingsPortfolioRange;
  walletScope?: SettingsPortfolioWalletFilter;
}): Promise<SettingsPortfolioSummary> {
  const summary = await getSettingsPortfolioSummary(params);
  await writeCachedSettingsPortfolioSummary({
    userId: params.userId,
    range: params.range,
    walletScope: params.walletScope,
    summary,
  });
  return summary;
}
