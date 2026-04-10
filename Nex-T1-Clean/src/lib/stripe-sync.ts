import type { Stripe } from "stripe";
import { redis } from "@/server/services/redis";
import { stripe } from "./stripe";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { CreditTier } from "@/server/services/credits/credit-service";
import { STRIPE_SUBSCRIPTION_PRICE_TO_PLAN } from "@/lib/billing/stripe-pricing";


import { logger } from '@/lib/logger';
export type STRIPE_SUB_CACHE =
  | {
      subscriptionId: string | null;
      status: Stripe.Subscription.Status;
      priceId: string | null;
      currentPeriodStart: number | null;
      currentPeriodEnd: number | null;
      cancelAtPeriodEnd: boolean;
      paymentMethod: {
        brand: string | null;
        last4: string | null;
      } | null;
    }
  | {
      status: "none";
    };

export const PRICE_TO_PLAN_MAP: Record<string, CreditTier> = {
  ...STRIPE_SUBSCRIPTION_PRICE_TO_PLAN,
};

export async function syncStripeDataToKV(
  customerId: string
): Promise<STRIPE_SUB_CACHE> {
  try {
    // Fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: "all",
      expand: ["data.default_payment_method"],
    });

    const supabase = getSupabaseAdminClient();

    if (subscriptions.data.length === 0) {
      logger.debug(`[StripeSync] No active subscription for customer ${customerId}, defaulting to free`);
      const subData: STRIPE_SUB_CACHE = { status: "none" };
      await redis.set(`stripe:customer:${customerId}`, JSON.stringify(subData));
      
      // Update Supabase to free if no subscription found
      const { error } = await supabase
        .from("user_profiles")
        .update({ plan: "free" })
        .eq("stripe_customer_id", customerId);

      if (error) {
        logger.error(`[StripeSync] Failed to reset plan to free for customer ${customerId}:`, error);
      }

      return subData;
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0].price.id;
    const plan = PRICE_TO_PLAN_MAP[priceId] || "free";

    // Store complete subscription state
    const subData: STRIPE_SUB_CACHE = {
      subscriptionId: subscription.id,
      status: subscription.status,
      priceId: priceId,
      currentPeriodEnd: subscription.items.data[0].current_period_end,
      currentPeriodStart: subscription.items.data[0].current_period_start,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      paymentMethod:
        subscription.default_payment_method &&
        typeof subscription.default_payment_method !== "string"
          ? {
              brand: subscription.default_payment_method.card?.brand ?? null,
              last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : null,
    };

    // Store the data in Redis
    await redis.set(`stripe:customer:${customerId}`, JSON.stringify(subData));

    // Update Supabase
    if (subscription.status === 'active' || subscription.status === 'trialing') {
         logger.debug(`[StripeSync] Updating plan to ${plan} for customer ${customerId}`);
         const { error } = await supabase
        .from("user_profiles")
        .update({ plan: plan })
        .eq("stripe_customer_id", customerId);

        if (error) {
            logger.error(`[StripeSync] Failed to update plan to ${plan} for customer ${customerId}:`, error);
        }
    } else {
         logger.debug(`[StripeSync] Subscription status ${subscription.status}, defaulting to free for customer ${customerId}`);
         const { error } = await supabase
        .from("user_profiles")
        .update({ plan: "free" })
        .eq("stripe_customer_id", customerId);

        if (error) {
            logger.error(`[StripeSync] Failed to reset plan to free (status: ${subscription.status}) for customer ${customerId}:`, error);
        }
    }

    return subData;
  } catch (error) {
    logger.error("Error syncing Stripe data to Redis:", error);
    throw error;
  }
}
