export const maxDuration = 10;

import { connection, type NextRequest } from "next/server";

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
import { getSupabaseServerClient } from "@/server/services/supabase/supabaseClient";

function isMissingAuthLinkTableError(error: { code?: string | null; message?: string | null }) {
  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "";

  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes('relation "public.user_auth_links" does not exist') ||
    message.includes("Could not find the table 'public.user_auth_links'")
  );
}

/* ------------------------------------------------------------------ */
/*  GET /api/cdp/auth/link/methods                                    */
/*  Returns the list of linked authentication methods for the user.    */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  await connection();
  return timeApiRoute("cdp.auth.link.methods.GET", async () => {
    try {
      const clientIp = extractClientIP(request);

      // Rate limit: 30 per minute
      const rateLimitKey = createCompositeRateLimitKey({
        clientIP: clientIp,
        route: "cdp-link-methods",
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

      const supabase = await getSupabaseServerClient({
        accessToken: context.accessToken,
      });
      if (!supabase) {
        logger.error("cdp_link_methods_supabase_unavailable", {
          userId: context.userId,
        });
        return apiResponse.serviceUnavailable("Database unavailable");
      }

      const { data: methods, error: queryError } = await supabase
        .from("user_auth_links")
        .select("id, type, identifier, is_primary, linked_at, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: true });

      if (queryError) {
        if (isMissingAuthLinkTableError(queryError)) {
          logger.warn("cdp_link_methods_table_missing", {
            userId: context.userId,
            error: queryError.message,
          });
          return apiResponse.success({ methods: [] });
        }

        logger.error("cdp_link_methods_query_failed", {
          userId: context.userId,
          error: queryError.message,
        });
        return apiResponse.internalError("Failed to retrieve linked methods");
      }

      const formatted = (methods ?? []).map((m) => ({
        id: m.id,
        type: m.type,
        identifier: m.identifier,
        linkedAt: m.linked_at,
        isPrimary: m.is_primary,
      }));

      logger.debug("cdp_link_methods_fetched", {
        userId: context.userId,
        count: formatted.length,
      });

      return apiResponse.success({ methods: formatted });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("cdp_link_methods_failed", { error: message });
      return apiResponse.internalError("Failed to retrieve linked methods");
    }
  });
}
