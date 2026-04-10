export const maxDuration = 15;

import { type NextRequest } from "next/server";
import { z } from "zod";
import { createHash, randomBytes, randomInt } from "node:crypto";

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
import { sendOtpEmail } from "@/server/services/email/resend";
import { getSupabaseServerClient } from "@/server/services/supabase/supabaseClient";

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const LinkEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

/* ------------------------------------------------------------------ */
/*  POST /api/cdp/auth/link/email                                     */
/*  Initiates email linking by creating a pending link flow and        */
/*  generating a verification code. In production this would send      */
/*  an email with the OTP; here we return a flowId for verification.   */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  return timeApiRoute("cdp.auth.link.email.POST", async () => {
    try {
      const clientIp = extractClientIP(request);

      // Rate limit: 5 per hour
      const rateLimitKey = createCompositeRateLimitKey({
        clientIP: clientIp,
        route: "cdp-link-email",
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
      const parsed = LinkEmailSchema.safeParse(body);
      if (!parsed.success) {
        return apiResponse.validationError(parsed.error);
      }

      const { email } = parsed.data;
      const supabase = await getSupabaseServerClient({
        accessToken: context.accessToken,
      });
      if (!supabase) {
        logger.error("cdp_link_email_supabase_unavailable", {
          userId: context.userId,
        });
        return apiResponse.serviceUnavailable("Database unavailable");
      }

      // Check if this email is already linked to this user
      const { data: existingLink } = await supabase
        .from("user_auth_links")
        .select("id")
        .eq("user_id", context.userId)
        .eq("type", "email")
        .eq("identifier", email.toLowerCase())
        .maybeSingle();

      if (existingLink) {
        return apiResponse.badRequest(
          "This email is already linked to your account.",
          "ALREADY_LINKED",
        );
      }

      // Generate a flow ID and OTP code
      const flowId = randomBytes(16).toString("hex");
      // SECURITY: Use cryptographically secure random number for OTP generation.
      // Math.random() is NOT suitable for security-sensitive operations (predictable PRNG).
      const otpCode = String(randomInt(100000, 1000000)).padStart(6, "0");
      // SECURITY: Store SHA-256 hash of OTP instead of plaintext.
      // Even if the DB is breached, the OTP cannot be recovered from the hash.
      const otpHash = createHash("sha256").update(otpCode).digest("hex");
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      // Store the pending link flow (hashed OTP)
      const { error: insertError } = await supabase
        .from("user_auth_link_flows")
        .insert({
          flow_id: flowId,
          user_id: context.userId,
          type: "email",
          identifier: email.toLowerCase(),
          otp_code: otpHash,
          expires_at: expiresAt,
          verified: false,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        logger.error("cdp_link_email_insert_failed", {
          userId: context.userId,
          error: insertError.message,
        });
        return apiResponse.internalError("Failed to initiate email linking");
      }

      // Send the OTP code via Resend email service
      try {
        await sendOtpEmail({
          to: email.toLowerCase(),
          otpCode,
          expiresInMinutes: 10,
        });

        logger.info("cdp_link_email_otp_sent", {
          userId: context.userId,
          email: email.toLowerCase(),
          flowId,
          clientIp,
        });
      } catch (emailErr) {
        // If email sending fails, clean up the flow record and return error
        logger.error("cdp_link_email_send_failed", {
          userId: context.userId,
          email: email.toLowerCase(),
          flowId,
          error:
            emailErr instanceof Error ? emailErr.message : String(emailErr),
        });

        // Best-effort cleanup of the pending flow
        const { error: cleanupErr } = await supabase
          .from("user_auth_link_flows")
          .delete()
          .eq("flow_id", flowId);
        if (cleanupErr) {
          logger.warn("cdp_link_email_cleanup_failed", {
            flowId,
            error: cleanupErr.message,
          });
        }

        return apiResponse.internalError(
          "Failed to send verification email. Please try again.",
        );
      }

      logger.info("cdp_link_email_initiated", {
        userId: context.userId,
        email: email.toLowerCase(),
        flowId,
        clientIp,
        // OTP logged only in development for debugging
        ...(process.env.NODE_ENV === "development" ? { otpCode } : {}),
      });

      return apiResponse.success({
        flowId,
        email: email.toLowerCase(),
        expiresAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("cdp_link_email_failed", { error: message });
      return apiResponse.internalError("Failed to initiate email linking");
    }
  });
}
