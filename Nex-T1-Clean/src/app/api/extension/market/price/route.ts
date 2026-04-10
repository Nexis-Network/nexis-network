import { connection, NextResponse } from "next/server";
import { getCoingeckoMarkets } from "@/server/market/coingecko";
import { resolveCoingeckoApiBase, resolveCoingeckoCredentials } from "@/server/market/coingecko-base";
import { logger } from '@/lib/logger';


const { proApiKey: COINGECKO_API_KEY, demoApiKey: COINGECKO_DEMO_API_KEY } = resolveCoingeckoCredentials({
  apiKey: process.env.COINGECKO_API_KEY,
  proApiKey: process.env.COINGECKO_PRO_API_KEY,
  demoApiKey: process.env.COINGECKO_DEMO_API_KEY,
});
const COINGECKO_API_BASE = resolveCoingeckoApiBase({
  apiKey: COINGECKO_API_KEY,
  envBase: process.env.COINGECKO_API_BASE,
});

export async function GET(request: Request) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const idsParam = searchParams.get("ids");
    
    // Default to a safe list if nothing provided
    const queryIds = idsParam || symbol || "bitcoin,ethereum,solana";

    // Use the shared CoinGecko market service first.
    let data: unknown = [];
    try {
        const result = await getCoingeckoMarkets(queryIds.split(","));
        data = result.data || [];
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn("[API] CoinGecko market service failed, falling back to direct REST fetch.", { error: msg });

        const base = COINGECKO_API_BASE.endsWith("/") ? COINGECKO_API_BASE.slice(0, -1) : COINGECKO_API_BASE;
        const url = new URL(`${base}/coins/markets`);
        url.searchParams.set("vs_currency", "usd");
        url.searchParams.set("ids", queryIds);
        url.searchParams.set("per_page", String(queryIds.split(",").length));
        url.searchParams.set("page", "1");
        url.searchParams.set("sparkline", "false");

        const headers: Record<string, string> = {
            "Accept": "application/json",
            "User-Agent": "Nexis-T1-Enterprise/1.0"
        };
        if (COINGECKO_API_KEY) {
            headers["x-cg-pro-api-key"] = COINGECKO_API_KEY;
        } else if (COINGECKO_DEMO_API_KEY) {
            headers["x-cg-demo-api-key"] = COINGECKO_DEMO_API_KEY;
        }

        const res = await fetch(url.toString(), { headers });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`CoinGecko direct REST error: ${res.status} ${txt}`);
        }
        data = await res.json();
    }

    return NextResponse.json(data);

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const coingeckoKeyPresent = Boolean(COINGECKO_API_KEY || COINGECKO_DEMO_API_KEY);
    logger.error(`[API] Error fetching market price (Coingecko Service): ${msg}. (CG Key present: ${coingeckoKeyPresent})`);
    
    return NextResponse.json(
      { error: "Failed to fetch prices", details: msg },
      { status: 500 }
    );
  }
}
