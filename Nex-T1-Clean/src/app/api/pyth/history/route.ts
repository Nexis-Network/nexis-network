import { connection, NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { getPriceHistory } from "@/server/market/pyth";

const toNumber = (value: string | null) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export async function GET(req: NextRequest) {
  await connection();
  const { searchParams } = new URL(req.url);

  const ticker = searchParams.get("ticker") ?? "BTC/USD";
  const resolutionMinutes = toNumber(searchParams.get("resolution")) ?? 15;
  const rangeDays = toNumber(searchParams.get("rangeDays")) ?? 7;
  const from = toNumber(searchParams.get("from"));
  const to = toNumber(searchParams.get("to"));

  try {
    const bars = await getPriceHistory(ticker, {
      resolutionMinutes,
      rangeDays,
      from,
      to,
    });

    return apiResponse.success({
      ticker,
      resolutionMinutes,
      rangeDays,
      count: bars.length,
      data: bars,
    });
  } catch (error) {
    return apiResponse.internalError(
      error instanceof Error ? error.message : "Unable to fetch price history"
    );
  }
}

