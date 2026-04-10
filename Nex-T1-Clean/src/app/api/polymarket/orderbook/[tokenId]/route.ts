import { connection, NextRequest } from "next/server";

import { withAuth } from "@/server/security/with-auth";
import { apiResponse } from "@/lib/api-platform";
import { checkRateLimit } from "@/server/security/rate-limit-lite";
import { clobReadClient } from "@/server/services/polymarket/clob-read-client";
import { logger } from "@/lib/logger";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  await connection();
  const auth = await withAuth(request, { allowPublic: true });
  if (!auth.ok) return auth.response;

  const { tokenId } = await params;
  if (!tokenId?.trim()) {
    return apiResponse.badRequest("tokenId is required");
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const rl = await checkRateLimit(`polymarket:orderbook:${ip}`);
  if (!rl.success) {
    return apiResponse.error("RATE_LIMITED", "Too many requests", 429);
  }

  try {
    const data = await clobReadClient.getOrderbookPayload(tokenId);
    return apiResponse.success(data);
  } catch (error) {
    logger.error("[polymarket:orderbook] GET failed", { tokenId, error });
    return apiResponse.internalError("Failed to fetch orderbook");
  }
}
