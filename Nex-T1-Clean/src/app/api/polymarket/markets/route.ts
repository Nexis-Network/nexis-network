import { connection, NextRequest } from "next/server";
import { z } from "zod";

import { withAuth } from "@/server/security/with-auth";
import { apiResponse } from "@/lib/api-platform";
import { validateQuery } from "@/lib/api-platform/validation";
import { checkRateLimit } from "@/server/security/rate-limit-lite";
import { gammaClient } from "@/server/services/polymarket/gamma-client";
import { logger } from "@/lib/logger";


const querySchema = z.object({
  action: z.enum(["search", "trending"]).default("trending"),
  query: z.string().optional(),
  tag: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  await connection();
  const auth = await withAuth(request, { allowPublic: true });
  if (!auth.ok) return auth.response;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const rl = await checkRateLimit(`polymarket:markets:${ip}`);
  if (!rl.success) {
    return apiResponse.error("RATE_LIMITED", "Too many requests", 429);
  }

  const validation = validateQuery(request, querySchema);
  if (!validation.success) return validation.response;

  const { action, query, tag, limit, offset } = validation.data;

  try {
    if (action === "search") {
      if (!query) {
        return apiResponse.badRequest("query is required when action=search");
      }
      const data = await gammaClient.searchMarkets(query, limit);
      return apiResponse.success(data);
    }

    const data = await gammaClient.getTrendingMarkets(limit);
    return apiResponse.success(data);
  } catch (error) {
    logger.error("[polymarket:markets] GET failed", { action, query, tag, limit, offset, error });
    return apiResponse.internalError("Failed to fetch Polymarket markets");
  }
}
