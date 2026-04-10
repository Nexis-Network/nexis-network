import { cookies } from "next/headers";
import { connection, NextRequest, NextResponse } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { timeApiRoute } from "@/server/instrumentation/metrics";


// ---------------------------------------------------------------------------
// GET /api/cdp/notifications/count
// Returns the unread CDP notification count for the authenticated user.
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  await connection();
  return timeApiRoute("cdp.notifications.count", async () => {
    const jar = await cookies();
    const cookieBridge = createCookieBridge(jar);
    const { context } = await resolveSupabaseContext(cookieBridge, {
      refreshSession: false,
      request,
    });

    if (!context?.userId) {
      return cookieBridge.commit(apiResponse.unauthorized());
    }

    const supabase = getSupabaseAdminClient();

    // Count notifications where metadata->>read is not 'true' (or metadata is null)
    // We use source = 'transaction' to scope to CDP-originated notifications.
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("source", "transaction")
      .or("metadata->cdp_event_type.is.null,metadata->>read.neq.true");

    if (error) {
      return cookieBridge.commit(
        apiResponse.success({ unread: 0, error: error.message }),
      );
    }

    return cookieBridge.commit(
      apiResponse.success({ unread: count ?? 0 }),
    );
  });
}
