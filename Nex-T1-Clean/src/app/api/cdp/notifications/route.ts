import { cookies } from "next/headers";
import { connection, NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { timeApiRoute } from "@/server/instrumentation/metrics";


// ---------------------------------------------------------------------------
// Query params validation
// ---------------------------------------------------------------------------

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  unreadOnly: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((v) => v === "true" || v === "1"),
  cursor: z.string().optional(),
});

// ---------------------------------------------------------------------------
// GET /api/cdp/notifications
// Lists CDP notifications for the authenticated user.
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  await connection();
  return timeApiRoute("cdp.notifications.list", async () => {
    const jar = await cookies();
    const cookieBridge = createCookieBridge(jar);
    const { context } = await resolveSupabaseContext(cookieBridge, {
      refreshSession: false,
      request,
    });

    if (!context?.userId) {
      return cookieBridge.commit(apiResponse.unauthorized());
    }

    // Parse query params
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      limit: url.searchParams.get("limit") ?? undefined,
      unreadOnly: url.searchParams.get("unreadOnly") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
    });

    const params = parsed.success
      ? parsed.data
      : { limit: 30, unreadOnly: false, cursor: undefined };

    const supabase = getSupabaseAdminClient();

    let query = supabase
      .from("notifications")
      .select("id,source,title,body,status,url,metadata,created_at")
      .eq("user_id", context.userId)
      .eq("source", "transaction")
      .order("created_at", { ascending: false })
      .limit(params.limit + 1); // fetch one extra to determine hasMore

    // Filter to only unread notifications by checking metadata->read
    if (params.unreadOnly) {
      query = query.or(
        "metadata->cdp_event_type.is.null,metadata->>read.eq.false",
      );
    }

    // Cursor-based pagination: cursor is the created_at of the last item
    if (params.cursor) {
      query = query.lt("created_at", params.cursor);
    }

    const { data, error } = await query;

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
    const hasMore = rows.length > params.limit;
    const items = hasMore ? rows.slice(0, params.limit) : rows;

    const notifications = items.map((row) => ({
      id: String(row.id),
      source: (row.source as string) ?? "transaction",
      title: String(row.title ?? ""),
      message: row.body ?? null,
      timestamp: String(row.created_at ?? new Date().toISOString()),
      status: (row.status as string) ?? "info",
      metadata: (row.metadata as Record<string, unknown>) ?? undefined,
      read: Boolean(
        (row.metadata as Record<string, unknown> | null)?.read ?? false,
      ),
      type:
        ((row.metadata as Record<string, unknown> | null)?.cdp_event_type as string) ??
        null,
    }));

    const lastItem = items.length > 0 ? items[items.length - 1] : null;
    const nextCursor = hasMore && lastItem
      ? String(lastItem.created_at ?? "")
      : null;

    return cookieBridge.commit(
      apiResponse.success(
        {
          notifications,
          generatedAt: new Date().toISOString(),
        },
        {
          hasMore,
          nextCursor,
          limit: params.limit,
        },
      ),
    );
  });
}
