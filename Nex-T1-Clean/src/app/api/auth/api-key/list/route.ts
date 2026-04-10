import { cookies } from "next/headers";
import { connection, type NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseServerClient } from "@/server/services/supabase/supabaseClient";
import { mapApiKeyRecord, type ApiKeyRecord } from "@/server/security/api-key-utils";


import { logger } from '@/lib/logger';
export async function GET(_request: NextRequest) {
  await connection();
  return timeApiRoute("auth.api-key.list.GET", async () => {
    const jar = await cookies();
    const cookieBridge = createCookieBridge(jar);
    const { context } = await resolveSupabaseContext(cookieBridge, { refreshSession: false });
    if (!context?.userId) {
      return cookieBridge.commit(apiResponse.unauthorized("Not signed in"));
    }

    const client = await getSupabaseServerClient();
    if (!client) {
      return cookieBridge.commit(apiResponse.error("SERVICE_UNAVAILABLE", "Supabase configuration missing", 503));
    }

    try {
      const { data, error } = await client
        .from("api_key")
        .select("*")
        .is("revoked_at", null)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const payload = (data ?? []).map((record) => mapApiKeyRecord(record as ApiKeyRecord));
      return cookieBridge.commit(apiResponse.success(payload));
    } catch (error: UntypedJson) {
      logger.error("api_key_list_failed", error instanceof Error ? error.message : String(error));
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("relation") && message.includes("does not exist")) {
        return cookieBridge.commit(
          apiResponse.error("MAINTENANCE", "API key system is currently unavailable (maintenance).", 503),
        );
      }
      const msg = error instanceof Error ? error.message : "Failed to load API keys";
      return cookieBridge.commit(
        apiResponse.internalError(msg),
      );
    }
  });
}
