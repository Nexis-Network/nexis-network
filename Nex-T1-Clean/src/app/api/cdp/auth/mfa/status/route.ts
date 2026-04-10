export const maxDuration = 10;

import { connection, type NextRequest, NextResponse } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import {
  extractClientIP,
  createCompositeRateLimitKey,
  handleRequestRateLimitWithKey,
  createRateLimitResponse,
} from "@/lib/request-utils";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

/* ------------------------------------------------------------------ */
/*  GET /api/cdp/auth/mfa/status                                      */
/*  Returns the current MFA status for the authenticated user.         */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  await connection();
  return timeApiRoute("cdp.auth.mfa.status.GET", async () => {
    try {
      const clientIp = extractClientIP(request);

      // Rate limit: 30 per minute
      const rateLimitKey = createCompositeRateLimitKey({
        clientIP: clientIp,
        route: "cdp-mfa-status",
        prefix: "api",
      });
      const rateLimitResult =
        await handleRequestRateLimitWithKey(rateLimitKey);
      if (!rateLimitResult.success) {
        return createRateLimitResponse(rateLimitResult.errorResponse);
      }

      // Auth
      const { context } = await resolveSupabaseContext(undefined, { request });
      if (!context) {
        return apiResponse.unauthorized("Valid session required");
      }

      const supabase = getSupabaseAdminClient();

      const { data: mfaRecord } = await supabase
        .from("user_mfa")
        .select("id, type, verified, verified_at, created_at, updated_at")
        .eq("user_id", context.userId)
        .eq("type", "totp")
        .maybeSingle();

      const isEnabled = mfaRecord?.verified === true;

      logger.debug("cdp_mfa_status_checked", {
        userId: context.userId,
        enabled: isEnabled,
      });

      return NextResponse.json({
        success: true,
        data: {
          enabled: isEnabled,
          type: isEnabled ? "totp" : null,
          enrolledAt: mfaRecord?.verified_at ?? null,
          pendingSetup: mfaRecord !== null && !mfaRecord.verified,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("cdp_mfa_status_failed", { error: message });
      return apiResponse.internalError("Failed to retrieve MFA status");
    }
  });
}
