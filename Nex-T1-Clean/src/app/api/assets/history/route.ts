import { connection, NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { getBatchCoinMarketCharts } from "@/server/market/coingecko";

import { logger } from '@/lib/logger';


export async function GET(req: NextRequest) {
    await connection();
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids") || "";
    const days = parseInt(searchParams.get("days") || "7");
    
    if (!idsParam) return apiResponse.success({});

    const rawIds = idsParam.split(",").filter(Boolean);
    
    try {
        const history = await getBatchCoinMarketCharts(rawIds, days);
        const response = apiResponse.success(history);
        response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
        return response;
    } catch (error) {
        logger.error("History API Error:", error);
        return apiResponse.internalError(String(error));
    }
}


