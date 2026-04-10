"use client";

type AnalyticsPayload = Record<string, UntypedJson> | undefined;

const ENDPOINT = "/api/analytics/events";

export function trackAgentEvent(name: string, properties: AnalyticsPayload = undefined) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({
    name,
    properties,
    timestamp: new Date().toISOString(),
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon(ENDPOINT, blob);
    return;
  }

  void fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
    keepalive: true,
  }).catch(() => {
    /* best-effort only */
  });
}
