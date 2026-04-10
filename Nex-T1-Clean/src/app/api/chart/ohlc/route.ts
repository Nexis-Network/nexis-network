import { connection, NextResponse } from "next/server";

/**
 * Server-side proxy for CoinGecko OHLC candle data.
 * GET /api/chart/ohlc?coin=ethereum&days=30
 * Returns [[timestamp, open, high, low, close], ...]
 */
export async function GET(req: Request) {
  await connection();
  const { searchParams } = new URL(req.url);
  const coinId = searchParams.get("coin");
  const days = searchParams.get("days") ?? "30";

  if (!coinId) {
    return NextResponse.json({ error: "coin param required" }, { status: 400 });
  }

  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}/ohlc?vs_currency=usd&days=${days}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Nex-T1/1.0" },
      next: { revalidate: 120 },
    });

    if (!res.ok) {
      if (res.status === 429 || res.status === 404) {
        return NextResponse.json([], { status: 200 });
      }
      const body = await res.text();
      return NextResponse.json(
        { error: `CoinGecko OHLC error ${res.status}`, detail: body },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("[/api/chart/ohlc]", err);
    return NextResponse.json({ error: "Failed to fetch OHLC data" }, { status: 500 });
  }
}
