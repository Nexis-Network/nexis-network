import { connection, NextRequest } from "next/server";

import { withAuth } from "@/server/security/with-auth";
import { apiResponse } from "@/lib/api-platform";
import { checkRateLimit } from "@/server/security/rate-limit-lite";
import { geoblockService } from "@/server/services/polymarket/geoblock-service";
import { logger } from "@/lib/logger";


export async function GET(request: NextRequest) {
  await connection();
  const auth = await withAuth(request, { allowPublic: false });
  if (!auth.ok) return auth.response;

  const userId = auth.session?.user?.id;
  if (!userId) return apiResponse.unauthorized();

  const rl = await checkRateLimit(`polymarket:geoblock:${userId}`);
  if (!rl.success) {
    return apiResponse.error("RATE_LIMITED", "Too many requests", 429);
  }

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    undefined;

  try {
    const status = await geoblockService.check(clientIp);
    return apiResponse.success(status);
  } catch (error) {
    logger.error("[polymarket:geoblock] check failed", { userId, error });
    return apiResponse.internalError("Failed to check geoblock status");
  }
}
