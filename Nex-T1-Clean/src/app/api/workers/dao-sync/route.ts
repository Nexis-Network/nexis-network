import { apiResponse } from "@/lib/api-platform";
import { runDueDaoSyncJobs } from "@/modules/daos/services/sync-service";

function verifyWorkerAuth(request: Request): Response | null {
  const expectedKey = process.env.CRON_SECRET;
  if (!expectedKey) {
    return apiResponse.serviceUnavailable();
  }

  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  const headerKey = request.headers.get("x-nexis-internal-secret");
  const token = bearer || headerKey;

  if (!token || token !== expectedKey) {
    return apiResponse.unauthorized();
  }

  return null;
}

async function handle(request: Request) {
  const authError = verifyWorkerAuth(request);
  if (authError) {
    return authError;
  }

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit") ?? 10);
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 ? Math.floor(limitParam) : 10;

  const result = await runDueDaoSyncJobs({
    limit,
  });

  return apiResponse.success({
    status: "ok",
    ...result,
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
