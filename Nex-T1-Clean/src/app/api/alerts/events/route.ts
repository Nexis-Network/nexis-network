import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseServerClient } from "@/server/services/supabase/supabaseClient";

export async function GET(request: Request) {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(cookieBridge, { request });

  if (!context?.userId) {
    return cookieBridge.commit(apiResponse.unauthorized());
  }

  const supabase = await getSupabaseServerClient({ accessToken: context.accessToken });
  if (!supabase) {
    return cookieBridge.commit(apiResponse.serviceUnavailable("Supabase unavailable"));
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const offsetRaw = Number(url.searchParams.get("offset") ?? "0");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 100) : 50;
  const offset = Number.isFinite(offsetRaw) ? Math.max(Math.trunc(offsetRaw), 0) : 0;

  const { data, error } = await supabase
    .from("alert_events")
    .select("id,rule_id,source,scope_type,scope_ref,status,severity,title,body,payload,triggered_at")
    .eq("user_id", context.userId)
    .order("triggered_at", { ascending: false })
    .range(offset, offset + limit);

  if (error) {
    return cookieBridge.commit(apiResponse.internalError(error.message));
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return cookieBridge.commit(
    apiResponse.success({
      items,
      page: {
        offset,
        limit,
        hasMore,
        nextOffset: hasMore ? offset + limit : null,
      },
    }),
  );
}
