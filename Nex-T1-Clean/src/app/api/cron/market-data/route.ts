import { connection, NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { ingestMarketData } from "@/server/market/ingest";


import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  await connection();
  return timeApiRoute("cron.market-data", async () => {
    const secret = process.env.CRON_SECRET ?? "";
    const authHeader = request.headers.get("authorization");

    // Standardize to Header-only auth for consistency, unless query param is strictly required by provider.
    // Assuming internal cron or reliable provider:
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return apiResponse.unauthorized("Unauthorized");
    }

    try {
      const result = await ingestMarketData();
      return apiResponse.success(result);
    } catch (error) {
        logger.error("[cron] Market data ingestion failed", error);
        return apiResponse.internalError("ingest_failed");
    }
  });
}
