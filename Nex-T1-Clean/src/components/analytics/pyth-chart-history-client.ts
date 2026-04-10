import {
  applyLatestPricePoint,
  isLatestResponse,
  parsePriceDatum,
} from "./pyth-chart-data";
import type {
  LatestInfo,
  LatestResponse,
  PriceDatum,
} from "./pyth-chart.types";

type FetchPythHistoryResult = {
  history: PriceDatum[];
};

export async function fetchPythHistory(
  ticker: string,
  activeResolutionMinutes: number,
  activeRangeDays: number,
): Promise<FetchPythHistoryResult> {
  const query = new URLSearchParams({
    ticker,
    resolution: activeResolutionMinutes.toString(),
    rangeDays: activeRangeDays.toString(),
  });
  const response = await fetch(`/api/pyth/history?${query.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`History request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as UntypedJson;
  const rawHistory =
    typeof payload === "object" &&
    payload !== null &&
    "data" in payload &&
    Array.isArray((payload as { data?: UntypedJson }).data)
      ? ((payload as { data?: UntypedJson }).data as UntypedJson[])
      : [];

  return {
    history: rawHistory
      .map(parsePriceDatum)
      .filter((datum): datum is PriceDatum => datum !== null),
  };
}

export async function fetchPythLatest(
  ticker: string,
  priceFeedId: string | undefined,
): Promise<LatestResponse | null> {
  const query = new URLSearchParams(priceFeedId ? { id: priceFeedId } : { ticker });
  const response = await fetch(`/api/pyth/latest?${query.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Latest price request failed with status ${response.status}`);
  }

  const latestPayload = (await response.json()) as UntypedJson;
  if (!isLatestResponse(latestPayload)) {
    return null;
  }

  return latestPayload;
}

export const toLatestInfo = (latestPayload: LatestResponse): LatestInfo => ({
  price: latestPayload.price,
  emaPrice: typeof latestPayload.emaPrice === "number" ? latestPayload.emaPrice : null,
  publishTime: latestPayload.publishTime,
});

export { applyLatestPricePoint };
