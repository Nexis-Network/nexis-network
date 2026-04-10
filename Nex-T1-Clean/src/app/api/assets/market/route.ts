import { connection, NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { getUnifiedMarketAssets } from "@/server/market/assets";



import { logger } from '@/lib/logger';


export async function GET(req: NextRequest) {
    await connection();
    const { searchParams } = new URL(req.url);
    const chain = searchParams.get("chain") || "all";
    const search = searchParams.get("search") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const enrich = searchParams.get("enrich") !== "false"; // Default true

    try {
        let assets;
            assets = await getUnifiedMarketAssets({
                chain,
                search,
                limit,
                offset,
                skipEnrich: !enrich
            });


        const response = apiResponse.success(assets);
        response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
        return response;
    } catch (error) {
        logger.error("Assets API Error:", error);
        return apiResponse.internalError(error instanceof Error ? error.message : String(error));
    }
}
