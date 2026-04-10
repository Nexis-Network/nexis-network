
import { connection, type NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import {
  handleRequestRateLimit,
  createRateLimitResponse,
} from "@/lib/request-utils";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import {
  buildCdpPayRedirectUrl,
  resolveCdpClientIp,
} from "@/server/services/cdp/pay-url-utils";
import { getCdpOfframpUrl } from "@/server/services/cdp/offramp";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const QuerySchema = z.object({
  chainId: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .pipe(z.number().int().positive().optional()),
  asset: z.string().min(1).max(20).default("ETH"),
  amount: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .pipe(z.number().positive().optional()),
  fiatCurrency: z.string().min(1).max(10).default("USD"),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyAddressOwnership(
  userId: string,
  address: string,
): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  const { count } = await supabase
    .from("wallet_accounts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .ilike("address", address);

  return (count ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

/**
 * GET /api/cdp/wallets/[address]/offramp
 *
 * Generate a Coinbase Offramp (sell/cash-out) URL for a Nex Wallet.
 * The user opens this URL to sell crypto for fiat through Coinbase Pay.
 *
 * Query params:
 *   - chainId: optional chain ID (default: 8453 Base)
 *   - asset:   crypto asset symbol (default: "ETH")
 *   - amount:  optional pre-fill crypto amount
 *   - fiatCurrency: optional target fiat currency (default: "USD")
 *
 * Auth required: wallet owner only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  await connection();
  return timeApiRoute("cdp.wallets.offramp.GET", async () => {
    try {
      const { address } = await params;

      // Rate limit
      const rateLimitResult = await handleRequestRateLimit(
        request,
        "cdp-wallet-offramp",
      );
      if (!rateLimitResult.success) {
        return createRateLimitResponse(rateLimitResult.errorResponse);
      }

      // Auth
      const { context } = await resolveSupabaseContext(undefined, { request });
      if (!context) {
        return apiResponse.unauthorized("Valid session required");
      }

      // Validate query params
      const { searchParams } = new URL(request.url);
      const queryParsed = QuerySchema.safeParse({
        chainId: searchParams.get("chainId") ?? undefined,
        asset: searchParams.get("asset") ?? "ETH",
        amount: searchParams.get("amount") ?? undefined,
        fiatCurrency: searchParams.get("fiatCurrency") ?? "USD",
      });

      if (!queryParsed.success) {
        return apiResponse.validationError(queryParsed.error);
      }

      const { chainId, asset, amount, fiatCurrency } = queryParsed.data;

      // Verify wallet ownership
      const ownsWallet = await verifyAddressOwnership(
        context.userId,
        address,
      );
      if (!ownsWallet) {
        return apiResponse.forbidden(
          "Address not linked to your account",
        );
      }

      // Generate offramp URL
      const result = await getCdpOfframpUrl({
        address,
        amount,
        asset,
        fiatCurrency,
        chainId,
        clientIp: resolveCdpClientIp(request),
        partnerUserRef: context.userId,
        redirectUrl: buildCdpPayRedirectUrl(request, "coinbase-offramp"),
      });

      logger.info("cdp_wallet_offramp_url_served", {
        address,
        userId: context.userId,
        asset,
        amount,
        fiatCurrency,
      });

      return apiResponse.success({
        url: result.url,
        address,
        asset,
        expiresAt: result.expiresAt ?? null,
      });
    } catch (error) {
      logger.error("cdp_wallet_offramp_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return apiResponse.internalError("Failed to generate offramp URL");
    }
  });
}
