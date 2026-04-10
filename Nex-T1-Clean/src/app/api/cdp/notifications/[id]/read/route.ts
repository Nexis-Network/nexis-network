import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { logger } from "@/lib/logger";


// ---------------------------------------------------------------------------
// POST /api/cdp/notifications/[id]/read
// Marks a CDP notification as read by setting metadata.read = true.
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  return timeApiRoute("cdp.notifications.markRead", async () => {
    const jar = await cookies();
    const cookieBridge = createCookieBridge(jar);
    const { context } = await resolveSupabaseContext(cookieBridge, {
      refreshSession: false,
      request,
    });

    if (!context?.userId) {
      return cookieBridge.commit(apiResponse.unauthorized());
    }

    const { id: notificationId } = await params;

    if (!notificationId || notificationId.length === 0) {
      return cookieBridge.commit(
        apiResponse.badRequest("Notification ID is required"),
      );
    }

    const supabase = getSupabaseAdminClient();

    // Fetch the notification to verify ownership and get existing metadata
    const { data: existing, error: fetchError } = await supabase
      .from("notifications")
      .select("id,user_id,metadata")
      .eq("id", notificationId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (fetchError) {
      logger.error("cdp_notification_mark_read_fetch_error", {
        notificationId,
        error: fetchError.message,
      });
      return cookieBridge.commit(
        apiResponse.error("INTERNAL_ERROR", "Failed to fetch notification", 500),
      );
    }

    if (!existing) {
      return cookieBridge.commit(apiResponse.notFound("Notification not found"));
    }

    // Merge read flag into existing metadata
    const existingMeta = (existing.metadata as Record<string, unknown>) ?? {};
    const updatedMeta = { ...existingMeta, read: true };

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ metadata: updatedMeta })
      .eq("id", notificationId)
      .eq("user_id", context.userId);

    if (updateError) {
      logger.error("cdp_notification_mark_read_update_error", {
        notificationId,
        error: updateError.message,
      });
      return cookieBridge.commit(
        apiResponse.error("INTERNAL_ERROR", "Failed to mark notification as read", 500),
      );
    }

    return cookieBridge.commit(
      apiResponse.success({ id: notificationId, read: true }),
    );
  });
}
