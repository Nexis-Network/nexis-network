// Domain: push
// Responsibility: Client-side subscription helpers (SW registration + PushManager + API calls).
// Depends on: browser APIs

import { unwrapApiPayload } from "@/lib/api-platform";
import { base64UrlToUint8Array, toArrayBuffer } from "@/lib/push/base64url";

type ServerPublicKeyResponse = { publicKey: string };

type SubscribePayload = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

function assertBrowser(): void {
  if (typeof window === "undefined") {
    throw new Error("push_client_browser_only");
  }
}

async function getVapidPublicKey(): Promise<string> {
  const res = await fetch("/api/notifications/push/public-key", { credentials: "include" });
  if (!res.ok) {
    throw new Error("push_public_key_unavailable");
  }
  const json = (await res.json()) as UntypedJson;
  const payload = unwrapApiPayload<ServerPublicKeyResponse>(json) ?? (json as ServerPublicKeyResponse | null);
  const publicKey = typeof payload?.publicKey === "string" ? payload.publicKey.trim() : "";

  if (!publicKey) {
    throw new Error("push_public_key_invalid");
  }

  return publicKey;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  assertBrowser();
  if (!("serviceWorker" in navigator)) return null;

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return await registration.pushManager.getSubscription();
}

export async function enablePushNotifications(): Promise<{ subscribed: boolean }>
{
  assertBrowser();

  if (!("Notification" in window)) {
    throw new Error("notifications_not_supported");
  }
  if (!("serviceWorker" in navigator)) {
    throw new Error("service_worker_not_supported");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { subscribed: false };
  }

  const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    // Ensure server has latest last_seen.
    await fetch("/api/notifications/push/subscribe", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(existing.toJSON()),
    });
    return { subscribed: true };
  }

  const publicKey = await getVapidPublicKey();
  const applicationServerKey = toArrayBuffer(base64UrlToUint8Array(publicKey));

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  const payload = subscription.toJSON() as SubscribePayload;

  const res = await fetch("/api/notifications/push/subscribe", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("push_subscribe_failed");
  }

  return { subscribed: true };
}

export async function disablePushNotifications(): Promise<{ unsubscribed: boolean }>
{
  assertBrowser();

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = registration ? await registration.pushManager.getSubscription() : null;

  if (subscription) {
    try {
      await fetch("/api/notifications/push/unsubscribe", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
    } catch {
      // best-effort
    }

    try {
      await subscription.unsubscribe();
    } catch {
      // best-effort
    }
  }

  return { unsubscribed: true };
}
