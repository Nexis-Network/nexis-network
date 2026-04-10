import { cookies } from "next/headers";
import { connection, NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";


export async function GET(request: NextRequest) {
  await connection();
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(cookieBridge, { refreshSession: false, request });

  if (!context?.userId) {
    return cookieBridge.commit(apiResponse.unauthorized("unauthorized"));
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint,is_active,disabled_at,fail_count,last_seen_at")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return cookieBridge.commit(apiResponse.success({ subscriptions: [], error: error.message }));
  }

  return cookieBridge.commit(apiResponse.success({ subscriptions: data ?? [] }));
}
