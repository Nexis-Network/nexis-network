import { metrics } from "@/server/instrumentation/metrics";


import { logger } from '@/lib/logger';
type LogSessionParams = {
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
  tokenHash?: string | null;
};

const DEDUP_TTL_SECONDS = 3600; // preserved for downstream API

const getEdgeSessionEndpoint = () => {
  const envUrl = process.env.NEXT_PUBLIC_EDGE_SESSION_ENDPOINT;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000/api/internal/log-edge-session";
  }

  if (envUrl) return envUrl;
  if (appUrl) return `${appUrl}/api/internal/log-edge-session`;

  return "http://localhost:3000/api/internal/log-edge-session";
};

const EDGE_SESSION_ENDPOINT = getEdgeSessionEndpoint();
const EDGE_SESSION_TIMEOUT_MS = Number(process.env.EDGE_SESSION_TIMEOUT_MS ?? 4000);
const EDGE_SESSION_RETRY_ATTEMPTS = Math.max(1, Number(process.env.EDGE_SESSION_RETRY_ATTEMPTS ?? 2));
const EDGE_SESSION_RETRY_BACKOFF_MS = Math.max(50, Number(process.env.EDGE_SESSION_RETRY_BACKOFF_MS ?? 150));

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Edge-safe session logging.
 * Always forwards to the Node API which talks to Railway Redis; no Upstash.
 */
export async function recordEdgeSession(params: LogSessionParams): Promise<void> {
  let success = false;
  for (let attempt = 1; attempt <= EDGE_SESSION_RETRY_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const abortReason = new DOMException(
      `edge session log timed out after ${EDGE_SESSION_TIMEOUT_MS}ms`,
      "AbortError",
    );
    const timeout = setTimeout(() => controller.abort(abortReason), EDGE_SESSION_TIMEOUT_MS);

    try {
      const res = await fetch(EDGE_SESSION_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-nexis-internal-secret": process.env.CRON_SECRET || "local-secret",
        },
        body: JSON.stringify({ ...params, dedupTtlSeconds: DEDUP_TTL_SECONDS }),
        cache: "no-store",
        keepalive: true,
        signal: controller.signal,
      });

      if (res.ok) {
        success = true;
        metrics.vendorCall("edge_session_forward", true);
        break;
      }

      const detail = await res.text().catch(() => res.statusText);
      logger.warn("edge_session_log_failed", res.status, detail);
    } catch (error) {
      const isAbort =
        error instanceof DOMException
          ? error.name === "AbortError"
          : error instanceof Error && error.name === "AbortError";
      logger.warn("edge_session_log_failed", isAbort ? "timeout" : error);
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < EDGE_SESSION_RETRY_ATTEMPTS) {
      await wait(EDGE_SESSION_RETRY_BACKOFF_MS * attempt);
    }
  }

  if (!success) {
    metrics.vendorCall("edge_session_forward", false);
  }
}
