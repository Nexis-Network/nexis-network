/**
 * Polymarket Bridge API Client
 *
 * Handles deposits, withdrawals, and transaction status tracking.
 * All endpoints are public (no auth required).
 *
 * Base URL: https://bridge.polymarket.com
 * Source: https://docs.polymarket.com/trading/bridge/deposit
 */

import { logger } from "@/lib/logger";
import { withRedisCache } from "@/server/services/redis/redis-cache";
import { POLYMARKET_BRIDGE_URL, POLYMARKET_CACHE_TTL } from "./constants";
import type {
  DepositAddressResponse,
  BridgeStatusResponse,
  SupportedAsset,
  BridgeStatusPayload,
  DepositInfoPayload,
} from "./types";

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

class BridgeClient {
  private readonly baseUrl: string;

  constructor(baseUrl = POLYMARKET_BRIDGE_URL) {
    this.baseUrl = baseUrl;
  }

  // ── Primitives ──────────────────────────────────────────────────────────

  private async fetch<T>(
    path: string,
    options?: { method?: string; body?: unknown; params?: Record<string, string> },
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (options?.params) {
      for (const [k, v] of Object.entries(options.params)) {
        if (v !== undefined && v !== "") url.searchParams.set(k, v);
      }
    }

    const init: RequestInit = {
      method: options?.method ?? "GET",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15_000),
    };

    if (options?.body) {
      init.body = JSON.stringify(options.body);
    }

    const res = await fetch(url.toString(), init);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error(`[polymarket:bridge] ${res.status} ${path}`, { text });
      throw new Error(`Bridge API ${res.status}: ${text.slice(0, 200)}`);
    }

    return res.json() as Promise<T>;
  }

  // ── Deposit ─────────────────────────────────────────────────────────────

  /**
   * Generate unique deposit addresses linked to a Polymarket wallet.
   * Returns addresses for EVM, Solana, Bitcoin, and Tron.
   */
  async createDepositAddress(walletAddress: string): Promise<DepositAddressResponse> {
    return this.fetch<DepositAddressResponse>("/deposit", {
      method: "POST",
      body: { address: walletAddress },
    });
  }

  // ── Status ──────────────────────────────────────────────────────────────

  /**
   * Check the status of a deposit by the deposit address (NOT the wallet address).
   * Poll every 10-30 seconds until terminal state (COMPLETED or FAILED).
   */
  async getStatus(depositAddress: string): Promise<BridgeStatusResponse> {
    return this.fetch<BridgeStatusResponse>(
      `/status/${encodeURIComponent(depositAddress)}`,
    );
  }

  // ── Supported Assets ────────────────────────────────────────────────────

  async getSupportedAssets(): Promise<SupportedAsset[]> {
    return withRedisCache(
      "poly:bridge:supported-assets",
      () => this.fetch<SupportedAsset[]>("/supported-assets"),
      POLYMARKET_CACHE_TTL.BRIDGE_ASSETS,
    );
  }

  // ── Cached Convenience Methods (used by AI tools) ───────────────────────

  async getBridgeStatusPayload(depositAddress: string): Promise<BridgeStatusPayload> {
    const status = await this.getStatus(depositAddress);
    return {
      depositAddress,
      transactions: status.transactions,
    };
  }

  async getDepositInfoPayload(walletAddress: string): Promise<DepositInfoPayload> {
    const [addresses, supportedAssets] = await Promise.all([
      this.createDepositAddress(walletAddress),
      this.getSupportedAssets(),
    ]);

    return { addresses, supportedAssets };
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const bridgeClient = new BridgeClient();
export { BridgeClient };
