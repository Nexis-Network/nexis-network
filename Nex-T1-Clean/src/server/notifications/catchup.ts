// Domain: notifications
// Responsibility: Catch up wallet_events -> notifications (idempotent via dedupe).
// Depends on: Supabase admin client

import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { mapWalletEventToNotification } from "@/server/notifications/mapping";
import { enqueueNotification } from "@/server/notifications/enqueue";

const DEFAULT_WINDOW_MINUTES = Number(process.env.PUSH_CATCHUP_WINDOW_MINUTES ?? 15);

export async function catchupWalletEventNotifications(params?: { minutes?: number }): Promise<{ scanned: number; enqueued: number }> {
  const minutes = params?.minutes ?? DEFAULT_WINDOW_MINUTES;
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("wallet_events")
    .select("user_id,chain_id,safe_address,event_type,title,body,metadata,payload,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(250);

  if (error || !data) {
    return { scanned: 0, enqueued: 0 };
  }

  let enqueued = 0;
  for (const row of data as UntypedJson[]) {
    const template = mapWalletEventToNotification({
      user_id: String(row.user_id),
      chain_id: typeof row.chain_id === "number" ? row.chain_id : null,
      safe_address: typeof row.safe_address === "string" ? row.safe_address : null,
      event_type: String(row.event_type),
      title: row.title ?? null,
      body: row.body ?? null,
      metadata: (row.metadata) ?? null,
      payload: (row.payload) ?? null,
    });

    if (!template) continue;

    await enqueueNotification({ userId: String(row.user_id), template });
    enqueued++;
  }

  return { scanned: data.length, enqueued };
}
