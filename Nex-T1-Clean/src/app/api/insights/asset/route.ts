import { connection, NextRequest, NextResponse } from "next/server";

import { getAiInsightService } from "@/server/insights/service";

function parseInteger(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNonEmptyString(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: NextRequest) {
  await connection();

  const tokenId = parseNonEmptyString(request.nextUrl.searchParams.get("tokenId"));
  const coingeckoId = parseNonEmptyString(request.nextUrl.searchParams.get("coingeckoId"));
  const chainId = parseInteger(request.nextUrl.searchParams.get("chainId"));

  if (!tokenId && !coingeckoId) {
    return NextResponse.json(
      { error: "Missing required query parameter: tokenId or coingeckoId" },
      { status: 400 },
    );
  }

  try {
    const insight = await getAiInsightService().getAssetInsight({
      tokenId,
      chainId,
      coingeckoId,
    });
    const response = NextResponse.json({ insight }, { status: 200 });
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load asset insight",
      },
      { status: 500 },
    );
  }
}
