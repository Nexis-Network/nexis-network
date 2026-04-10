import { connection, NextRequest } from "next/server";

import { withAuth } from "@/server/security/with-auth";
import { apiResponse } from "@/lib/api-platform";
import { checkRateLimit } from "@/server/security/rate-limit-lite";
import { gammaClient } from "@/server/services/polymarket/gamma-client";
import { clobReadClient } from "@/server/services/polymarket/clob-read-client";
import { logger } from "@/lib/logger";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conditionId: string }> },
) {
  await connection();
  const auth = await withAuth(request, { allowPublic: true });
  if (!auth.ok) return auth.response;

  const { conditionId } = await params;
  if (!conditionId?.trim()) {
    return apiResponse.badRequest("conditionId is required");
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const rl = await checkRateLimit(`polymarket:market-detail:${ip}`);
  if (!rl.success) {
    return apiResponse.error("RATE_LIMITED", "Too many requests", 429);
  }

  try {
    const detail = await gammaClient.getMarketDetail(conditionId);

    // Enrich outcomes with live CLOB prices
    const enriched = await Promise.all(
      detail.outcomes.map(async (o) => {
        try {
          const midpoint = await clobReadClient.getMidpoint(o.tokenId);
          return { ...o, price: midpoint, midpoint };
        } catch {
          return o;
        }
      }),
    );

    return apiResponse.success({ ...detail, outcomes: enriched });
  } catch (error) {
    logger.error("[polymarket:market-detail] GET failed", { conditionId, error });
    return apiResponse.notFound(`Market ${conditionId} not found`);
  }
}
