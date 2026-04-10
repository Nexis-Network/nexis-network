import { apiResponse } from "@/lib/api-platform";
import { processWatchlistAlertRules } from "@/server/alerts/watchlist";

export async function GET(request: Request) {
  return runWatchlistAlertsWorker(request);
}

export async function POST(request: Request) {
  return runWatchlistAlertsWorker(request);
}

async function runWatchlistAlertsWorker(request: Request) {
  const dispatchKey = process.env.NEX_ALERTS_DISPATCH_KEY ?? process.env.NEX_TASK_DISPATCH_KEY;
  if (!dispatchKey) {
    return apiResponse.serviceUnavailable("service_misconfigured");
  }

  const provided = request.headers.get("x-cron-key");
  if (!provided || provided !== dispatchKey) {
    return apiResponse.unauthorized("unauthorized");
  }

  const result = await processWatchlistAlertRules();
  return apiResponse.success({ ok: true, result, timestamp: new Date().toISOString() });
}
