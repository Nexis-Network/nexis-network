/**
 * CoW Protocol REST API client.
 *
 * Server-side only — handles quote fetching, order submission (presign),
 * order status polling, and order cancellation.
 *
 * Rate limits: ~10 req/s quotes, ~5 req/s orders.
 *
 * @see https://docs.cow.fi/cow-protocol/reference/apis/orderbook
 */

import { logger } from "@/lib/logger";
import {
  type CowChainId,
  type CowQuoteRequest,
  type CowQuoteResponse,
  type CowOrderCreation,
  type CowOrderDetail,
  type CowTradeRecord,
  CowQuoteResponseSchema,
  CowOrderDetailSchema,
  CowTradeRecordSchema,
  getCowApiBaseUrl,
  DEFAULT_APP_DATA,
  defaultValidTo,
} from "./cow-swap-types";

// ─── Configuration ──────────────────────────────────────────────
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = 500;

// ─── Internal helpers ───────────────────────────────────────────
async function cowFetch<T>(
  url: string,
  init: RequestInit,
  schema?: { parse: (data: unknown) => T },
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...init.headers,
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const msg = `CoW API ${response.status}: ${body.slice(0, 500)}`;

        // Don't retry 4xx (client errors) except 429 (rate limit)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(msg);
        }

        throw new Error(msg);
      }

      const data = await response.json();

      if (schema) {
        return schema.parse(data);
      }

      return data as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry client errors
      if (lastError.message.includes("CoW API 4") && !lastError.message.includes("CoW API 429")) {
        throw lastError;
      }

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_BACKOFF_MS * Math.pow(2, attempt);
        logger.warn(`[cow-swap] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms: ${lastError.message}`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error("CoW API request failed after retries");
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Fetch a swap quote from CoW Protocol.
 *
 * @param chainId  Target chain (1, 100, 42161, 8453, 11155111)
 * @param params   Quote request parameters
 * @returns        Parsed quote response with amounts, fees, and expiry
 */
export async function getCowSwapQuote(
  chainId: CowChainId,
  params: CowQuoteRequest,
): Promise<CowQuoteResponse> {
  const baseUrl = getCowApiBaseUrl(chainId);
  const url = `${baseUrl}/api/v1/quote`;

  // Apply defaults
  const body = {
    ...params,
    validTo: params.validTo ?? defaultValidTo(),
    appData: params.appData ?? DEFAULT_APP_DATA,
    signingScheme: params.signingScheme ?? "presign",
  };

  logger.info(`[cow-swap] Fetching quote on chain ${chainId}: ${params.sellToken} → ${params.buyToken}`);

  return cowFetch<CowQuoteResponse>(url, { method: "POST", body: JSON.stringify(body) }, CowQuoteResponseSchema);
}

/**
 * Submit an order to CoW Protocol.
 *
 * For Safe smart wallets, use `signingScheme: "presign"` and pass the
 * Safe address as `from`. The `signature` field should be the Safe address
 * (for presign, the "signature" is just the owner address).
 *
 * After submission, call `setPreSignature(orderUid, true)` on the
 * settlement contract via the Safe to activate the order.
 *
 * @param chainId  Target chain
 * @param order    Full order with signing scheme and signature
 * @returns        The order UID (hex string)
 */
export async function submitCowSwapOrder(
  chainId: CowChainId,
  order: CowOrderCreation,
): Promise<string> {
  const baseUrl = getCowApiBaseUrl(chainId);
  const url = `${baseUrl}/api/v1/orders`;

  logger.info(`[cow-swap] Submitting ${order.signingScheme} order on chain ${chainId}`);

  // The API returns a plain JSON string (the UID) on success
  const uid = await cowFetch<string>(url, { method: "POST", body: JSON.stringify(order) });

  if (typeof uid !== "string" || !uid) {
    throw new Error("CoW API did not return a valid order UID");
  }

  logger.info(`[cow-swap] Order submitted: ${uid}`);
  return uid;
}

/**
 * Get the status of a CoW Protocol order.
 *
 * @param chainId  Target chain
 * @param orderUid The order UID
 * @returns        Full order details including fill status
 */
export async function getCowSwapOrderStatus(
  chainId: CowChainId,
  orderUid: string,
): Promise<CowOrderDetail> {
  const baseUrl = getCowApiBaseUrl(chainId);
  const url = `${baseUrl}/api/v1/orders/${encodeURIComponent(orderUid)}`;

  return cowFetch<CowOrderDetail>(url, { method: "GET" }, CowOrderDetailSchema);
}

/**
 * Cancel a CoW Protocol order (soft cancel).
 *
 * Note: For presign orders that haven't been presigned on-chain yet,
 * simply not calling setPreSignature is sufficient to "cancel".
 * This endpoint performs a soft cancel via the API.
 *
 * @param chainId  Target chain
 * @param orderUid The order UID
 * @param signature Cancel signature (for presign orders, this is the owner address)
 */
export async function cancelCowSwapOrder(
  chainId: CowChainId,
  orderUid: string,
  signature: string,
): Promise<void> {
  const baseUrl = getCowApiBaseUrl(chainId);
  const url = `${baseUrl}/api/v1/orders/${encodeURIComponent(orderUid)}`;

  logger.info(`[cow-swap] Cancelling order ${orderUid} on chain ${chainId}`);

  await cowFetch<unknown>(url, {
    method: "DELETE",
    body: JSON.stringify({
      signature,
      signingScheme: "presign",
    }),
  });
}

/**
 * Get trade history for a specific owner address.
 *
 * @param chainId  Target chain
 * @param owner    The owner address
 * @returns        Array of trade records
 */
export async function getCowSwapTrades(
  chainId: CowChainId,
  owner: string,
): Promise<CowTradeRecord[]> {
  const baseUrl = getCowApiBaseUrl(chainId);
  const url = `${baseUrl}/api/v1/trades?owner=${encodeURIComponent(owner)}`;

  const raw = await cowFetch<unknown[]>(url, { method: "GET" });

  return raw.map((item) => CowTradeRecordSchema.parse(item));
}
