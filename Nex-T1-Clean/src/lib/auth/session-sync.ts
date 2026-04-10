"use client";

import { getRewardDeviceId } from "@/lib/auth/reward-device";

/**
 * Session sync module (client)
 *
 * Domain: auth
 * Responsibility: Trigger post-auth server bootstrap hooks.
 * Depends on: Supabase session only
 *
 * Notes:
 * - Calls a lightweight server endpoint that enqueues/starts idempotent wallet bootstrapping.
 * - Deduplicated by access token to avoid repeated calls during hydration loops.
 */

let lastSyncToken: string | null = null;

function isLikelyJwt(token: string): boolean {
  return token.split(".").length === 3;
}

export async function syncBackendSessions(accessToken: string | null) {
  const token = accessToken?.trim() ?? "";
  if (!token) return;
  if (!isLikelyJwt(token)) return;

  // Avoid spamming the backend with identical syncs during hydration loops.
  if (lastSyncToken === token) return;
  lastSyncToken = token;

  void fetch("/api/wallets/bootstrap", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  })
    .then((response) => {
      if (response.ok) return;
      // Allow another attempt if the backend rejected this sync.
      if (lastSyncToken === token) {
        lastSyncToken = null;
      }
    })
    .catch(() => {
      // Allow retry on transient network failures.
      if (lastSyncToken === token) {
        lastSyncToken = null;
      }
    });

  const rewardDeviceId = getRewardDeviceId();
  void fetch("/api/auth/reward-identity", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      deviceId: rewardDeviceId,
    }),
  }).catch(() => undefined);
}

export function __resetSessionSyncStateForTests() {
  lastSyncToken = null;
}
