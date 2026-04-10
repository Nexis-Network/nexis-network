import { connection, NextResponse } from "next/server";
import { getEvmAssets, getSolanaAssets } from "@/server/actions/wallets-api";
import { withSingleFlight } from "@/server/services/redis/single-flight";

export async function GET(request: Request) {
    await connection();
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get("address");
        const chainFamily = searchParams.get("chainFamily") || "evm"; // 'evm' or 'solana'
        const chainId = searchParams.get("chainId") || "0x1"; // default ETH mainnet

        if (!address) {
            return NextResponse.json({ error: "Address is required" }, { status: 400 });
        }

        // Cache for 60 seconds. Combine address + chain to form a unique lock key.
        const cacheKey = `portfolio:${chainFamily}:${chainId}:${address}`;
        
        const data = await withSingleFlight(
            cacheKey,
            async () => {
                if (chainFamily === "solana") {
                    return await getSolanaAssets(address);
                } else if (chainFamily === "evm") {
                    return await getEvmAssets(address, chainId);
                } else {
                    throw new Error("Invalid chainFamily");
                }
            },
            60 // seconds
        );

        return NextResponse.json(data);
    } catch (error) {
        console.error("Portfolio API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch portfolio data" },
            { status: 500 }
        );
    }
}
