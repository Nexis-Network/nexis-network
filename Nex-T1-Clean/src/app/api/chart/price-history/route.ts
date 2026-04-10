import { connection, NextResponse } from "next/server";

// Server-side proxy for CoinGecko market chart data
// This avoids browser CORS/rate-limit issues since the fetch happens server-side
export async function GET(req: Request) {
  await connection();
  const { searchParams } = new URL(req.url);
  const coinId = searchParams.get("coin");
  const days = searchParams.get("days") ?? "7";
  const interval = searchParams.get("interval") ?? "daily";

  if (!coinId) {
    return NextResponse.json({ error: "coin param required" }, { status: 400 });
  }

  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Nex-T1/1.0",
      },
      next: { revalidate: 60 }, // Cache for 60s
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403 || res.status === 429 || res.status === 404) {
        return NextResponse.json({ prices: [], market_caps: [], total_volumes: [] }, { status: 200 });
      }
      const body = await res.text();
      return NextResponse.json({ error: `CoinGecko error ${res.status}`, detail: body }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.error("[/api/chart/price-history]", err);
    return NextResponse.json({ error: "Failed to fetch price history" }, { status: 500 });
  }
}
