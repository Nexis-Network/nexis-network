
import { type NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import {
  handleRequestRateLimit,
  createRateLimitResponse,
} from "@/lib/request-utils";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getCharge, cancelCharge } from "@/server/services/cdp/commerce";

// ---------------------------------------------------------------------------
// Route Handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/cdp/commerce/charges/[id]
 *
 * Retrieve a single Coinbase Commerce charge by its ID.
 *
 * Auth required.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return timeApiRoute("cdp.commerce.charges.id.GET", async () => {
    try {
      const { id } = await params;

      // Rate limit
      const rateLimitResult = await handleRequestRateLimit(
        request,
        "cdp-commerce-charge-get",
      );
      if (!rateLimitResult.success) {
        return createRateLimitResponse(rateLimitResult.errorResponse);
      }

      // Auth
      const { context } = await resolveSupabaseContext(undefined, { request });
      if (!context) {
        return apiResponse.unauthorized("Valid session required");
      }

      if (!id || id.length === 0) {
        return apiResponse.badRequest("Charge ID is required");
      }

      const charge = await getCharge(id);

      return apiResponse.success(charge);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      // Distinguish 404 from other errors
      if (message.includes("404") || message.includes("not found")) {
        return apiResponse.notFound("Charge not found");
      }

      logger.error("cdp_commerce_charge_get_failed", {
        error: message,
      });
      return apiResponse.internalError("Failed to retrieve charge");
    }
  });
}

/**
 * DELETE /api/cdp/commerce/charges/[id]
 *
 * Cancel a Coinbase Commerce charge. Only charges in "new" status
 * can be cancelled.
 *
 * Auth required.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return timeApiRoute("cdp.commerce.charges.id.DELETE", async () => {
    try {
      const { id } = await params;

      // Rate limit
      const rateLimitResult = await handleRequestRateLimit(
        request,
        "cdp-commerce-charge-cancel",
      );
      if (!rateLimitResult.success) {
        return createRateLimitResponse(rateLimitResult.errorResponse);
      }

      // Auth
      const { context } = await resolveSupabaseContext(undefined, { request });
      if (!context) {
        return apiResponse.unauthorized("Valid session required");
      }

      if (!id || id.length === 0) {
        return apiResponse.badRequest("Charge ID is required");
      }

      await cancelCharge(id);

      logger.info("cdp_commerce_charge_cancelled_via_api", {
        userId: context.userId,
        chargeId: id,
      });

      return apiResponse.noContent();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      if (message.includes("404") || message.includes("not found")) {
        return apiResponse.notFound("Charge not found");
      }

      logger.error("cdp_commerce_charge_cancel_failed", {
        error: message,
      });
      return apiResponse.internalError("Failed to cancel charge");
    }
  });
}
