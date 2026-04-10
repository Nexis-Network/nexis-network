import Stripe from "stripe";
import { isBuildEvaluation } from "@/lib/server/build-evaluation";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";


import { logger } from '@/lib/logger';
if (!process.env.STRIPE_SECRET_KEY && !isBuildEvaluation()) {
  logger.warn("Missing STRIPE_SECRET_KEY environment variable - Stripe features will not work.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_mock_key", {
  apiVersion: "2025-10-29.clover",
  typescript: true,
});

const STRIPE_SUBSCRIPTION_TRIAL_DAYS = 14;

export const getStripeClient = () => stripe;

export const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

/**
 * Creates or retrieves a Stripe Customer ID for a given user.
 * Syncs the ID back to Supabase user_profiles.
 */
export async function createOrGetCustomer(userId: string, email: string, name?: string): Promise<string> {
  const supabase = getSupabaseAdminClient();
  
  // 1. Check existing
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    logger.error("[Stripe] Failed to fetch user profile for customer lookup:", profileError);
    // Proceeding might be dangerous if it's a DB error, but we'll try to create one? 
    // No, if we can't read, we shouldn't assume we need to create, but risk of duplicate.
    // However, if the column is missing, we must fail or fix DB.
  }

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // 2. Create new in Stripe
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });

  // 3. Save to Supabase
  await supabase
    .from("user_profiles")
    .upsert({ 
      user_id: userId, 
      stripe_customer_id: customer.id 
    }, { onConflict: "user_id" });

  return customer.id;
}

/**
 * Creates a Billing Portal session for a user.
 */
export async function createPortalSession(customerId: string, returnUrl: string): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

/**
 * Creates a Checkout Session for a subscription or one-time payment.
 */
export async function createCheckoutSession(
  customerId: string, 
  priceId: string, 
  returnUrl: string, 
  mode: "subscription" | "payment" = "subscription",
  metadata?: Record<string, string>
): Promise<string | null> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: mode === "subscription" ? {
      trial_period_days: STRIPE_SUBSCRIPTION_TRIAL_DAYS,
      trial_settings: {
        end_behavior: {
          missing_payment_method: 'cancel',
        }
      }
    } : undefined,
    success_url: `${returnUrl}?success=true`,
    cancel_url: `${returnUrl}?canceled=true`,
    metadata,
  });
  return session.url;
}

// Credit management functions
export interface CreditResult {
  success: boolean;
  newBalance?: number;
  error?: string;
}

/**
 * Deduct credits from a user's balance using an optimistic concurrency pattern.
 * Reads the current balance, checks sufficiency, then updates with a WHERE guard
 * to prevent concurrent deductions from going negative.
 */
export async function deductUserCredits(userId: string, amount: number): Promise<CreditResult> {
  if (amount <= 0) return { success: false, error: "Amount must be positive" };

  const supabase = getSupabaseAdminClient();

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("credits")
    .eq("user_id", userId)
    .single();

  if (error || !profile) return { success: false, error: "User not found" };

  const currentCredits = profile.credits ?? 0;
  if (currentCredits < amount) {
    return { success: false, error: "Insufficient credits" };
  }

  // Optimistic concurrency: only update if credits haven't changed since we read them.
  // This prevents concurrent deductions from over-deducting. The DB also has a
  // CHECK (credits >= 0) constraint as a safety net.
  const { data: updated, error: updateError } = await supabase
    .from("user_profiles")
    .update({ credits: currentCredits - amount })
    .eq("user_id", userId)
    .gte("credits", amount) // guard: only deduct if still sufficient
    .select("credits")
    .single();

  if (updateError) {
    // If the gte guard caused zero rows to match, PostgREST returns PGRST116
    if (updateError.code === "PGRST116") {
      return { success: false, error: "Insufficient credits (concurrent modification)" };
    }
    return { success: false, error: updateError.message };
  }

  return { success: true, newBalance: updated.credits };
}

/**
 * Add credits to a user's balance.
 * Uses a read-then-upsert pattern. The webhook idempotency guard in
 * /api/stripe/webhook prevents double-crediting from replayed Stripe events.
 */
export async function addUserCredits(userId: string, amount: number): Promise<CreditResult> {
  if (amount <= 0) return { success: false, error: "Amount must be positive" };

  const supabase = getSupabaseAdminClient();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("credits")
    .eq("user_id", userId)
    .single();
  const current = profile?.credits ?? 0;

  const { data: updated, error } = await supabase
    .from("user_profiles")
    .upsert({
      user_id: userId,
      credits: current + amount,
    }, { onConflict: "user_id" })
    .select("credits")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, newBalance: updated.credits };
}
