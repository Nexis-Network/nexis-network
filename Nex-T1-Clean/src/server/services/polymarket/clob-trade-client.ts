/**
 * Polymarket CLOB Trade Client
 *
 * Handles authenticated trading operations: order placement, cancellation,
 * open orders, and trade history. Requires L2 auth (HMAC) + optional builder headers.
 *
 * IMPORTANT: This client runs server-side only. User L2 credentials are
 * loaded from the encrypted credential store, never from the client.
 *
 * Source: https://docs.polymarket.com/trading/clients/l2
 */

import { createHmac } from "node:crypto";
import { logger } from "@/lib/logger";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  POLYMARKET_CLOB_URL,
  POLY_HEADERS,
} from "./constants";
import { builderSigningProxy } from "./builder-signing-proxy";
import { credentialStore } from "./credential-store";
import type { DecryptedCredential } from "./credential-store";
import type {
  OrderResponse,
  OpenOrder,
  Trade,
  SignedOrder,
  BalanceAllowanceResponse,
  BanStatus,
} from "./types";
import type { PolymarketOrderType } from "./constants";

// ---------------------------------------------------------------------------
// L2 HMAC Signature
// ---------------------------------------------------------------------------

function buildL2Signature(
  secret: string,
  timestamp: string,
  method: string,
  path: string,
  body = "",
): string {
  const message = timestamp + method.toUpperCase() + path + body;
  const hmac = createHmac("sha256", Buffer.from(secret, "base64"));
  hmac.update(message);
  return hmac.digest("base64");
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

class ClobTradeClient {
  private readonly baseUrl: string;

  constructor(baseUrl = POLYMARKET_CLOB_URL) {
    this.baseUrl = baseUrl;
  }

  // ── Authenticated Fetch ─────────────────────────────────────────────────

  private async authFetch<T>(
    creds: DecryptedCredential,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const bodyStr = body ? JSON.stringify(body) : "";

    const signature = buildL2Signature(
      creds.secret,
      timestamp,
      method,
      path,
      bodyStr,
    );

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      [POLY_HEADERS.ADDRESS]: creds.polyAddress,
      [POLY_HEADERS.SIGNATURE]: signature,
      [POLY_HEADERS.TIMESTAMP]: timestamp,
      [POLY_HEADERS.API_KEY]: creds.apiKey,
      [POLY_HEADERS.PASSPHRASE]: creds.passphrase,
    };

    // Add builder headers for order attribution if configured
    if (builderSigningProxy.isConfigured) {
      const builderHeaders = builderSigningProxy.generateHeaders(
        method,
        path,
        bodyStr,
      );
      Object.assign(headers, builderHeaders);
    }

    const init: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(15_000),
    };

    if (body) {
      init.body = bodyStr;
    }

    const res = await fetch(url.toString(), init);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error(`[polymarket:clob-trade] ${res.status} ${method} ${path}`, {
        text,
        address: creds.polyAddress,
      });
      throw new ClobTradeError(res.status, text, method, path);
    }

    return res.json() as Promise<T>;
  }

  // ── Credential Resolution ───────────────────────────────────────────────

  private async resolveCreds(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<DecryptedCredential> {
    const creds = await credentialStore.load(supabase, userId);
    if (!creds) {
      throw new Error(
        "No Polymarket credentials found. Please connect your wallet first.",
      );
    }
    return creds;
  }

  // ── Orders ──────────────────────────────────────────────────────────────

  /**
   * Post a signed order to the CLOB.
   * The order must be pre-signed (e.g., via the CLOB client SDK).
   */
  async postOrder(
    supabase: SupabaseClient,
    userId: string,
    order: SignedOrder,
    orderType: PolymarketOrderType = "GTC",
    deferExec = false,
    postOnly = false,
  ): Promise<OrderResponse> {
    const creds = await this.resolveCreds(supabase, userId);

    const body = {
      order,
      orderType,
      ...(deferExec && { deferExec: true }),
      ...(postOnly && { postOnly: true }),
    };

    return this.authFetch<OrderResponse>(creds, "POST", "/order", body);
  }

  /**
   * Get a specific order by ID.
   */
  async getOrder(
    supabase: SupabaseClient,
    userId: string,
    orderId: string,
  ): Promise<OpenOrder> {
    const creds = await this.resolveCreds(supabase, userId);
    return this.authFetch<OpenOrder>(creds, "GET", `/order/${encodeURIComponent(orderId)}`);
  }

  /**
   * Get all open orders for the authenticated user.
   */
  async getOpenOrders(
    supabase: SupabaseClient,
    userId: string,
    params?: { market?: string; asset_id?: string },
  ): Promise<OpenOrder[]> {
    const creds = await this.resolveCreds(supabase, userId);
    let path = "/orders";

    const searchParams = new URLSearchParams();
    if (params?.market) searchParams.set("market", params.market);
    if (params?.asset_id) searchParams.set("asset_id", params.asset_id);

    const qs = searchParams.toString();
    if (qs) path += `?${qs}`;

    return this.authFetch<OpenOrder[]>(creds, "GET", path);
  }

  /**
   * Get trade history for the authenticated user.
   */
  async getTrades(
    supabase: SupabaseClient,
    userId: string,
    params?: { market?: string; limit?: number },
  ): Promise<Trade[]> {
    const creds = await this.resolveCreds(supabase, userId);
    let path = "/trades";

    const searchParams = new URLSearchParams();
    if (params?.market) searchParams.set("market", params.market);
    if (params?.limit) searchParams.set("limit", String(params.limit));

    const qs = searchParams.toString();
    if (qs) path += `?${qs}`;

    return this.authFetch<Trade[]>(creds, "GET", path);
  }

  // ── Cancel ──────────────────────────────────────────────────────────────

  /**
   * Cancel a single order by ID.
   */
  async cancelOrder(
    supabase: SupabaseClient,
    userId: string,
    orderId: string,
  ): Promise<{ canceled: boolean }> {
    const creds = await this.resolveCreds(supabase, userId);
    return this.authFetch(creds, "DELETE", "/order", { id: orderId });
  }

  /**
   * Cancel multiple orders by their IDs.
   */
  async cancelOrders(
    supabase: SupabaseClient,
    userId: string,
    orderIds: string[],
  ): Promise<{ canceled: boolean }> {
    const creds = await this.resolveCreds(supabase, userId);
    return this.authFetch(creds, "DELETE", "/orders", orderIds);
  }

  /**
   * Cancel all open orders for the authenticated user.
   */
  async cancelAll(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ canceled: boolean }> {
    const creds = await this.resolveCreds(supabase, userId);
    return this.authFetch(creds, "DELETE", "/cancel-all");
  }

  // ── Balance & Allowance ─────────────────────────────────────────────────

  async getBalanceAllowance(
    supabase: SupabaseClient,
    userId: string,
    params?: { asset_type?: string; signature_type?: number },
  ): Promise<BalanceAllowanceResponse> {
    const creds = await this.resolveCreds(supabase, userId);
    let path = "/balance-allowance";

    const searchParams = new URLSearchParams();
    if (params?.asset_type) searchParams.set("asset_type", params.asset_type);
    if (params?.signature_type !== undefined)
      searchParams.set("signature_type", String(params.signature_type));

    const qs = searchParams.toString();
    if (qs) path += `?${qs}`;

    return this.authFetch<BalanceAllowanceResponse>(creds, "GET", path);
  }

  // ── Close-Only Mode ─────────────────────────────────────────────────────

  async getClosedOnlyMode(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<BanStatus> {
    const creds = await this.resolveCreds(supabase, userId);
    return this.authFetch<BanStatus>(creds, "GET", "/closed-only");
  }
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class ClobTradeError extends Error {
  readonly statusCode: number;
  readonly responseText: string;
  readonly method: string;
  readonly path: string;

  constructor(statusCode: number, responseText: string, method: string, path: string) {
    const msg = `CLOB Trade Error ${statusCode} ${method} ${path}: ${responseText.slice(0, 200)}`;
    super(msg);
    this.name = "ClobTradeError";
    this.statusCode = statusCode;
    this.responseText = responseText;
    this.method = method;
    this.path = path;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const clobTradeClient = new ClobTradeClient();
export { ClobTradeClient };
