export const maxDuration = 15;

import { type NextRequest, NextResponse } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import {
  createRateLimitResponse,
  extractClientIP,
  createCompositeRateLimitKey,
  handleRequestRateLimitWithKey,
} from "@/lib/request-utils";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { exportCdpWalletKey } from "@/server/services/cdp/wallet-operations";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getWalletPlatform(
  userId: string,
  address: string,
): Promise<{ owned: boolean; platform: string | null }> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("wallet_accounts")
    .select("id,platform")
    .eq("user_id", userId)
    .ilike("address", address)
    .limit(1)
    .maybeSingle();

  if (!data) {
    return { owned: false, platform: null };
  }

  return {
    owned: true,
    platform: (data.platform as string) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

/**
 * POST /api/cdp/wallets/[address]/export-keys
 *
 * CRITICAL SECURITY ENDPOINT: Exports the private key material for a CDP
 * embedded wallet. This endpoint is strictly rate limited and audit-logged.
 *
 * Auth required: wallet owner only.
 * Rate limited: 3 requests per hour (very strict).
 *
 * The response includes Cache-Control: private, no-store, no-cache headers
 * to prevent caching of sensitive key material.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  return timeApiRoute("cdp.wallets.export_keys.POST", async () => {
    try {
      const { address } = await params;
      const clientIp = extractClientIP(request);

      // Strict rate limit: 3 per hour
      const rateLimitKey = createCompositeRateLimitKey({
        clientIP: clientIp,
        route: "cdp-wallet-export-keys",
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

      // Verify wallet ownership and get platform
      const { owned, platform } = await getWalletPlatform(
        context.userId,
        address,
      );
      if (!owned) {
        return apiResponse.forbidden(
          "Address not linked to your account",
        );
      }

      // Audit log the export attempt BEFORE returning keys
      logger.warn("cdp_wallet_key_export_audit", {
        event: "KEY_EXPORT",
        userId: context.userId,
        address,
        clientIp,
        timestamp: new Date().toISOString(),
        severity: "HIGH",
      });

      // Delegate to the Nex Wallet-operations service layer
      // exportCdpWalletKey handles ownership re-verification, rate limiting,
      // CDP SDK call, and audit logging to the database
      const result = await exportCdpWalletKey(
        {
          walletAddress: address,
          userId: context.userId,
        },
        { ipAddress: clientIp },
      );

      const resolvedPlatform = platform ?? (result.format === "base58" ? "solana" : "evm");

      logger.info("cdp_wallet_key_export_completed", {
        userId: context.userId,
        address,
        platform: resolvedPlatform,
        clientIp,
      });

      // Return with strict no-cache headers
      return NextResponse.json(
        {
          success: true,
          data: {
            privateKey: result.privateKey,
            format: result.format,
            platform: resolvedPlatform,
            address,
          },
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "private, no-store, no-cache",
            Pragma: "no-cache",
          },
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Surface rate limit errors from the service layer
      if (message.includes("rate limit")) {
        return apiResponse.error(
          "RATE_LIMITED",
          "Key export rate limit exceeded. Maximum 3 exports per hour.",
          429,
        );
      }

      logger.error("cdp_wallet_export_keys_failed", {
        error: message,
      });

      // Do not leak internal error details for key export failures
      return apiResponse.error(
        "KEY_EXPORT_ERROR",
        "Failed to export wallet keys",
        500,
      );
    }
  });
}
