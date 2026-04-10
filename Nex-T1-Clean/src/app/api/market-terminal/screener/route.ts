import { connection, NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { buildMarketTerminalScreenerResponse } from "@/server/market/market-terminal";

import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  await connection();
  const { searchParams } = new URL(req.url);

  const chain = searchParams.get("chain") ?? "all";
  const query = searchParams.get("query") ?? "";
  const limit = Number.parseInt(searchParams.get("limit") ?? "250", 10);
  const offset = Number.parseInt(searchParams.get("offset") ?? "0", 10);

  try {
    const response = await buildMarketTerminalScreenerResponse({
      chain,
      query,
      limit,
      offset,
    });

    const result = apiResponse.success(response);
    result.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=120",
    );
    return result;
  } catch (error) {
    logger.error("Market terminal screener API error", error);
    return apiResponse.internalError(
      error instanceof Error ? error.message : String(error),
    );
  }
}
