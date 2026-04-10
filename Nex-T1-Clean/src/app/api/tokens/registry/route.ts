import { connection, NextRequest } from "next/server";
import { ZodError } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import { getTokenRegistryRouteData } from "@/app/api/tokens/registry/route.service";
import { parseTokenRegistryQuery } from "@/app/api/tokens/registry/route.schema";

export async function GET(req: NextRequest) {
  await connection();

  try {
    const query = parseTokenRegistryQuery(req.nextUrl.searchParams);
    const snapshot = await getTokenRegistryRouteData(query);
    const response = apiResponse.success(snapshot);

    // Shared public cache.
    // Key: query-string normalized by the URL.
    // TTL: 15m CDN/shared cache, 1h stale-while-revalidate.
    // Scope: public-only registry data. User custom tokens are excluded.
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=900, stale-while-revalidate=3600",
    );

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return apiResponse.validationError(error);
    }

    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "token_registry_route_failed",
    );
    return apiResponse.internalError("Failed to load token registry");
  }
}
