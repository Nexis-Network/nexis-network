export const maxDuration = 15;

import { type NextRequest, NextResponse } from "next/server";

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
import {
  generateTotpSecret,
  generateOtpauthUri,
} from "@/server/auth/totp";
import { encryptSecret } from "@/server/security/wallet-vault";

import { randomBytes, createHash } from "node:crypto";

/* ------------------------------------------------------------------ */
/*  POST /api/cdp/auth/mfa/enable                                     */
/*  Initiates TOTP 2FA setup. Returns a QR URI, secret, and backup    */
/*  codes. The TOTP is NOT active until the user verifies with a code  */
/*  via the /verify endpoint.                                          */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  return timeApiRoute("cdp.auth.mfa.enable.POST", async () => {
    try {
      const clientIp = extractClientIP(request);

      // Rate limit: 5 per hour
      const rateLimitKey = createCompositeRateLimitKey({
        clientIP: clientIp,
        route: "cdp-mfa-enable",
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

      const supabase = getSupabaseAdminClient();

      // Check if MFA is already enabled
      const { data: existing } = await supabase
        .from("user_mfa")
        .select("id, verified")
        .eq("user_id", context.userId)
        .eq("type", "totp")
        .maybeSingle();

      if (existing?.verified) {
        return apiResponse.badRequest(
          "TOTP 2FA is already enabled. Disable it first to re-enroll.",
          "MFA_ALREADY_ENABLED",
        );
      }

      // Generate TOTP secret (base32 encoded)
      const secret = generateTotpSecret();
      const appName = "Nex-T1";
      const accountName = context.email ?? context.userId;
      const otpauthUri = generateOtpauthUri(accountName, appName, secret);

      // Generate backup codes (8 codes, 8 chars each)
      const backupCodes: string[] = [];
      for (let i = 0; i < 8; i++) {
        backupCodes.push(
          randomBytes(4).toString("hex").toUpperCase(),
        );
      }

      // Hash backup codes for storage
      const hashedBackupCodes = backupCodes.map((code) =>
        createHash("sha256").update(code).digest("hex"),
      );

      // Encrypt the TOTP secret at rest using AES-256-GCM (wallet-vault pattern).
      // The `secret_encrypted` column stores a JSON-serialised VaultCipher object
      // containing ciphertext, IV, and GCM auth tag.
      const vaultCipher = encryptSecret(secret);
      const encryptedSecretJson = JSON.stringify(vaultCipher);

      // Upsert pending MFA record (verified = false until user submits code)
      const { error: upsertError } = await supabase
        .from("user_mfa")
        .upsert(
          {
            user_id: context.userId,
            type: "totp",
            secret_encrypted: encryptedSecretJson,
            backup_codes_hashed: hashedBackupCodes,
            verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,type" },
        );

      if (upsertError) {
        logger.error("cdp_mfa_enable_upsert_failed", {
          userId: context.userId,
          error: upsertError.message,
        });
        return apiResponse.internalError("Failed to initialize MFA setup");
      }

      logger.info("cdp_mfa_enable_initiated", {
        userId: context.userId,
        clientIp,
      });

      return NextResponse.json({
        success: true,
        data: {
          qrCodeUri: otpauthUri,
          secret,
          backupCodes,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("cdp_mfa_enable_failed", { error: message });
      return apiResponse.internalError("Failed to enable MFA");
    }
  });
}
