// Domain: notifications
// Responsibility: Web Push sender wrapper (web-push) with Safe defaults.
// Depends on: web-push, VAPID config
// Notes:
// - Never log VAPID private key or subscription auth secrets.

import webpush from "web-push";

import { requireVapidConfig } from "@/server/notifications/config";

export type PushMessage = {
  title: string;
  body: string;
  url: string;
  data?: Record<string, UntypedJson>;
};

export type StoredSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  const cfg = requireVapidConfig();
  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
  configured = true;
}

export async function sendWebPush(params: {
  subscription: StoredSubscription;
  message: PushMessage;
}): Promise<{ ok: true } | { ok: false; statusCode?: number; message: string }> {
  try {
    ensureConfigured();

    await webpush.sendNotification(
      {
        endpoint: params.subscription.endpoint,
        keys: {
          p256dh: params.subscription.p256dh,
          auth: params.subscription.auth,
        },
      },
      JSON.stringify({
        title: params.message.title,
        body: params.message.body,
        url: params.message.url,
        data: params.message.data ?? {},
      }),
      {
        TTL: 60,
      },
    );

    return { ok: true };
  } catch (error: UntypedJson) {
    const statusCode = typeof (error as Record<string, UntypedJson>)?.statusCode === "number" ? (error as Record<string, UntypedJson>).statusCode as number : undefined;
    const message = error instanceof Error ? error.message : "push_send_failed";
    return { ok: false, statusCode, message };
  }
}
