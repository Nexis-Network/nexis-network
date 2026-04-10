// Domain: notifications
// Responsibility: Emit wallet_events + enqueue push notification (best-effort).
// Depends on: Supabase admin client
// Notes: Never blocks the primary flow.

import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { mapWalletEventToNotification } from "@/server/notifications/mapping";
import { enqueueNotification } from "@/server/notifications/enqueue";

type WalletEventInsert = {
  user_id: string;
  chain_id?: number;
  safe_address?: string;
  event_type: string;
  status: string;
  title: string;
  body?: string | null;
  metadata?: Record<string, UntypedJson>;
  payload?: Record<string, UntypedJson>;
};

export async function emitWalletEvent(params: WalletEventInsert): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const row = {
    ...params,
    metadata: params.metadata ?? {},
    payload: params.payload ?? null,
  };

  try {
    await supabase.from("wallet_events").insert(row);
  } catch {
    // ignore
  }

  try {
    const template = mapWalletEventToNotification({
      user_id: params.user_id,
      chain_id: typeof params.chain_id === "number" ? params.chain_id : null,
      safe_address: typeof params.safe_address === "string" ? params.safe_address : null,
      event_type: params.event_type,
      title: params.title,
      body: params.body ?? null,
      metadata: params.metadata ?? {},
      payload: params.payload ?? null,
    });

    if (!template) return;
    await enqueueNotification({ userId: params.user_id, template, source: "wallet" });
  } catch {
    // ignore
  }
}
