import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { redis } from "@/server/services/redis";
import { PRICE_TO_PLAN_MAP, syncStripeDataToKV, type STRIPE_SUB_CACHE } from "@/lib/stripe-sync";
import type { CreditTier } from "@/server/services/credits/credit-service";


import { logger } from '@/lib/logger';
const PLAN_DETAILS: Record<string, { name: string; price: string; interval: string }> = {
  free: { name: "Free", price: "$0.00", interval: "month" },
  pro: { name: "Pro", price: "$29.99", interval: "month" },
  trader: { name: "Trader", price: "$79.99", interval: "month" },
  ultra: { name: "Ultra", price: "$199.99", interval: "month" },
  enterprise: { name: "Enterprise", price: "$599.99", interval: "month" },
};

const applyCachedSubscriptionState = (
  subData: STRIPE_SUB_CACHE,
  currentPlan: CreditTier,
): { plan: CreditTier; status: string; renewsAt: string | null; cancelAtPeriodEnd: boolean } => {
  if (subData.status === "none") {
    return {
      plan: currentPlan,
      status: "active",
      renewsAt: null,
      cancelAtPeriodEnd: false,
    };
  }

  const mappedPlan = subData.priceId ? PRICE_TO_PLAN_MAP[subData.priceId] ?? currentPlan : currentPlan;
  return {
    plan: mappedPlan,
    status: subData.status,
    renewsAt: subData.currentPeriodEnd ? new Date(subData.currentPeriodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: Boolean(subData.cancelAtPeriodEnd),
  };
};

export async function GET(req: NextRequest) {
  const auth = await withAuth(req, { requireOrg: false });
  if (!auth.ok) {
    return auth.response;
  }
  if (!auth.session?.user?.id) {
    return apiResponse.unauthorized();
  }

  const userId = auth.session.user.id;
  const admin = getSupabaseAdminClient();

  // 1. Get Customer ID
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("stripe_customer_id, plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    return apiResponse.internalError("Failed to load billing profile");
  }

  const customerId = profile?.stripe_customer_id;
  
  let planKey: CreditTier = (profile?.plan as CreditTier) || "free";
  let status = "active"; // Default for free
  let renewsAt: string | null = null;
  let cancelAtPeriodEnd = false;

  // 2. Try to get details from Redis cache, then fall back to Stripe sync when cache is missing/stale.
  if (customerId) {
    let subData: STRIPE_SUB_CACHE | null = null;
    const cached = await redis.get(`stripe:customer:${customerId}`);
    if (cached) {
      try {
        subData = JSON.parse(cached as string) as STRIPE_SUB_CACHE;
      } catch (e) {
        logger.error("Failed to parse stripe cache", e);
      }
    }

    if (!subData) {
      try {
        subData = await syncStripeDataToKV(customerId);
      } catch (error) {
        logger.error("Failed to sync stripe cache from provider", error);
      }
    }

    if (subData) {
      const resolved = applyCachedSubscriptionState(subData, planKey);
      planKey = resolved.plan;
      status = resolved.status;
      renewsAt = resolved.renewsAt;
      cancelAtPeriodEnd = resolved.cancelAtPeriodEnd;
    }
  }

  const details = PLAN_DETAILS[planKey] || PLAN_DETAILS.free;

  return apiResponse.success({
    product: details.name,
    price: details.price,
    interval: details.interval,
    status: status,
    renewsAt: renewsAt,
    cancelAtPeriodEnd,
  });
}
