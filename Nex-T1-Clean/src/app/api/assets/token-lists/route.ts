import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";

import { logger } from "@/lib/logger";
import { getTokenListRouteData } from "@/app/api/assets/token-lists/route.service";

export async function GET(_req: NextRequest) {
    try {
        const snapshot = await getTokenListRouteData();

        const response = apiResponse.success(snapshot);
        response.headers.set(
            "Cache-Control",
            "public, s-maxage=3600, stale-while-revalidate=86400",
        );

        return response;
    } catch (error) {
        logger.error("Token list proxy failed:", error);
        return apiResponse.internalError("Failed to fetch token lists");
    }
}
