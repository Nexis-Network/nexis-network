/**
 * CDP Server-Side Client Singleton
 *
 * Creates and caches a `CdpClient` instance from @coinbase/cdp-sdk
 * for server-side operations like wallet pre-generation.
 *
 * Configuration is read from environment variables:
 * - CDP_API_KEY_ID
 * - CDP_API_KEY_SECRET
 * - CDP_WALLET_SECRET
 *
 * The client is lazily initialized on first call and reused afterward.
 */
import "server-only";

import { logger } from "@/lib/logger";

let _initPromise: Promise<CdpClientInstance | null> | null = null;
let _initTime = 0;

/** Max age of the singleton before re-initialization (1 hour) */
const CLIENT_TTL_MS = 60 * 60 * 1000;

type CdpClientInstance = InstanceType<
  typeof import("@coinbase/cdp-sdk").CdpClient
>;

function isCdpServerConfigured(): boolean {
  const keyId = process.env.CDP_API_KEY_ID?.trim() ?? "";
  const keySecret = process.env.CDP_API_KEY_SECRET?.trim() ?? "";
  return keyId.length > 0 && keySecret.length > 0;
}

async function createClient(): Promise<CdpClientInstance | null> {
  if (!isCdpServerConfigured()) {
    logger.warn(
      "cdp_server_client_not_configured",
      "CDP_API_KEY_ID or CDP_API_KEY_SECRET missing — server-side CDP operations will be unavailable.",
    );
    return null;
  }

  try {
    const { CdpClient } = await import("@coinbase/cdp-sdk");

    const client = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID!.trim(),
      apiKeySecret: process.env.CDP_API_KEY_SECRET!.trim(),
      walletSecret: process.env.CDP_WALLET_SECRET?.trim() ?? undefined,
    });

    logger.info("cdp_server_client_initialized");
    return client;
  } catch (error) {
    logger.error("cdp_server_client_init_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Get the singleton CDP server client.
 * Returns null if env vars are missing or initialization fails.
 * Auto-refreshes after CLIENT_TTL_MS to handle credential rotation.
 *
 * The promise itself is the cache — no separate `_client` variable.
 * This eliminates the race window between clearing `_client` and
 * clearing `_initPromise` that existed in the previous implementation.
 */
export async function getCdpClient(): Promise<CdpClientInstance | null> {
  const now = Date.now();

  if (_initPromise && now - _initTime < CLIENT_TTL_MS) {
    return _initPromise;
  }

  if (_initPromise && now - _initTime >= CLIENT_TTL_MS) {
    logger.info("cdp_server_client_ttl_expired", { ageMs: now - _initTime });
  }

  // TTL expired or first call — create new promise atomically
  _initTime = now;
  _initPromise = createClient().catch((err) => {
    logger.error("cdp_server_client_init_unhandled", {
      error: err instanceof Error ? err.message : String(err),
    });
    // Clear the failed promise so the next call retries
    _initPromise = null;
    _initTime = 0;
    return null;
  });

  return _initPromise;
}

/**
 * Reset the CDP client singleton, forcing re-initialization on next getCdpClient() call.
 * Useful after credential rotation or when the client enters an unhealthy state.
 */
export function resetCdpClient(): void {
  _initPromise = null;
  _initTime = 0;
  logger.info("cdp_server_client_reset");
}

/**
 * Check whether CDP server SDK is configured (env vars present).
 */
export { isCdpServerConfigured };
