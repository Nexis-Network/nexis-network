import { connection, NextResponse } from "next/server";
import {
  getTokenMetricsIndicators,
  VendorHttpError,
  VendorRateLimitError,
} from "@/lib/vendors";


const normalizeAsset = (value: string | null) => {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const [base] = trimmed.split(/[/:]/);
  return base.replace(/[^a-z0-9]/gi, "").toLowerCase();
};

export async function GET(request: Request) {
  await connection();
  const { searchParams } = new URL(request.url);
  const assetParam = searchParams.get("asset");
  const tickerParam = searchParams.get("ticker");

  const asset = normalizeAsset(assetParam ?? tickerParam);

  if (!asset) {
    return NextResponse.json(
      { error: "asset query parameter is required" },
      { status: 400 },
    );
  }

  try {
    const result = await getTokenMetricsIndicators(asset);
    const indicators = result.data?.data ?? [];

    const signal =
      indicators.find((item) => /signal/i.test(item.indicator)) ??
      indicators.at(0) ??
      null;

    return NextResponse.json({
      asset,
      fetchedAt: result.fetchedAt,
      data: signal
        ? {
            indicator: signal.indicator,
            direction: signal.direction,
            score: signal.score,
            updatedAt: signal.updated_at,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof VendorRateLimitError) {
      return NextResponse.json(
        {
          asset,
          data: null,
          error: "Token Metrics rate limit exceeded",
        },
        { status: 200 },
      );
    }

    if (error instanceof VendorHttpError) {
      const message =
        error.status === 401
          ? "Token Metrics credentials rejected"
          : typeof error.body === "object" && error.body !== null
            ? (error.body as { message?: string }).message ??
              "Token Metrics request failed"
            : "Token Metrics request failed";

      return NextResponse.json(
        {
          asset,
          data: null,
          status: error.status,
          error: message,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        asset,
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch Token Metrics trade signal",
      },
      { status: 200 },
    );
  }
}
