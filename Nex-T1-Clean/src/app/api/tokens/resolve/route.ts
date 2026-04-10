import { connection, NextRequest } from "next/server";
import { ZodError } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import { TokenResolveError } from "@/modules/tokens/server/token-resolve-service";
import { getResolvedTokenRouteData } from "@/app/api/tokens/resolve/route.service";
import { parseTokenResolveQuery } from "@/app/api/tokens/resolve/route.schema";

export async function GET(req: NextRequest) {
  await connection();

  try {
    const query = parseTokenResolveQuery(req.nextUrl.searchParams);
    const token = await getResolvedTokenRouteData(query);

    if (!token) {
      return apiResponse.notFound("Token metadata not found");
    }

    const response = apiResponse.success(token);

    // Shared public cache.
    // Key: normalized chainId + address query string.
    // TTL: 1h CDN/shared cache, 6h stale-while-revalidate.
    // Scope: public token metadata only. No user-private custom token state.
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=21600",
    );

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return apiResponse.validationError(error);
    }

    if (error instanceof TokenResolveError) {
      return apiResponse.badRequest(error.message, error.code.toUpperCase());
    }

    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "token_resolve_route_failed",
    );
    return apiResponse.internalError("Failed to resolve token metadata");
  }
}
