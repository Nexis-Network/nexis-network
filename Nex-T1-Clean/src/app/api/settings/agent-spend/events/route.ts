import { connection } from "next/server";
import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { createClient as createServerSupabaseClient } from "@/server/services/supabase/server";


export async function GET(request: Request) {
  await connection();
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(cookieBridge, { request });
  if (!context?.userId) {
    return cookieBridge.commit(apiResponse.unauthorized("unauthorized"));
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return cookieBridge.commit(apiResponse.serviceUnavailable("supabase_unconfigured"));
  }

  const { data, error } = await supabase
    .from("wallet_events")
    .select("id,chain_id,safe_address,event_type,status,title,body,metadata,created_at")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false })
    .limit(100);

  return cookieBridge.commit(
    apiResponse.success({
      events: data ?? [],
      error: error?.message ?? null,
      generatedAt: new Date().toISOString(),
    }),
  );
}

