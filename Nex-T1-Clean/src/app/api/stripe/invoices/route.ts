import { connection, NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { isStripeConfigured, stripe } from "@/lib/stripe";


import { logger } from '@/lib/logger';
export async function GET(req: NextRequest) {
  await connection();
  try {
    const auth = await withAuth(req, { requireOrg: false });
    if (!auth.ok) {
      return auth.response;
    }
    if (!auth.session?.user?.id) {
      return apiResponse.unauthorized("Unauthorized");
    }

    const userId = auth.session.user.id;
    const admin = getSupabaseAdminClient();

    // 1. Get Customer ID from Supabase profile
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      logger.error("[Billing] Failed to fetch user profile:", profileError);
      return apiResponse.internalError("Failed to load billing profile");
    }

    const customerId = profile?.stripe_customer_id;

    if (!customerId) {
        logger.debug(`[Billing] No stripe_customer_id found for user ${userId}`);
        return apiResponse.success([]);
    }

    // 2. Fetch invoices from Stripe
    try {
        if (!isStripeConfigured()) {
          return apiResponse.serviceUnavailable("Stripe is not configured");
        }
        const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: 10,
        status: 'paid',
        });

        const formattedInvoices = invoices.data.map((invoice) => ({
        id: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        date: invoice.created * 1000, // Convert to ms
        pdf: invoice.invoice_pdf,
        number: invoice.number,
        }));

        return apiResponse.success(formattedInvoices);
    } catch (stripeError: UntypedJson) {
        const stripeMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
        logger.error("[Billing] Stripe API Error:", stripeMessage);
        // Differentiate between user errors (e.g. invalid customer) and system errors
        if ((stripeError as Record<string, UntypedJson>)?.code === 'resource_missing') {
             logger.warn(`[Billing] Customer ${customerId} not found in Stripe. Returning empty list.`);
             return apiResponse.success([]);
        }
        return apiResponse.error("STRIPE_ERROR", "Failed to fetch invoices from payment provider", 502);
    }
  } catch (error) {
    logger.error("[Billing] Unexpected error in invoices route:", error);
    return apiResponse.internalError("Internal server error");
  }
}
