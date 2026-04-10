// Domain: notifications
// Responsibility: Dispatch queued notifications to Web Push subscriptions.
// Depends on: Supabase admin client + web-push wrapper
// Notes:
// - Never blocks wallet tx flows. Intended for cron/worker invocation.

import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import {
  isExpoPushToken,
  sendExpoPushMessages,
} from "@/server/notifications/mobile-push";
import { sendWebPush } from "@/server/notifications/webpush";

const BATCH_SIZE = Number(process.env.PUSH_DISPATCH_BATCH_SIZE ?? 50);
const MAX_RETRIES = Number(process.env.PUSH_MAX_RETRIES ?? 5);

function computeBackoffSeconds(retryCount: number): number {
  const attempt = Math.max(0, Math.trunc(retryCount));
  const base = 15;
  const capped = Math.min(3600, base * Math.pow(2, attempt));
  return capped;
}

export async function dispatchQueuedNotifications(): Promise<{ processed: number; sent: number; suppressed: number; failed: number }> {
  const supabase = getSupabaseAdminClient();
  const now = new Date();

  const { data: rows, error } = await supabase
    .from("notifications")
    .select("id,user_id,title,body,url,dispatch_status,retry_count,next_attempt_at,error")
    .in("dispatch_status", ["queued", "retry_scheduled"])
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now.toISOString()}`)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error || !rows || rows.length === 0) {
    return { processed: 0, sent: 0, suppressed: 0, failed: 0 };
  }

  const userIds = Array.from(new Set(rows.map((r) => String(r.user_id))));
  const subsRes = await supabase
    .from("push_subscriptions")
    .select("user_id,endpoint,p256dh,auth,is_active,fail_count")
    .in("user_id", userIds)
    .eq("is_active", true);

  const deviceTokensRes = await supabase
    .from("device_push_tokens")
    .select("user_id,token,token_type,platform,is_active")
    .in("user_id", userIds)
    .eq("is_active", true);

  const subsByUser = new Map<string, UntypedJson[]>();
  (subsRes.data ?? []).forEach((s) => {
    const uid = String(s.user_id);
    const list = subsByUser.get(uid) ?? [];
    list.push(s);
    subsByUser.set(uid, list);
  });

  const deviceTokensByUser = new Map<string, UntypedJson[]>();
  (deviceTokensRes.data ?? []).forEach((token) => {
    const uid = String(token.user_id);
    const list = deviceTokensByUser.get(uid) ?? [];
    list.push(token);
    deviceTokensByUser.set(uid, list);
  });

  let sent = 0;
  let suppressed = 0;
  let failed = 0;

  for (const row of rows as UntypedJson[]) {
    const userId = String(row.user_id);
    const subs = subsByUser.get(userId) ?? [];
    const mobileTokens = (deviceTokensByUser.get(userId) ?? []).filter(
      (token) =>
        String(token.token_type) === "expo" &&
        isExpoPushToken(String(token.token)),
    );

    if (subs.length === 0 && mobileTokens.length === 0) {
      suppressed++;
      await supabase
        .from("notifications")
        .update({ dispatch_status: "suppressed", error: row.error ?? "no_active_subscriptions" })
        .eq("id", row.id);
      continue;
    }

    let anySent = false;
    let lastErr: string | null = null;

    for (const sub of subs) {
      const result = await sendWebPush({
        subscription: {
          endpoint: String(sub.endpoint),
          p256dh: String(sub.p256dh),
          auth: String(sub.auth),
        },
        message: {
          title: String(row.title ?? "Nex"),
          body: String(row.body ?? ""),
          url: String(row.url ?? "/"),
        },
      });

      if (result.ok) {
        anySent = true;
        continue;
      }

      lastErr = result.message;
      if (lastErr.includes("Missing VAPID config")) {
        // Misconfiguration: do not thrash retries.
        break;
      }

      // 410/404 => subscription gone/invalid
      if (result.statusCode === 410 || result.statusCode === 404) {
        await supabase
          .from("push_subscriptions")
          .update({ is_active: false, disabled_at: new Date().toISOString(), fail_count: (Number(sub.fail_count ?? 0) + 1) })
          .eq("user_id", userId)
          .eq("endpoint", String(sub.endpoint));
        continue;
      }

      // transient: increment fail_count but keep active
      await supabase
        .from("push_subscriptions")
        .update({ fail_count: (Number(sub.fail_count ?? 0) + 1), last_seen_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("endpoint", String(sub.endpoint));
    }

    if (mobileTokens.length > 0) {
      try {
        await sendExpoPushMessages(
          mobileTokens.map((token) => ({
            to: String(token.token),
            title: String(row.title ?? "Nex"),
            body: String(row.body ?? ""),
            data: {
              url: String(row.url ?? "/"),
            },
            sound: "default",
            priority: "high",
          })),
          {
            accessToken: process.env.EXPO_PUSH_ACCESS_TOKEN ?? null,
          },
        );
        anySent = true;
      } catch (error) {
        lastErr = error instanceof Error ? error.message : "mobile_push_failed";
      }
    }

    if (anySent) {
      sent++;
      await supabase
        .from("notifications")
        .update({ dispatch_status: "sent", sent_at: new Date().toISOString(), error: null })
        .eq("id", row.id);
      continue;
    }

    const retryCount = Number(row.retry_count ?? 0) + 1;
    if ((lastErr ?? "").includes("Missing VAPID config")) {
      failed++;
      await supabase
        .from("notifications")
        .update({ dispatch_status: "failed", failed_at: new Date().toISOString(), error: "push_not_configured" })
        .eq("id", row.id);
      continue;
    }
    if (retryCount >= MAX_RETRIES) {
      failed++;
      await supabase
        .from("notifications")
        .update({ dispatch_status: "failed", failed_at: new Date().toISOString(), retry_count: retryCount, error: lastErr ?? "push_failed" })
        .eq("id", row.id);
      continue;
    }

    const delay = computeBackoffSeconds(retryCount);
    const nextAttempt = new Date(Date.now() + delay * 1000);
    await supabase
      .from("notifications")
      .update({ dispatch_status: "retry_scheduled", retry_count: retryCount, next_attempt_at: nextAttempt.toISOString(), error: lastErr ?? "push_failed" })
      .eq("id", row.id);
  }

  return { processed: rows.length, sent, suppressed, failed };
}
