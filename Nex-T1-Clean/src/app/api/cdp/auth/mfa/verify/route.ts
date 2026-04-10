export const maxDuration = 15;

import { type NextRequest, NextResponse } from "next/server";
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
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { verifyTotpCode } from "@/server/auth/totp";
import { decryptSecret, type VaultCipher } from "@/server/security/wallet-vault";

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const VerifySchema = z.object({
  code: z
    .string()
    .min(6, "TOTP code must be 6 digits")
    .max(6, "TOTP code must be 6 digits")
    .regex(/^\d{6}$/, "TOTP code must be numeric"),
});

/* ------------------------------------------------------------------ */
/*  POST /api/cdp/auth/mfa/verify                                     */
/*  Verifies a TOTP code to complete MFA setup or validate an action.  */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  return timeApiRoute("cdp.auth.mfa.verify.POST", async () => {
    try {
      const clientIp = extractClientIP(request);

      // Rate limit: 10 per minute (brute-force protection)
      const rateLimitKey = createCompositeRateLimitKey({
        clientIP: clientIp,
        route: "cdp-mfa-verify",
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
      const parsed = VerifySchema.safeParse(body);
      if (!parsed.success) {
        return apiResponse.validationError(parsed.error);
      }

      const { code } = parsed.data;

      const supabase = getSupabaseAdminClient();

      // Retrieve the pending or active MFA record
      const { data: mfaRecord } = await supabase
        .from("user_mfa")
        .select("id, secret_encrypted, verified")
        .eq("user_id", context.userId)
        .eq("type", "totp")
        .maybeSingle();

      if (!mfaRecord) {
        return apiResponse.badRequest(
          "No MFA setup found. Please initiate MFA setup first.",
          "MFA_NOT_FOUND",
        );
      }

      // Decrypt the TOTP secret from the AES-256-GCM encrypted storage.
      // The `secret_encrypted` column holds a JSON-serialised VaultCipher object.
      let totpSecret: string;
      try {
        const vaultCipher: VaultCipher = JSON.parse(
          mfaRecord.secret_encrypted as string,
        );
        totpSecret = decryptSecret(vaultCipher);
      } catch {
        logger.error("cdp_mfa_verify_decrypt_failed", {
          userId: context.userId,
        });
        return apiResponse.internalError(
          "Failed to decrypt MFA secret. Please re-enroll MFA.",
        );
      }

      // Verify the TOTP code using our built-in implementation
      const isValid = verifyTotpCode(totpSecret, code);

      if (!isValid) {
        logger.warn("cdp_mfa_verify_invalid_code", {
          userId: context.userId,
          clientIp,
        });
        return NextResponse.json(
          {
            success: true,
            data: { verified: false },
          },
          { status: 200 },
        );
      }

      // If not yet verified, mark as verified (completing setup)
      if (!mfaRecord.verified) {
        const { error: updateError } = await supabase
          .from("user_mfa")
          .update({
            verified: true,
            verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", mfaRecord.id);

        if (updateError) {
          logger.error("cdp_mfa_verify_update_failed", {
            userId: context.userId,
            error: updateError.message,
          });
          return apiResponse.internalError("Failed to complete MFA verification");
        }

        logger.info("cdp_mfa_setup_completed", {
          userId: context.userId,
          clientIp,
        });
      } else {
        logger.info("cdp_mfa_verify_success", {
          userId: context.userId,
          clientIp,
        });
      }

      return NextResponse.json({
        success: true,
        data: { verified: true },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("cdp_mfa_verify_failed", { error: message });
      return apiResponse.internalError("Failed to verify MFA code");
    }
  });
}
