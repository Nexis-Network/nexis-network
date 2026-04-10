import { NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import { syncStripeDataToKV } from "@/lib/stripe-sync";
import { withAuth } from "@/server/security/with-auth";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

import { logger } from '@/lib/logger';

const cancelSchema = z.object({
  cancelAtPeriodEnd: z.boolean().default(true),
});

const CANCELLABLE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
]);

export async function POST(req: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return apiResponse.serviceUnavailable("Stripe is not configured");
    }

    const auth = await withAuth(req, { requireOrg: false });
    if (!auth.ok) {
      return auth.response;
    }
    if (!auth.session?.user?.id) {
      return apiResponse.unauthorized();
    }

    let json: unknown = {};
    try {
      json = await req.json();
    } catch {
      // Empty or non-JSON body is allowed. Defaults are applied by zod.
    }

    const parsed = cancelSchema.safeParse(json);
    if (!parsed.success) {
      return apiResponse.validationError(parsed.error);
    }

    const userId = auth.session.user.id;
    const admin = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      logger.error("[Stripe] Failed to load billing profile for cancellation", profileError);
      return apiResponse.internalError("Failed to load billing profile");
    }

    const customerId = profile?.stripe_customer_id;
    if (!customerId) {
      return apiResponse.notFound("No active subscription found");
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const subscription = subscriptions.data.find((candidate) =>
      CANCELLABLE_SUBSCRIPTION_STATUSES.has(candidate.status),
    );

    if (!subscription) {
      return apiResponse.notFound("No active subscription found");
    }

    const updated = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: parsed.data.cancelAtPeriodEnd,
    });

    await syncStripeDataToKV(customerId);

    const periodEndTimestamp = updated.items.data[0]?.current_period_end ?? null;
    const periodEnd =
      typeof periodEndTimestamp === "number"
        ? new Date(periodEndTimestamp * 1000).toISOString()
        : null;

    return apiResponse.success({
      subscriptionId: updated.id,
      status: updated.status,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
      currentPeriodEnd: periodEnd,
    });
  } catch (error) {
    logger.error("[Stripe] Cancel subscription route failed", error);
    return apiResponse.internalError("Failed to cancel subscription");
  }
}
