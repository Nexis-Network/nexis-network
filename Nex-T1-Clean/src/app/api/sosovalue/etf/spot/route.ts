import { connection } from "next/server";

import { z } from "zod";
import { apiResponse } from "@/lib/api-platform";

import { getSosovalueCurrentEtfDataMetrics, SosovalueApiError, SosovalueHttpError } from "@/server/market/sosovalue";


const querySchema = z.object({
  type: z.enum(["us-btc-spot", "us-eth-spot"]).default("us-btc-spot"),
});

export async function GET(req: Request) {
  await connection();
  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));

  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  try {
    const result = await getSosovalueCurrentEtfDataMetrics(parsed.data.type);
    const response = apiResponse.success({ success: true, data: { ...result, data: result.data?.list ?? [] } });
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=300");
    return response;
  } catch (error) {
    const status =
      error instanceof SosovalueHttpError
        ? error.status
        : error instanceof SosovalueApiError
          ? 502
          : 500;
    const message = error instanceof Error ? error.message : "Unable to load SoSoValue spot ETF table";
    return apiResponse.error("SOSOVALUE_ERROR", message, status);
  }
}


