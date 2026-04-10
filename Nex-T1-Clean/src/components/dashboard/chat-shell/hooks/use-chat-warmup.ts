import { useEffect, useRef } from "react";

import { logger } from "@/lib/logger";

/**
 * Chat Warmup Hook
 *
 * Performs two pre-warming actions once per session after user intent or
 * when the browser is idle and the tab is visible:
 *
 * 1. **Wallet snapshot cache** — POSTs to `/api/chat/warmup` which calls
 *    `buildWalletSnapshotPrompt({ forceRefresh: true })` so that the first
 *    chat query has immediate access to the user's portfolio context.
 *
 * 2. **HTTP/2 connection pool** — Issues a lightweight HEAD request to the
 *    `/api/chat` endpoint. This establishes the HTTP/2 connection + TLS
 *    handshake to the Next.js server early, reducing first-byte latency
 *    on the user's first actual chat message.
 *
 * **Why no AI model pre-warming?**
 * AI providers (OpenAI, Bedrock, etc.) do not support connection-level
 * pre-warming — each inference request is an independent HTTP call from the
 * server. Sending a dummy prompt would incur real token cost on every page
 * load with no user intent signal. The AI SDK (v5) establishes connections
 * lazily on the first call, which is the correct pattern for cost control.
 */
export function useChatWarmup() {
  const warmedUp = useRef(false);

  useEffect(() => {
    if (warmedUp.current || typeof window === "undefined") {
      return;
    }

    const sessionStorageKey = "nex-chat-warmup-v1";
    const idleTimeoutMs = 2000;
    const requestIdleCallback = window.requestIdleCallback?.bind(window);
    const cancelIdleCallback = window.cancelIdleCallback?.bind(window);
    let idleHandle: number | null = null;
    let fallbackTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
    let cancelled = false;

    const markWarmedUp = () => {
      warmedUp.current = true;
      try {
        window.sessionStorage.setItem(sessionStorageKey, "1");
      } catch {
        // Ignore storage errors; the in-memory guard still prevents repeats.
      }
    };

    try {
      if (window.sessionStorage.getItem(sessionStorageKey) === "1") {
        warmedUp.current = true;
        return;
      }
    } catch {
      // Ignore storage errors and fall back to the in-memory guard.
    }

    const runWarmup = async () => {
      if (cancelled || warmedUp.current || document.visibilityState !== "visible") {
        return;
      }

      markWarmedUp();

      try {
        await fetch("/api/chat/warmup", { method: "POST" });
      } catch (error) {
        logger.warn("[chat] warmup: wallet snapshot cache failed", error);
      }

      try {
        await fetch("/api/chat", { method: "HEAD" });
      } catch {
        // HEAD to /api/chat may return 405 — the connection was still opened.
      }
    };

    const clearTimers = () => {
      if (idleHandle !== null && cancelIdleCallback) {
        cancelIdleCallback(idleHandle);
      }
      if (fallbackTimer !== null) {
        globalThis.clearTimeout(fallbackTimer);
      }
      idleHandle = null;
      fallbackTimer = null;
    };

    const triggerWarmup = () => {
      if (warmedUp.current || cancelled || document.visibilityState !== "visible") {
        return;
      }

      clearTimers();
      void runWarmup();
    };

    const scheduleWarmup = () => {
      if (warmedUp.current || cancelled) {
        return;
      }

      if (document.visibilityState !== "visible") {
        return;
      }

      if (requestIdleCallback) {
        idleHandle = requestIdleCallback(triggerWarmup, {
          timeout: idleTimeoutMs,
        });
        return;
      }

      fallbackTimer = globalThis.setTimeout(triggerWarmup, idleTimeoutMs);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleWarmup();
      }
    };

    const handleUserIntent = () => {
      triggerWarmup();
    };

    const intentEvents = [
      "pointerdown",
      "keydown",
      "focusin",
      "touchstart",
      "nex:focusComposer",
    ] as const;

    if (document.visibilityState === "visible") {
      scheduleWarmup();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    intentEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleUserIntent, { passive: true });
    });

    return () => {
      cancelled = true;
      clearTimers();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      intentEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserIntent);
      });
    };
  }, []);
}
