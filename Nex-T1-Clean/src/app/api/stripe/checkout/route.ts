import { NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { createCheckoutSession, createOrGetCustomer } from "@/lib/stripe";
import { checkRateLimit, stripeCheckoutRateLimit } from "@/server/security/rate-limit";
import {
  getOverageCreditsForPriceId,
  getPlanForSubscriptionPrice,
  isAllowedOveragePriceId,
  isAllowedSubscriptionPriceId,
  STRIPE_DEFAULT_OVERAGE_SOURCE,
} from "@/lib/billing/stripe-pricing";

import { logger } from '@/lib/logger';

const checkoutSchema = z.object({
  priceId: z.string(),
  returnUrl: z.string().url(),
  mode: z.enum(["subscription", "payment"]).default("subscription"),
  metadata: z.record(z.string()).optional(),
});

const MAX_CHECKOUT_SOURCE_LENGTH = 64;

function sanitizeMetadataSource(metadata: Record<string, string> | undefined): string {
  const rawSource = metadata?.source;
  if (typeof rawSource !== "string") {
    return STRIPE_DEFAULT_OVERAGE_SOURCE;
  }
  const trimmed = rawSource.trim();
  if (!trimmed || trimmed.length > MAX_CHECKOUT_SOURCE_LENGTH) {
    return STRIPE_DEFAULT_OVERAGE_SOURCE;
  }
  return trimmed;
}

export async function POST(req: NextRequest) {
  return timeApiRoute("stripe.checkout.create", async () => {
    return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
      const rl = await checkRateLimit(userId, stripeCheckoutRateLimit);
      if (!rl.success) {
        return cookieBridge.commit(apiResponse.error("RATE_LIMITED", "Too many checkout requests", 429));
      }

      try {
        let json;
        try {
           json = await req.json();
        } catch {
           return cookieBridge.commit(apiResponse.badRequest("Invalid JSON"));
        }
        
        const result = checkoutSchema.safeParse(json);

        if (!result.success) {
          return cookieBridge.commit(apiResponse.validationError(result.error));
        }

        const { priceId, returnUrl, mode, metadata } = result.data;
        const isPriceAllowed =
          mode === "subscription"
            ? isAllowedSubscriptionPriceId(priceId)
            : isAllowedOveragePriceId(priceId);
        if (!isPriceAllowed) {
          return cookieBridge.commit(apiResponse.badRequest("Invalid price for checkout mode"));
        }
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user || !user.email) {
             return cookieBridge.commit(apiResponse.badRequest("User email required"));
        }
        
        const email = user.email;

        // 1. Ensure Customer Exists
        // user_metadata might handle full_name
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
        const customerId = await createOrGetCustomer(userId, email, fullName);

        const checkoutMetadata: Record<string, string> = { userId };
        if (mode === "subscription") {
          const plan = getPlanForSubscriptionPrice(priceId);
          if (plan) {
            checkoutMetadata.plan = plan;
          }
          if (metadata?.source) {
            checkoutMetadata.source = sanitizeMetadataSource(metadata);
          }
        } else {
          const credits = getOverageCreditsForPriceId(priceId);
          if (credits === null) {
            return cookieBridge.commit(apiResponse.badRequest("Invalid overage package"));
          }
          checkoutMetadata.type = "overage";
          checkoutMetadata.credits = String(credits);
          checkoutMetadata.source = sanitizeMetadataSource(metadata);
        }

        // 2. Create Session
        const sessionUrl = await createCheckoutSession(
          customerId,
          priceId,
          returnUrl,
          mode,
          checkoutMetadata,
        );

        if (!sessionUrl) {
             return cookieBridge.commit(apiResponse.internalError("Failed to create checkout session"));
        }

        return cookieBridge.commit(apiResponse.success({ url: sessionUrl }));

      } catch (error) {
        logger.error("[Stripe] App Checkout Error:", error);
        return cookieBridge.commit(apiResponse.internalError("Internal server error"));
      }
    });
  });
}
