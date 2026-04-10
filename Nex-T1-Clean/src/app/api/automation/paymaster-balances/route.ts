import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  listPaymasterBalances,
  upsertPaymasterBalance,
} from "@/server/automation/service";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

/**
 * GET /api/automation/paymaster-balances
 *
 * The `engine_paymaster_balances` table has RLS policies that restrict access
 * to the `service_role`. Authenticated users would receive empty arrays when
 * querying with their own JWT. We use the admin (service-role) client for the
 * actual data query while still enforcing authentication via `withAuthedSupabase`.
 */
export async function GET() {
  return withAuthedSupabase(async ({ cookieBridge }) => {
    try {
      const adminClient = getSupabaseAdminClient();
      const balances = await listPaymasterBalances(adminClient);
      return cookieBridge.commit(apiResponse.success({ items: balances }));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("PAYMASTER_BALANCE_ERROR", error instanceof Error ? error.message : "Failed to load paymaster balances", 500),
      );
    }
  });
}

export async function PUT(request: Request) {
  return withAuthedSupabase(async ({ cookieBridge }) => {
    try {
      const adminClient = getSupabaseAdminClient();
      const body = await request.json();
      const updated = await upsertPaymasterBalance(adminClient, body);
      return cookieBridge.commit(apiResponse.success(updated));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("PAYMASTER_UPDATE_ERROR", error instanceof Error ? error.message : "Failed to update paymaster balance", 400),
      );
    }
  });
}
