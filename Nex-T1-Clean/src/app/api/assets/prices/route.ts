import { NextRequest, NextResponse, connection } from "next/server";
import { getCoinPricesByIds } from "@/server/market/coingecko";


export async function GET(req: NextRequest) {
    await connection();
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids") || "";

    if (!idsParam) {
        return NextResponse.json(
            { success: true, data: {} },
            {
                status: 200,
                headers: {
                    "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
                },
            },
        );
    }

    try {
        const rawIds = idsParam.split(",").filter(Boolean);
        const prices = await getCoinPricesByIds(rawIds);

        const results: Record<string, { value: number }> = {};
        Object.entries(prices).forEach(([id, data]) => {
            if (typeof data.usd === "number") {
                results[id] = { value: data.usd };
            }
        });

        return NextResponse.json(
            { success: true, data: results },
            {
                status: 200,
                headers: {
                    "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
                },
            },
        );
    } catch (error) {
        console.error("[API Error] /api/assets/prices", error);
        return NextResponse.json(
            { success: false, error: { message: "Failed to fetch prices" } },
            { status: 500 },
        );
    }
}
