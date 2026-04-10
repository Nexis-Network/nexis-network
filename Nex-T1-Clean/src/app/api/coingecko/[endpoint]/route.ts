import { connection, NextRequest, NextResponse } from "next/server";
import Coingecko from "@coingecko/coingecko-typescript";
import { CoingeckoClient } from "@/server/services/coingecko/coingecko-client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ endpoint: string }> }
) {
  await connection();
  const searchParams = req.nextUrl.searchParams;
  const endpoint = (await params).endpoint;

  try {
    switch (endpoint) {
      case "trending": {
        const data = await CoingeckoClient.getTrendingTokens();
        return NextResponse.json(data);
      }
      
      case "token": {
        const network = searchParams.get("network");
        const address = searchParams.get("address");
        if (!network || !address) {
          return NextResponse.json({ error: "Missing network or address" }, { status: 400 });
        }
        const data = await CoingeckoClient.getTokenInfoByAddress(network, address);
        return NextResponse.json(data);
      }

      case "pools": {
        const network = searchParams.get("network");
        const address = searchParams.get("address");
        if (!network || !address) {
          return NextResponse.json({ error: "Missing network or address" }, { status: 400 });
        }
        // GeckoTerminal uses different network ids (e.g. eth instead of ethereum)
        const gtNetworkString = network === "ethereum" ? "eth" : network;
        const data = await CoingeckoClient.getTopPoolsByAddress(gtNetworkString, address);
        return NextResponse.json(data);
      }

      case "holders": {
        // Implement holders logic (mocked if API doesn't support it directly)
        return NextResponse.json({ data: [] });
      }

      case "traders": {
        // Implement traders logic
        return NextResponse.json({ data: [] });
      }

      case "trades": {
        const network = searchParams.get("network");
        const poolAddress = searchParams.get("poolAddress");
        if (!network || !poolAddress) {
          return NextResponse.json({ error: "Missing network or poolAddress" }, { status: 400 });
        }
        const gtNetworkString = network === "ethereum" ? "eth" : network;
        const data = await CoingeckoClient.getRecentTradesByAddress(gtNetworkString, poolAddress);
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 });
    }
  } catch (err) {
    if (err instanceof Coingecko.RateLimitError) {
      console.error(`Coingecko rate limit hit [${endpoint}]:`, err.message);
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }
    if (err instanceof Coingecko.NotFoundError) {
      return NextResponse.json(
        { error: `Resource not found for endpoint: ${endpoint}` },
        { status: 404 }
      );
    }
    if (err instanceof Coingecko.AuthenticationError) {
      console.error(`Coingecko auth error [${endpoint}]:`, err.message);
      return NextResponse.json(
        { error: "CoinGecko API authentication failed" },
        { status: 401 }
      );
    }
    if (err instanceof Coingecko.APIError) {
      console.error(`Coingecko API error [${endpoint}]: ${err.name} (${err.status})`, err.message);
      return NextResponse.json(
        { error: `CoinGecko API error: ${err.name}` },
        { status: err.status ?? 500 }
      );
    }
    console.error(`Coingecko unexpected error [${endpoint}]:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch data from Coingecko" },
      { status: 500 }
    );
  }
}
