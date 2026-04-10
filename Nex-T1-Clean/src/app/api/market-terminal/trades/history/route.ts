import { connection, NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { buildMarketTerminalTradeHistoryResponse } from "@/server/market/market-terminal";

import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  await connection();
  const { searchParams } = new URL(req.url);
  const pools = (searchParams.get("pools") ?? "")
    .split(",")
    .map((pool) => pool.trim().toLowerCase())
    .filter(Boolean);
  const limit = Number.parseInt(searchParams.get("limit") ?? "100", 10);

  if (pools.length === 0) {
    return apiResponse.badRequest("Missing 'pools' query parameter");
  }

  try {
    return apiResponse.success(
      buildMarketTerminalTradeHistoryResponse({ pools, limit }),
    );
  } catch (error) {
    logger.error("Market terminal trade history API error", error);
    return apiResponse.internalError(
      error instanceof Error ? error.message : String(error),
    );
  }
}
