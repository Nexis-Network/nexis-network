import { connection, NextResponse } from "next/server";
import { getEvmActivity, getSolanaActivity } from "@/server/actions/wallets-api";
import { withSingleFlight } from "@/server/services/redis/single-flight";

export async function GET(request: Request) {
    await connection();
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get("address");
        const chainFamily = searchParams.get("chainFamily") || "evm";
        const chainId = searchParams.get("chainId") || "0x1";
        const limit = parseInt(searchParams.get("limit") || "25", 10);

        if (!address) {
            return NextResponse.json({ error: "Address is required" }, { status: 400 });
        }

        const cacheKey = `transactions:${chainFamily}:${chainId}:${address}:${limit}`;
        
        const data = await withSingleFlight(
            cacheKey,
            async () => {
                if (chainFamily === "solana") {
                    return await getSolanaActivity(address, limit);
                } else if (chainFamily === "evm") {
                    return await getEvmActivity(address, chainId, limit);
                } else {
                    throw new Error("Invalid chainFamily");
                }
            },
            60 // Cache for 60 seconds
        );

        return NextResponse.json(data);
    } catch (error) {
        console.error("Transactions API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch transaction history" },
            { status: 500 }
        );
    }
}
