import { connection, NextResponse } from "next/server";
import {
  getMessariAssetMetrics,
  getMessariMarketSnapshot,
  getSantimentSentiment,
  getTokenMetricsGrades,
  type VendorResponse,
  type MessariAssetMetricsResponse,
  type MessariMarketSnapshotResponse,
  type SantimentSentimentResponse,
  type TokenMetricsGradeResponse,
  VendorRateLimitError,
} from "@/lib/vendors";
import type {
  MarketDataAssetOverview,
  MarketDataAssetMetrics,
  MarketDataOverviewResponse,
  MarketDataSentiment,
  MarketDataTokenMetrics,
} from "@/types/market";
import { getCachedMarketOverview, setCachedMarketOverview } from "@/server/market/market-data-repository";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

const DEFAULT_ASSETS = ["eth", "btc", "sol", "arb", "matic"];
const SENTIMENT_INTERVAL = "5m";
const ONE_HOUR_MS = 60 * 60 * 1000;


export async function GET(req: Request) {
  await connection();
  try {
    const url = new URL(req.url);
    const assetsParam = url.searchParams.get("assets");
    const assets = parseAssets(assetsParam);

    const cached = await getCachedMarketOverview(assets);
    if (cached) {
      return NextResponse.json({
        ...cached,
        fetchedAt: cached.fetchedAt,
        errors: cached.errors ?? [],
        cache: "hit",
      }, { headers: CACHE_HEADERS });
    }

    const now = Date.now();
    const from = new Date(now - ONE_HOUR_MS).toISOString();
    const to = new Date(now).toISOString();

    const marketSnapshotPromise = getMessariMarketSnapshot()
      .then((value) => ({ status: "fulfilled" as const, value }))
      .catch((reason) => ({ status: "rejected" as const, reason }));

    const assetResults = await Promise.all<MarketDataAssetOverview>(
      assets.map(async (asset) => {
        const errors: string[] = [];

        const [messariMetrics, santimentSentiment, tokenMetricsGrades] = await Promise.allSettled([
          getMessariAssetMetrics(asset),
          getSantimentSentiment(asset, from, to, SENTIMENT_INTERVAL),
          getTokenMetricsGrades(asset),
        ]);

        const messariData = extractData<MessariAssetMetricsResponse>(messariMetrics, errors, "messari.metrics");
        const santimentData = extractData<SantimentSentimentResponse>(
          santimentSentiment,
          errors,
          "santiment.sentiment",
        );
        const tokenMetricsData = extractData<TokenMetricsGradeResponse>(
          tokenMetricsGrades,
          errors,
          "tokenmetrics.grades",
        );

        return {
          asset,
          metrics: normalizeMessariMetrics(messariData?.data.data),
          sentiment: normalizeSantimentMetrics(santimentData?.data.data),
          tokenMetrics: normalizeTokenMetrics(tokenMetricsData?.data.data),
          errors,
          fetchedAt: new Date().toISOString(),
        };
      }),
    );

    const topLevelErrors: string[] = [];
    let marketSnapshotData: MessariMarketSnapshotResponse["data"] | undefined;

    const marketSnapshot = await marketSnapshotPromise;
    if (marketSnapshot.status === "fulfilled") {
      marketSnapshotData = marketSnapshot.value.data.data;
    } else {
      const snapshotError = marketSnapshot.reason;
      if (snapshotError instanceof VendorRateLimitError) {
        topLevelErrors.push("messari.markets: rate limit exceeded");
      } else if (snapshotError instanceof Error) {
        topLevelErrors.push(`messari.markets: ${snapshotError.message}`);
      } else {
        topLevelErrors.push("messari.markets: unknown error");
      }
    }

    const response: MarketDataOverviewResponse = {
      data: assetResults,
      marketSnapshot: marketSnapshotData,
      fetchedAt: new Date().toISOString(),
      errors: topLevelErrors,
    };

    await setCachedMarketOverview(assets, response);

    return NextResponse.json({ ...response, cache: "miss" }, { headers: CACHE_HEADERS });
  } catch (error) {
    const status = error instanceof VendorRateLimitError ? 429 : 500;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status },
    );
  }
}

function parseAssets(param: string | null): string[] {
  if (!param) {
    return DEFAULT_ASSETS;
  }

  const list = param
    .split(",")
    .map((asset) => asset.trim().toLowerCase())
    .filter(Boolean);

  return list.length ? list : DEFAULT_ASSETS;
}

function extractData<T>(
  result: PromiseSettledResult<VendorResponse<T>>,
  errors: string[],
  label: string,
): VendorResponse<T> | undefined {
  if (result.status === "fulfilled") {
    return result.value;
  }

  const reason = result.reason;
  if (reason instanceof VendorRateLimitError) {
    errors.push(`${label}: rate limit exceeded`);
  } else if (reason instanceof Error) {
    errors.push(`${label}: ${reason.message}`);
  } else {
    errors.push(`${label}: unknown error`);
  }

  return undefined;
}

function normalizeMessariMetrics(data?: MessariAssetMetricsResponse["data"]): MarketDataAssetMetrics {
  if (!data) {
    return {};
  }

  return {
    priceUsd: data.market_data?.price_usd,
    volume24h: data.market_data?.volume_last_24_hours,
    tvlUsd: data.defi?.total_value_locked_usd,
    transactions24h: data.chain_data?.transactions_last_24_hours,
    protocolRevenueUsd: data.fees?.revenue_last_24_hours,
  };
}

function normalizeSantimentMetrics(data?: SantimentSentimentResponse["data"]): MarketDataSentiment {
  if (!data) {
    return {
      socialDominance: [],
      weightedSentiment: [],
    };
  }

  return {
    socialDominance: data.socialDominance ?? [],
    weightedSentiment: data.sentimentWeightedCombined ?? [],
  };
}

function normalizeTokenMetrics(data?: TokenMetricsGradeResponse["data"]): MarketDataTokenMetrics {
  if (!data) {
    return {};
  }

  return {
    traderGrade: data.trader?.grade,
    traderDelta24h: data.trader?.delta_24h,
    investorGrade: data.investor?.grade,
    investorDelta24h: data.investor?.delta_24h,
  };
}
