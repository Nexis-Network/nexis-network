import { connection, NextRequest } from "next/server";

import { buildCoinGeckoIntegrationResponse } from "@/server/market/coingecko-mobile-proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  await connection();

  const { path } = await params;
  const pathname = `/api/integrations/coingecko/${path.join("/")}`;

  return buildCoinGeckoIntegrationResponse({
    pathname,
    searchParams: request.nextUrl.searchParams,
    cgProApiKey:
      process.env.COINGECKO_PRO_API_KEY ||
      process.env.COINGECKO_API_KEY,
    cgDemoApiKey: process.env.COINGECKO_DEMO_API_KEY,
  });
}
