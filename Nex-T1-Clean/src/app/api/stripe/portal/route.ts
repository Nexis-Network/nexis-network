import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";
import { createPortalSession, createOrGetCustomer } from "@/lib/stripe";
import { z } from "zod";


import { logger } from '@/lib/logger';

const DEFAULT_PORTAL_RETURN_PATH = "/settings/billing";

const portalSchema = z.object({
  returnUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req);
    if (!auth.ok || !auth.session?.user?.id) {
      return apiResponse.unauthorized();
    }

    // Gracefully parse body — empty body or non-JSON is acceptable (we have a default)
    let json: unknown = {};
    try {
      json = await req.json();
    } catch {
      // Body is empty or not valid JSON — use defaults
    }

    const result = portalSchema.safeParse(json);

    if (!result.success) {
      return apiResponse.validationError(result.error);
    }

    // Derive a safe returnUrl: prefer client-provided, fall back to app origin + billing path
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
    const returnUrl = result.data.returnUrl ?? `${appUrl}${DEFAULT_PORTAL_RETURN_PATH}`;

    const { id: userId, email } = auth.session.user;

    if (!email) {
         return apiResponse.badRequest("User email required");
    }

    // 1. Ensure Customer Exists (Portal requires a customer)
    const customerId = await createOrGetCustomer(userId, email, auth.session.user.user_metadata?.full_name);

    // 2. Create Portal Session
    const sessionUrl = await createPortalSession(customerId, returnUrl);

    return apiResponse.success({ url: sessionUrl });

  } catch (error) {
    logger.error("[Stripe] Billing Portal Error:", error);
    return apiResponse.internalError("Internal server error");
  }
}

