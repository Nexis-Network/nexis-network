export const maxDuration = 15;

import { type NextRequest } from "next/server";
import { z } from "zod";
import { createHash, timingSafeEqual } from "node:crypto";

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

const VerifyLinkSchema = z.object({
  flowId: z.string().min(1, "Flow ID is required"),
  code: z
    .string()
    .min(6, "Verification code must be 6 digits")
    .max(6, "Verification code must be 6 digits")
    .regex(/^\d{6}$/, "Verification code must be numeric"),
});

/* ------------------------------------------------------------------ */
/*  POST /api/cdp/auth/link/verify                                    */
/*  Verifies the OTP code for an auth linking flow and completes the   */
/*  link by creating the user_auth_links record.                       */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  return timeApiRoute("cdp.auth.link.verify.POST", async () => {
    try {
      const clientIp = extractClientIP(request);

      // Rate limit: 10 per minute
      const rateLimitKey = createCompositeRateLimitKey({
        clientIP: clientIp,
        route: "cdp-link-verify",
        prefix: "auth",
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
      const parsed = VerifyLinkSchema.safeParse(body);
      if (!parsed.success) {
        return apiResponse.validationError(parsed.error);
      }

      const { flowId, code } = parsed.data;
      const supabase = await getSupabaseServerClient({
        accessToken: context.accessToken,
      });
      if (!supabase) {
        logger.error("cdp_link_verify_supabase_unavailable", {
          userId: context.userId,
        });
        return apiResponse.serviceUnavailable("Database unavailable");
      }

      // Retrieve the pending flow
      const { data: flow } = await supabase
        .from("user_auth_link_flows")
        .select("*")
        .eq("flow_id", flowId)
        .eq("user_id", context.userId)
        .eq("verified", false)
        .maybeSingle();

      if (!flow) {
        return apiResponse.badRequest(
          "Invalid or expired linking flow.",
          "FLOW_NOT_FOUND",
        );
      }

      // Check expiry
      if (new Date(flow.expires_at) < new Date()) {
        // Clean up expired flow
        await supabase
          .from("user_auth_link_flows")
          .delete()
          .eq("flow_id", flowId);

        return apiResponse.badRequest(
          "This linking flow has expired. Please start again.",
          "FLOW_EXPIRED",
        );
      }

      // Verify the OTP code: hash the provided code and compare against stored hash.
      // This allows us to store only SHA-256 hashes in the DB (never plaintext OTPs).
      // Constant-time comparison prevents timing attacks.
      const storedHash = Buffer.from(String(flow.otp_code), "utf8");
      const providedHash = Buffer.from(
        createHash("sha256").update(code).digest("hex"),
        "utf8",
      );
      const otpMatch =
        storedHash.length === providedHash.length &&
        timingSafeEqual(storedHash, providedHash);

      if (!otpMatch) {
        logger.warn("cdp_link_verify_invalid_code", {
          userId: context.userId,
          flowId,
          clientIp,
        });
        return apiResponse.badRequest(
          "Invalid verification code.",
          "INVALID_CODE",
        );
      }

      // Determine if this is the first linked method (primary)
      const { count } = await supabase
        .from("user_auth_links")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId);

      const isPrimary = (count ?? 0) === 0;

      // Create the auth link record
      const { error: linkError } = await supabase
        .from("user_auth_links")
        .insert({
          user_id: context.userId,
          type: flow.type,
          identifier: flow.identifier,
          is_primary: isPrimary,
          linked_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });

      if (linkError) {
        logger.error("cdp_link_verify_insert_failed", {
          userId: context.userId,
          error: linkError.message,
        });
        return apiResponse.internalError("Failed to complete auth linking");
      }

      // Mark flow as verified
      await supabase
        .from("user_auth_link_flows")
        .update({ verified: true })
        .eq("flow_id", flowId);

      logger.info("cdp_auth_link_completed", {
        userId: context.userId,
        type: flow.type,
        identifier: flow.identifier,
        isPrimary,
        clientIp,
      });

      return apiResponse.success({
        linked: true,
        type: flow.type,
        identifier: flow.identifier,
        isPrimary,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("cdp_link_verify_failed", { error: message });
      return apiResponse.internalError("Failed to verify linking code");
    }
  });
}
