
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
import {
  createCharge,
  listCharges,
  createChargeSchema,
} from "@/server/services/cdp/commerce";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const ListQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 25))
    .pipe(z.number().int().min(1).max(100)),
  status: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        ["new", "pending", "completed", "expired", "cancelled"].includes(val),
      { message: "Invalid status filter" },
    ),
});

// ---------------------------------------------------------------------------
// Route Handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/cdp/commerce/charges
 *
 * List existing Coinbase Commerce charges.
 *
 * Query params:
 *   - limit:  number of charges (1-100, default 25)
 *   - status: filter by charge status
 *
 * Auth required.
 */
export async function GET(request: NextRequest) {
  await connection();
  return timeApiRoute("cdp.commerce.charges.GET", async () => {
    try {
      // Rate limit
      const rateLimitResult = await handleRequestRateLimit(
        request,
        "cdp-commerce-charges-list",
      );
      if (!rateLimitResult.success) {
        return createRateLimitResponse(rateLimitResult.errorResponse);
      }

      // Auth
      const { context } = await resolveSupabaseContext(undefined, { request });
      if (!context) {
        return apiResponse.unauthorized("Valid session required");
      }

      // Parse query
      const { searchParams } = new URL(request.url);
      const queryParsed = ListQuerySchema.safeParse({
        limit: searchParams.get("limit") ?? undefined,
        status: searchParams.get("status") ?? undefined,
      });

      if (!queryParsed.success) {
        return apiResponse.validationError(queryParsed.error);
      }

      const charges = await listCharges({
        limit: queryParsed.data.limit,
        status: queryParsed.data.status ?? undefined,
      });

      return apiResponse.success(charges, {
        total: charges.length,
        limit: queryParsed.data.limit,
      });
    } catch (error) {
      logger.error("cdp_commerce_charges_list_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return apiResponse.internalError("Failed to list charges");
    }
  });
}

/**
 * POST /api/cdp/commerce/charges
 *
 * Create a new Coinbase Commerce charge (payment request).
 *
 * Body: {
 *   name: string,
 *   description?: string,
 *   amount: string,
 *   currency: string,
 *   pricingType: "fixed_price" | "no_price",
 *   metadata?: Record<string, string>,
 *   redirectUrl?: string,
 *   cancelUrl?: string,
 * }
 *
 * Auth required.
 */
export async function POST(request: NextRequest) {
  return timeApiRoute("cdp.commerce.charges.POST", async () => {
    try {
      // Rate limit
      const rateLimitResult = await handleRequestRateLimit(
        request,
        "cdp-commerce-charges-create",
      );
      if (!rateLimitResult.success) {
        return createRateLimitResponse(rateLimitResult.errorResponse);
      }

      // Auth
      const { context } = await resolveSupabaseContext(undefined, { request });
      if (!context) {
        return apiResponse.unauthorized("Valid session required");
      }

      // Parse body
      const body = (await request.json()) as Record<string, UntypedJson>;
      const parsed = createChargeSchema.safeParse(body);

      if (!parsed.success) {
        return apiResponse.validationError(parsed.error);
      }

      const charge = await createCharge(parsed.data);

      logger.info("cdp_commerce_charge_created_via_api", {
        userId: context.userId,
        chargeId: charge.id,
        code: charge.code,
        amount: charge.amount,
        currency: charge.currency,
      });

      return apiResponse.created(charge);
    } catch (error) {
      logger.error("cdp_commerce_charge_create_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return apiResponse.internalError("Failed to create charge");
    }
  });
}
