// Domain: notifications
// Responsibility: Enqueue push notifications (dedupe + rate limit) without blocking caller.
// Depends on: Supabase admin client + DB rate limiter function

import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import type { NotificationTemplate } from "@/server/notifications/types";

const DEFAULT_PER_USER_PER_MINUTE = Number(process.env.PUSH_RATE_LIMIT_PER_USER_PER_MINUTE ?? 10);
const DEFAULT_PER_TYPE_PER_MINUTE = Number(process.env.PUSH_RATE_LIMIT_PER_TYPE_PER_MINUTE ?? 4);

async function consumeBudget(params: { userId: string; bucket: string; limit: number }): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("consume_notification_budget", {
    p_user_id: params.userId,
    p_notif_type: params.bucket,
    p_limit: params.limit,
    p_window_seconds: 60,
  });

  if (error) {
    // Fail-open (don’t block tx flow if limiter fails), but still safe due to dedupe.
    return true;
  }

  return Boolean(data);
}

export async function enqueueNotification(params: {
  userId: string;
  template: NotificationTemplate;
  source?: string;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const source = params.source ?? "wallet";

  // Dedupe and rate-limit should not block the main flow; treat all failures as best-effort.
  try {
    const allowUser = await consumeBudget({ userId: params.userId, bucket: "__all__", limit: DEFAULT_PER_USER_PER_MINUTE });
    const allowType = await consumeBudget({ userId: params.userId, bucket: params.template.type, limit: DEFAULT_PER_TYPE_PER_MINUTE });

    const rateLimited = !allowUser || !allowType;

    const insert = await supabase
      .from("notifications")
      .insert({
        user_id: params.userId,
        source,
        title: params.template.title,
        body: params.template.body,
        status: "info",
        url: params.template.url,
        metadata: params.template.data,
        type: params.template.type,
        data: params.template.data,
        dedupe_key: params.template.dedupeKey,
        dispatch_status: rateLimited ? "suppressed" : "queued",
        error: rateLimited ? "rate_limited" : null,
        next_attempt_at: rateLimited ? null : new Date().toISOString(),
      })
      .select("id")
      .single();

    // Unique constraint conflict => already enqueued.
    if (insert.error) {
      if (String(insert.error.code) === "23505") {
        return;
      }
    }
  } catch {
    // ignore
  }
}
