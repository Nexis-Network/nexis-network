import { connection } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { getPythMarketSnapshot } from "@/modules/prices/pyth/market";

export async function GET(request: Request) {
  await connection();
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker") ?? "";
  const lookbackParam = Number.parseInt(searchParams.get("lookbackDays") ?? "", 10);
  const resolutionParam = Number.parseInt(searchParams.get("resolution") ?? "", 10);

  if (!ticker.trim()) {
    return apiResponse.badRequest("ticker query parameter is required");
  }

  const lookbackDays = Number.isFinite(lookbackParam) && lookbackParam > 0 ? lookbackParam : 7;
  const resolutionMinutes = Number.isFinite(resolutionParam) && resolutionParam > 0 ? resolutionParam : 15;

  const result = await getPythMarketSnapshot({
    ticker,
    lookbackDays,
    resolutionMinutes,
  });

  if (!result.snapshot) {
    return apiResponse.internalError("Failed to fetch market snapshot");
  }

  return apiResponse.success(result);
}

