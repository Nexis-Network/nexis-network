import { connection, NextResponse } from "next/server";
import { getCoingeckoMarkets } from "@/server/market/coingecko";


import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    
    // Default IDs if none provided
    const ids = idsParam || "bitcoin,ethereum,solana,binancecoin,ripple,cardano,avalanche-2,polkadot,chainlink,matic-network";

    const marketIds = ids ? ids.split(",") : [];
    // Call the server-side service which handles auth and caching
    const response = await getCoingeckoMarkets(
      marketIds,
      {
        vsCurrency: "usd",
        perPage: marketIds.length,
        page: 1,
        sparkline: false,
      }
    );

    const data = response.data;

    return NextResponse.json(data);
  } catch (error) {
    logger.error("[API] Error fetching crypto ticker prices:", error);
    return NextResponse.json(
      { error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}
