import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { syncStripeDataToKV } from "@/lib/stripe-sync";
import { processReferralPaidUsdcRewardsForCustomer } from "@/server/services/rewards/referral-paid-usdc";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { redis } from "@/server/services/redis";


import { logger } from '@/lib/logger';

/**
 * Webhook event idempotency guard.
 * Uses Redis SET NX with a 48-hour TTL to ensure each Stripe event is processed
 * exactly once. Stripe may replay events, so deduplication is critical to
 * prevent double-crediting and other side effects.
 */
const WEBHOOK_IDEMPOTENCY_TTL_SECONDS = 48 * 60 * 60; // 48 hours
const IDEMPOTENCY_KEY_PREFIX = "stripe:webhook:processed:";

async function isEventAlreadyProcessed(eventId: string): Promise<boolean> {
  try {
    const key = `${IDEMPOTENCY_KEY_PREFIX}${eventId}`;
    const acquired = await redis.trySetNx(key, Date.now(), WEBHOOK_IDEMPOTENCY_TTL_SECONDS);
    // trySetNx returns true if the key was SET (i.e., event is NEW)
    // returns false if the key already existed (i.e., event was ALREADY processed)
    return !acquired;
  } catch (err) {
    // If Redis is down, log and proceed cautiously — we allow processing
    // but log a warning. This is a trade-off: in a Redis outage we risk
    // double processing, but refusing all webhooks would be worse.
    logger.warn("[stripe/webhook] Redis idempotency check failed — proceeding with caution", {
      eventId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("Stripe-Signature") as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET env var is not set");
    return apiResponse.serviceUnavailable("service_misconfigured");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: UntypedJson) {
    const message = error instanceof Error ? error.message : "Webhook construction failed";
    return apiResponse.badRequest(message, "WEBHOOK_ERROR");
  }

  // ---- Idempotency guard: skip already-processed events ----
  const alreadyProcessed = await isEventAlreadyProcessed(event.id);
  if (alreadyProcessed) {
    logger.debug(`[Stripe] Skipping duplicate webhook event ${event.id} (${event.type})`);
    return apiResponse.success({ success: true, deduplicated: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;

        if (userId) {
            const supabase = getSupabaseAdminClient();
            const { error: linkError } = await supabase
                .from("user_profiles")
                .update({ stripe_customer_id: customerId })
                .eq("user_id", userId);

            if (linkError) {
                logger.error(`[Stripe] Failed to link customer ${customerId} to user ${userId}:`, linkError);
            } else {
                logger.debug(`[Stripe] Linked customer ${customerId} to user ${userId}`);
            }
        }

        if (session.mode === "payment" && session.metadata?.type === "overage" && userId) {
            const addedCredits = parseInt(session.metadata.credits || "0", 10);
            if (addedCredits > 0) {
                 const { addUserCredits } = await import("@/lib/stripe");
                 const res = await addUserCredits(userId, addedCredits);
                 if (res.success) {
                      logger.debug(`[Stripe] Added ${addedCredits} overage credits to user ${userId} (event: ${event.id})`);
                 } else {
                      logger.error(`[Stripe] Failed to add overage credits to user ${userId} (event: ${event.id}):`, res.error);
                 }
            }
        } else {
            // Sync data to Redis/Supabase immediately for subscriptions
            await syncStripeDataToKV(customerId);
            await processReferralPaidUsdcRewardsForCustomer(customerId);
        }

        if (userId) {
            logger.debug(`[Stripe] Checkout completed for user ${userId} / customer ${customerId} (event: ${event.id})`);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Keep KV/DB in sync
        await syncStripeDataToKV(customerId);
        await processReferralPaidUsdcRewardsForCustomer(customerId);
        break;
      }

      default:
        logger.debug(`[Stripe] Unhandled event type ${event.type}`);
    }
  } catch (error: UntypedJson) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("[Stripe] Webhook handler failed:", message);
    // On handler failure, remove the idempotency key so the event can be retried
    try {
      await redis.del(`${IDEMPOTENCY_KEY_PREFIX}${event.id}`);
    } catch {
      // Best-effort cleanup
    }
    return apiResponse.internalError("Webhook handler failed", "HANDLER_ERROR");
  }

  return apiResponse.success({ success: true });
}
