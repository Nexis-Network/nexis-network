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

const DisableSchema = z.object({
  code: z
    .string()
    .min(6, "TOTP code must be 6 digits")
    .max(6, "TOTP code must be 6 digits")
    .regex(/^\d{6}$/, "TOTP code must be numeric"),
});

/* ------------------------------------------------------------------ */
/*  POST /api/cdp/auth/mfa/disable                                    */
/*  Disables TOTP 2FA. Requires a valid current TOTP code as proof.   */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  return timeApiRoute("cdp.auth.mfa.disable.POST", async () => {
    try {
      const clientIp = extractClientIP(request);

      // Rate limit: 5 per hour
      const rateLimitKey = createCompositeRateLimitKey({
        clientIP: clientIp,
        route: "cdp-mfa-disable",
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
      const parsed = DisableSchema.safeParse(body);
      if (!parsed.success) {
        return apiResponse.validationError(parsed.error);
      }

      const { code } = parsed.data;

      const supabase = getSupabaseAdminClient();

      // Retrieve the active MFA record
      const { data: mfaRecord } = await supabase
        .from("user_mfa")
        .select("id, secret_encrypted, verified")
        .eq("user_id", context.userId)
        .eq("type", "totp")
        .eq("verified", true)
        .maybeSingle();

      if (!mfaRecord) {
        return apiResponse.badRequest(
          "TOTP 2FA is not currently enabled.",
          "MFA_NOT_ENABLED",
        );
      }

      // Decrypt the TOTP secret from the AES-256-GCM encrypted storage.
      let totpSecret: string;
      try {
        const vaultCipher: VaultCipher = JSON.parse(
          mfaRecord.secret_encrypted as string,
        );
        totpSecret = decryptSecret(vaultCipher);
      } catch {
        logger.error("cdp_mfa_disable_decrypt_failed", {
          userId: context.userId,
        });
        return apiResponse.internalError(
          "Failed to decrypt MFA secret. Please contact support.",
        );
      }

      // Verify the current TOTP code before allowing disable
      const isValid = verifyTotpCode(totpSecret, code);

      if (!isValid) {
        logger.warn("cdp_mfa_disable_invalid_code", {
          userId: context.userId,
          clientIp,
        });
        return apiResponse.badRequest(
          "Invalid TOTP code. Please enter your current 2FA code.",
          "MFA_INVALID_CODE",
        );
      }

      // Delete the MFA record
      const { error: deleteError } = await supabase
        .from("user_mfa")
        .delete()
        .eq("id", mfaRecord.id);

      if (deleteError) {
        logger.error("cdp_mfa_disable_delete_failed", {
          userId: context.userId,
          error: deleteError.message,
        });
        return apiResponse.internalError("Failed to disable MFA");
      }

      logger.info("cdp_mfa_disabled", {
        userId: context.userId,
        clientIp,
        event: "MFA_DISABLED",
        severity: "HIGH",
      });

      return NextResponse.json({
        success: true,
        data: { disabled: true },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("cdp_mfa_disable_failed", { error: message });
      return apiResponse.internalError("Failed to disable MFA");
    }
  });
}
