import { connection, NextResponse } from "next/server";

import { withSingleFlight } from "@/server/services/redis/single-flight";
import { getWalletCardSummary } from "@/server/wallets/card/wallet-card-summary";

function normalizePlatform(value: string | null): "evm" | "solana" | null {
  if (value === "evm" || value === "solana") {
    return value;
  }
  return null;
}

function normalizeNetwork(value: string | null): "mainnet" | "devnet" {
  return value === "devnet" ? "devnet" : "mainnet";
}

export async function GET(request: Request) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address")?.trim();
    const platform = normalizePlatform(searchParams.get("platform"));
    const chainId = searchParams.get("chainId");
    const network = normalizeNetwork(searchParams.get("network"));

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    if (!platform) {
      return NextResponse.json({ error: "Platform must be evm or solana" }, { status: 400 });
    }

    const cacheKey = `wallet-card-summary:${platform}:${chainId ?? network}:${address.toLowerCase()}`;
    const data = await withSingleFlight(
      cacheKey,
      async () =>
        getWalletCardSummary({
          address,
          platform,
          chainId,
          network,
        }),
      60,
    );

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Wallet card summary API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet card summary" },
      { status: 500 },
    );
  }
}
