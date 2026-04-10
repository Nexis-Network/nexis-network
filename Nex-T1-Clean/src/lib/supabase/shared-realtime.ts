"use client";

type SharedRealtimeListener = () => void;
type SharedRealtimeCleanup = () => void;

type SharedRealtimeEntry = {
  cleanup: SharedRealtimeCleanup;
  listeners: Set<SharedRealtimeListener>;
};

const sharedRealtimeEntries = new Map<string, SharedRealtimeEntry>();

export const DEFAULT_REALTIME_SUBSCRIPTION_DELAY_MS = 250;

export function retainSharedRealtimeSubscription(
  key: string,
  listener: SharedRealtimeListener,
  start: (notify: SharedRealtimeListener) => SharedRealtimeCleanup,
): SharedRealtimeCleanup {
  let entry = sharedRealtimeEntries.get(key);

  if (!entry) {
    const listeners = new Set<SharedRealtimeListener>();
    const notify = () => {
      const current = sharedRealtimeEntries.get(key);
      if (!current) return;

      current.listeners.forEach((callback) => {
        callback();
      });
    };

    entry = {
      listeners,
      cleanup: () => {},
    };
    sharedRealtimeEntries.set(key, entry);
    entry.cleanup = start(notify);
  }

  entry.listeners.add(listener);

  return () => {
    const current = sharedRealtimeEntries.get(key);
    if (!current) return;

    current.listeners.delete(listener);
    if (current.listeners.size > 0) return;

    current.cleanup();
    sharedRealtimeEntries.delete(key);
  };
}

export function deferRealtimeSubscriptionStart(
  start: () => void,
  delayMs = DEFAULT_REALTIME_SUBSCRIPTION_DELAY_MS,
): SharedRealtimeCleanup {
  if (typeof window === "undefined") {
    start();
    return () => {};
  }

  const normalizedDelay = Math.max(0, Math.trunc(delayMs));
  const timeoutId = window.setTimeout(start, normalizedDelay);

  return () => {
    window.clearTimeout(timeoutId);
  };
}

export function __resetSharedRealtimeSubscriptionsForTests() {
  sharedRealtimeEntries.forEach((entry) => {
    entry.cleanup();
  });
  sharedRealtimeEntries.clear();
}
