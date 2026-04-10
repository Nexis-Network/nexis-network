

import { recordUserSession } from "@/server/auth/session-log";
import { apiResponse } from "@/lib/api-platform";


import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const expectedSecret = process.env.CRON_SECRET;
    if (!expectedSecret) {
      logger.error("[log-edge-session] CRON_SECRET env var is not set — rejecting request");
      return apiResponse.serviceUnavailable("service_misconfigured");
    }

    const secret = request.headers.get("x-nexis-internal-secret");
    if (!secret || secret !== expectedSecret) {
      return apiResponse.unauthorized("unauthorized");
    }

    const body = await request.json();
    const { userId, ip, userAgent, tokenHash } = body ?? {};

    if (typeof userId !== "string" || userId.length === 0) {
      return apiResponse.badRequest("userId is required");
    }

    await recordUserSession({
      userId,
      ip: typeof ip === "string" ? ip : null,
      userAgent: typeof userAgent === "string" ? userAgent : null,
      tokenHash: typeof tokenHash === "string" ? tokenHash : null,
    });

    return apiResponse.success({ ok: true });
  } catch (error) {
    return apiResponse.internalError(
       error instanceof Error ? error.message : "edge_session_log_failed"
    );
  }
}
