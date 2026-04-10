import { apiResponse } from "@/lib/api-platform";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { createLogger } from "@/server/logging/logging";
import { refreshSettingsPortfolioSummaryCache } from "@/server/portfolio/settings-summary-cache";
import {
  dequeueSettingsPortfolioSummaryRefreshJobs,
  requeueSettingsPortfolioSummaryRefreshJob,
} from "@/server/portfolio/settings-summary-queue";

const logger = createLogger("settings-portfolio-summary-worker");

const DEFAULT_BATCH = Number.parseInt(process.env.NEX_SETTINGS_PORTFOLIO_WORKER_BATCH ?? "8", 10) || 8;
const WORKER_AUTH_HEADER = "x-cron-key";


function getWorkerKey(): string | null {
  const dedicated = process.env.NEX_SETTINGS_PORTFOLIO_WORKER_KEY?.trim();
  if (dedicated) {
    return dedicated;
  }

  return process.env.CRON_SECRET?.trim() || null;
}

async function handleWorker(request: Request) {
  const workerKey = getWorkerKey();
  if (!workerKey) {
    return apiResponse.serviceUnavailable("service_misconfigured");
  }

  const provided = request.headers.get(WORKER_AUTH_HEADER)?.trim();
  if (!provided || provided !== workerKey) {
    return apiResponse.unauthorized("unauthorized");
  }

  const url = new URL(request.url);
  const requestedLimit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : DEFAULT_BATCH;

  const jobs = await dequeueSettingsPortfolioSummaryRefreshJobs(limit);
  if (jobs.length === 0) {
    return apiResponse.success({ ok: true, processed: 0, refreshed: 0, errors: 0, message: "queue empty" });
  }

  const summary = {
    processed: 0,
    refreshed: 0,
    errors: 0,
  };

  for (const job of jobs) {
    try {
      await refreshSettingsPortfolioSummaryCache({
        userId: job.userId,
        range: job.range,
        walletScope: job.walletScope,
      });
      summary.processed += 1;
      summary.refreshed += 1;
    } catch (error) {
      summary.processed += 1;
      summary.errors += 1;
      logger.error("settings_portfolio_summary_worker_job_failed", {
        jobId: job.id,
        userId: job.userId,
        range: job.range,
        walletScope: job.walletScope,
        error: error instanceof Error ? error.message : String(error),
      });
      await requeueSettingsPortfolioSummaryRefreshJob(job);
    }
  }

  return apiResponse.success({ ok: true, ...summary });
}

export async function GET(request: Request) {
  return timeApiRoute("api.workers.portfolio.settings-summary-refresh.GET", () => handleWorker(request));
}

export async function POST(request: Request) {
  return timeApiRoute("api.workers.portfolio.settings-summary-refresh.POST", () => handleWorker(request));
}
