/**
 * MCP Reconnection with Exponential Backoff
 *
 * Provides backoff calculation and abortable sleep for MCP connection retries.
 * Max 5 attempts with 1s-30s exponential backoff and 20% jitter.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

// ---------------------------------------------------------------------------
// Backoff Calculation
// ---------------------------------------------------------------------------

export function backoffMs(attempt: number): number {
  const exponential = BASE_BACKOFF_MS * Math.pow(2, attempt);
  // Add jitter (up to 20%) BEFORE clamping so the max is always respected
  const jitter = Math.floor(Math.random() * exponential * 0.2);
  return Math.min(exponential + jitter, MAX_BACKOFF_MS);
}

// ---------------------------------------------------------------------------
// Abortable Sleep
// ---------------------------------------------------------------------------

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error("Aborted"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason ?? new Error("Aborted"));
    }, { once: true });
  });
}

// ---------------------------------------------------------------------------
// Reconnection Controller Management
// ---------------------------------------------------------------------------

/** Active reconnection abort controllers, keyed by server name. */
const reconnectControllers = new Map<string, AbortController>();

/**
 * Cancel any in-progress reconnection for a server.
 */
export function cancelReconnect(serverName: string): void {
  const controller = reconnectControllers.get(serverName);
  if (controller) {
    controller.abort();
    reconnectControllers.delete(serverName);
  }
}

/**
 * Cancel all active reconnection controllers.
 */
export function cancelAllReconnects(): void {
  for (const name of reconnectControllers.keys()) {
    cancelReconnect(name);
  }
}

/**
 * Create and register a new AbortController for a server's reconnection.
 * Cancels any existing controller for that server first.
 */
export function createReconnectController(serverName: string): AbortController {
  cancelReconnect(serverName);
  const controller = new AbortController();
  reconnectControllers.set(serverName, controller);
  return controller;
}

/**
 * Remove the reconnection controller for a server (cleanup after completion).
 */
export function removeReconnectController(serverName: string): void {
  reconnectControllers.delete(serverName);
}
