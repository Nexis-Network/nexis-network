
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
import { resolveOwnedCdpWallet } from "@/server/services/cdp/ownership";
import {
  buildCdpPayRedirectUrl,
  resolveCdpClientIp,
} from "@/server/services/cdp/pay-url-utils";
import { getCdpOnrampUrl } from "@/server/services/cdp/wallet-operations";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const QuerySchema = z.object({
  chainId: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .pipe(z.number().int().positive().optional()),
  amount: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .pipe(z.number().positive().optional()),
  currency: z.string().min(1).max(10).default("USD"),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

/**
 * GET /api/cdp/wallets/[address]/onramp
 *
 * Generate a Coinbase On-Ramp URL for depositing funds into a Nex Wallet.
 * Uses Coinbase Pay integration with CDP project credentials.
 *
 * Query params:
 *   - amount: optional pre-fill amount
 *   - currency: optional currency code (default: "USD")
 *
 * Auth required: wallet owner only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  await connection();
  return timeApiRoute("cdp.wallets.onramp.GET", async () => {
    try {
      const { address } = await params;

      // Rate limit
      const rateLimitResult = await handleRequestRateLimit(
        request,
        "cdp-wallet-onramp",
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
        amount: searchParams.get("amount") ?? undefined,
        currency: searchParams.get("currency") ?? "USD",
      });

      if (!queryParsed.success) {
        return apiResponse.validationError(queryParsed.error);
      }

      const { amount, currency, chainId } = queryParsed.data;

      const ownedWallet = await resolveOwnedCdpWallet(context.userId, address);
      if (!ownedWallet) {
        return apiResponse.forbidden(
          "Address not linked to your account",
        );
      }
      const walletAddress = ownedWallet.address;

      const onramp = await getCdpOnrampUrl({
        address: walletAddress,
        amount,
        currency,
        chainId,
        clientIp: resolveCdpClientIp(request),
        redirectUrl: buildCdpPayRedirectUrl(request, "coinbase-onramp"),
        partnerUserRef: context.userId,
      });

      logger.info("cdp_wallet_onramp_url_generated", {
        address: walletAddress,
        userId: context.userId,
        amount,
        currency,
        chainId: chainId ?? 8453,
      });

      return apiResponse.success({
        url: onramp.url,
        address: walletAddress,
        chain: chainId ?? 8453,
        expiresAt: onramp.expiresAt ?? null,
      });
    } catch (error) {
      logger.error("cdp_wallet_onramp_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return apiResponse.internalError("Failed to generate on-ramp URL");
    }
  });
}
