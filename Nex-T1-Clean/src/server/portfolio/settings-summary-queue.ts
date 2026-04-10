import "server-only";

import { randomUUID } from "crypto";

import type {
  SettingsPortfolioRange,
  SettingsPortfolioWalletFilter,
} from "@/lib/portfolio/settings-summary";
import { isRedisConfigured, redis } from "@/server/services/redis";

import { createLogger } from "@/server/logging/logging";

const logger = createLogger("settings-portfolio-summary-queue");

const SETTINGS_SUMMARY_QUEUE_KEY =
  process.env.NEX_SETTINGS_PORTFOLIO_QUEUE_KEY ?? "queue:settings-portfolio-summary-refresh";
const SETTINGS_SUMMARY_QUEUE_DEDUPE_TTL_SECONDS = Number.parseInt(
  process.env.NEX_SETTINGS_PORTFOLIO_QUEUE_DEDUPE_TTL_SECONDS ?? "60",
  10,
);

export type SettingsPortfolioSummaryRefreshJob = {
  id: string;
  userId: string;
  range: SettingsPortfolioRange;
  walletScope: SettingsPortfolioWalletFilter;
  enqueuedAt: string;
  attempts: number;
  reason: "stale" | "miss" | "manual";
};

function buildSettingsPortfolioSummaryQueueDedupeKey(
  userId: string,
  range: SettingsPortfolioRange,
  walletScope: SettingsPortfolioWalletFilter,
): string {
  return `${SETTINGS_SUMMARY_QUEUE_KEY}:dedupe:${userId}:${range}:${walletScope}`;
}

export async function enqueueSettingsPortfolioSummaryRefresh(params: {
  userId: string;
  range: SettingsPortfolioRange;
  walletScope?: SettingsPortfolioWalletFilter;
  reason?: SettingsPortfolioSummaryRefreshJob["reason"];
}): Promise<SettingsPortfolioSummaryRefreshJob | null> {
  if (!isRedisConfigured || !redis.rpush) {
    return null;
  }

  const walletScope = params.walletScope ?? "all";
  const dedupeKey = buildSettingsPortfolioSummaryQueueDedupeKey(
    params.userId,
    params.range,
    walletScope,
  );
  const deduped = await redis
    .trySetNx(dedupeKey, "1", SETTINGS_SUMMARY_QUEUE_DEDUPE_TTL_SECONDS)
    .catch(() => false);

  if (!deduped) {
    return null;
  }

  const job: SettingsPortfolioSummaryRefreshJob = {
    id: randomUUID(),
    userId: params.userId,
    range: params.range,
    walletScope,
    enqueuedAt: new Date().toISOString(),
    attempts: 0,
    reason: params.reason ?? "stale",
  };

  await redis.rpush(SETTINGS_SUMMARY_QUEUE_KEY, JSON.stringify(job)).catch((error) => {
    logger.warn("settings_portfolio_summary_enqueue_failed", {
      userId: params.userId,
      range: params.range,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return job;
}

export async function dequeueSettingsPortfolioSummaryRefreshJobs(
  limit: number,
): Promise<SettingsPortfolioSummaryRefreshJob[]> {
  if (!isRedisConfigured || !redis.lpop) {
    return [];
  }

  const jobs: SettingsPortfolioSummaryRefreshJob[] = [];
  for (let index = 0; index < limit; index += 1) {
    const raw = await redis.lpop(SETTINGS_SUMMARY_QUEUE_KEY);
    if (!raw) {
      break;
    }

    try {
      jobs.push(JSON.parse(raw) as SettingsPortfolioSummaryRefreshJob);
    } catch (error) {
      logger.warn("settings_portfolio_summary_invalid_queue_payload", {
        raw,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return jobs;
}

export async function requeueSettingsPortfolioSummaryRefreshJob(
  job: SettingsPortfolioSummaryRefreshJob,
  maxAttempts = 3,
): Promise<void> {
  if (!isRedisConfigured || !redis.rpush) {
    return;
  }

  if (job.attempts >= maxAttempts) {
    logger.warn("settings_portfolio_summary_queue_drop", {
      jobId: job.id,
      userId: job.userId,
      range: job.range,
    });
    return;
  }

  const retryJob: SettingsPortfolioSummaryRefreshJob = {
    ...job,
    attempts: job.attempts + 1,
  };
  await redis.rpush(SETTINGS_SUMMARY_QUEUE_KEY, JSON.stringify(retryJob)).catch((error) => {
    logger.warn("settings_portfolio_summary_requeue_failed", {
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
