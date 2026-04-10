import { connection, NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { findPriceFeedBySymbol } from "@/modules/prices/pyth";
import { getLatestPrice, getPriceFeedsData } from "@/server/market/pyth";

export async function GET(req: NextRequest) {
  await connection();
  const { searchParams } = new URL(req.url);

  const explicitId = searchParams.get("id");
  const ticker = searchParams.get("ticker");

  try {
    let priceFeedId = explicitId ?? "";
    let displaySymbol = ticker ?? "";

    if (!priceFeedId) {
      if (!ticker) {
        return apiResponse.badRequest("Either id or ticker is required");
      }

      const feeds = await getPriceFeedsData();
      const match = findPriceFeedBySymbol(feeds, ticker);

      if (!match) {
        return apiResponse.notFound(`No price feed found for ticker ${ticker}`);
      }

      priceFeedId = match.id;
      displaySymbol = match.displaySymbol;
    }

    const latest = await getLatestPrice(priceFeedId);

    return apiResponse.success({
      ...latest,
      symbol: displaySymbol || ticker || latest.id,
      ticker: ticker ?? displaySymbol ?? latest.id,
    });
  } catch (error) {
    return apiResponse.internalError(
      error instanceof Error ? error.message : "Unable to fetch latest price"
    );
  }
}

