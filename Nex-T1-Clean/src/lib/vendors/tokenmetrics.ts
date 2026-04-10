import { withVendorCache, vendorCacheKey, vendorFetch, VendorResponse } from "./base";

const TOKEN_METRICS_BASE = "https://api.tokenmetrics.com/v3";
const DEFAULT_TTL_SECONDS = 1800;

export interface TokenMetricsGradeResponse {
  data: {
    trader: {
      grade: number;
      delta_24h: number;
    };
    investor: {
      grade: number;
      delta_24h: number;
    };
    asset: {
      symbol: string;
      name: string;
    };
  };
}

export interface TokenMetricsIndicatorResponse {
  data: Array<{
    indicator: string;
    direction: "bullish" | "bearish" | "neutral";
    score: number;
    updated_at: string;
  }>;
}

export async function getTokenMetricsGrades(
  asset: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<VendorResponse<TokenMetricsGradeResponse>> {
  const key = vendorCacheKey(["tokenmetrics", "grades", asset]);
  return withVendorCache(key, ttlSeconds, async () => {
    const url = `${TOKEN_METRICS_BASE}/grades/${encodeURIComponent(asset)}`;
    return vendorFetch<TokenMetricsGradeResponse>(url, {
      headers: tokenMetricsHeaders(),
    });
  });
}

export async function getTokenMetricsIndicators(
  asset: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<VendorResponse<TokenMetricsIndicatorResponse>> {
  const key = vendorCacheKey(["tokenmetrics", "indicators", asset]);
  return withVendorCache(key, ttlSeconds, async () => {
    const url = `${TOKEN_METRICS_BASE}/indicators/${encodeURIComponent(asset)}`;
    return vendorFetch<TokenMetricsIndicatorResponse>(url, {
      headers: tokenMetricsHeaders(),
    });
  });
}

function tokenMetricsHeaders(): HeadersInit {
  if (!process.env.TOKEN_METRICS_API_KEY) {
    throw new Error("Missing TOKEN_METRICS_API_KEY environment variable");
  }

  return {
    "x-api-key": process.env.TOKEN_METRICS_API_KEY,
  };
}
