export const maxDuration = 15;

import { type NextRequest } from "next/server";
import { z } from "zod";

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

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const UnlinkSchema = z.object({
  methodId: z.string().uuid("Invalid method ID"),
});

/* ------------------------------------------------------------------ */
/*  POST /api/cdp/auth/link/unlink                                    */
/*  Removes a linked authentication method. Cannot remove the last     */
/*  or primary method without another method present.                  */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  return timeApiRoute("cdp.auth.link.unlink.POST", async () => {
    try {
      const clientIp = extractClientIP(request);

      // Rate limit: 10 per hour
      const rateLimitKey = createCompositeRateLimitKey({
        clientIP: clientIp,
        route: "cdp-link-unlink",
        prefix: "strict",
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

      // Parse body
      const body: unknown = await request.json().catch(() => null);
      const parsed = UnlinkSchema.safeParse(body);
      if (!parsed.success) {
        return apiResponse.validationError(parsed.error);
      }

      const { methodId } = parsed.data;
      const supabase = await getSupabaseServerClient({
        accessToken: context.accessToken,
      });
      if (!supabase) {
        logger.error("cdp_link_unlink_supabase_unavailable", {
          userId: context.userId,
        });
        return apiResponse.serviceUnavailable("Database unavailable");
      }

      // Retrieve the method and verify ownership
      const { data: method } = await supabase
        .from("user_auth_links")
        .select("id, type, identifier, is_primary")
        .eq("id", methodId)
        .eq("user_id", context.userId)
        .maybeSingle();

      if (!method) {
        return apiResponse.notFound("Linked method not found");
      }

      // Count total linked methods
      const { count } = await supabase
        .from("user_auth_links")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId);

      const totalMethods = count ?? 0;

      // Prevent removing the last method
      if (totalMethods <= 1) {
        return apiResponse.badRequest(
          "Cannot remove your last authentication method. Link another method first.",
          "LAST_METHOD",
        );
      }

      // If removing primary, promote next oldest method
      if (method.is_primary && totalMethods > 1) {
        const { data: nextPrimary } = await supabase
          .from("user_auth_links")
          .select("id")
          .eq("user_id", context.userId)
          .neq("id", methodId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nextPrimary) {
          await supabase
            .from("user_auth_links")
            .update({ is_primary: true })
            .eq("id", nextPrimary.id);
        }
      }

      // Delete the method
      const { error: deleteError } = await supabase
        .from("user_auth_links")
        .delete()
        .eq("id", methodId);

      if (deleteError) {
        logger.error("cdp_link_unlink_delete_failed", {
          userId: context.userId,
          methodId,
          error: deleteError.message,
        });
        return apiResponse.internalError("Failed to unlink method");
      }

      logger.info("cdp_auth_method_unlinked", {
        userId: context.userId,
        methodId,
        type: method.type,
        identifier: method.identifier,
        clientIp,
      });

      return apiResponse.success({ unlinked: true, methodId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("cdp_link_unlink_failed", { error: message });
      return apiResponse.internalError("Failed to unlink method");
    }
  });
}
