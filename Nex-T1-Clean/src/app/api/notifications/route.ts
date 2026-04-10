import { cookies } from "next/headers";
import { connection, NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import type { NotificationItem } from "@/lib/notifications";


// Domain: notifications
// Responsibility: Provide notification feed for authenticated users
// Depends on: Supabase auth context

export async function GET(request: NextRequest) {
  await connection();
  return timeApiRoute("notifications.list", async () => {
    const jar = await cookies();
    const cookieBridge = createCookieBridge(jar);
    const { context } = await resolveSupabaseContext(cookieBridge, { refreshSession: false, request });

    if (!context?.userId) {
      return cookieBridge.commit(apiResponse.unauthorized());
    }

    const supabase = getSupabaseAdminClient();
    const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "50");
    const offsetRaw = Number(request.nextUrl.searchParams.get("offset") ?? "0");
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 100) : 50;
    const offset = Number.isFinite(offsetRaw) ? Math.max(Math.trunc(offsetRaw), 0) : 0;

    const { data, error } = await supabase
      .from("notifications")
      .select("id,source,title,body,status,url,metadata,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit);

    if (error) {
      return cookieBridge.commit(
        apiResponse.success({
          notifications: [],
          generatedAt: new Date().toISOString(),
          error: error.message,
        }),
      );
    }

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const notifications: NotificationItem[] = pageRows.map((row) => ({
      id: String(row.id),
      source: (row.source) ?? "system",
      title: String(row.title ?? ""),
      description: row.body ?? null,
      timestamp: String(row.created_at ?? new Date().toISOString()),
      status: (row.status) ?? "info",
      metadata: (row.metadata) ?? undefined,
      url: row.url ?? null,
    }));

    return cookieBridge.commit(
      apiResponse.success({
        notifications,
        page: {
          offset,
          limit,
          hasMore,
          nextOffset: hasMore ? offset + limit : null,
        },
        generatedAt: new Date().toISOString(),
        meta: { source: "supabase.notifications" },
      }),
    );
  });
}
