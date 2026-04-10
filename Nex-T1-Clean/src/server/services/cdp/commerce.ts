/**
 * CDP Commerce (Coinbase Commerce) Service
 *
 * Domain: Crypto Payments
 * Responsibility: Create and manage crypto payment charges via the
 *   Coinbase Commerce API (https://api.commerce.coinbase.com).
 * Depends on: CDP_COMMERCE_API_KEY env var
 *
 * All functions are server-only and should never be imported in client code.
 */
import "server-only";

import { logger } from "@/lib/logger";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMMERCE_API_BASE = "https://api.commerce.coinbase.com";
const REQUEST_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateChargeParams = {
  /** Product or charge name */
  name: string;
  /** Optional description */
  description?: string;
  /** Amount in smallest unit (e.g. "10.00" for $10 USDC) */
  amount: string;
  /** Currency code: "USDC", "ETH", "BTC", etc. */
  currency: string;
  /** Pricing type: fixed or pay-what-you-want */
  pricingType: "fixed_price" | "no_price";
  /** Custom metadata key-value pairs */
  metadata?: Record<string, string>;
  /** URL to redirect after successful payment */
  redirectUrl?: string;
  /** URL to redirect on cancellation */
  cancelUrl?: string;
};

export type CdpCharge = {
  id: string;
  code: string;
  name: string;
  description?: string;
  amount: string;
  currency: string;
  status: "new" | "pending" | "completed" | "expired" | "cancelled";
  hostedUrl: string;
  createdAt: string;
  expiresAt: string;
  payments: Array<{
    network: string;
    transactionHash: string;
    status: string;
  }>;
};

export type ListChargesOptions = {
  /** Max number of charges to return (default 25, max 100) */
  limit?: number;
  /** Filter by status */
  status?: string;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const createChargeSchema = z.object({
  name: z.string().min(1, "Charge name is required").max(200),
  description: z.string().max(1000).optional(),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => { const n = Number(val); return !isNaN(n) && n > 0; },
    { message: "Amount must be a positive number" },
  ),
  currency: z.string().min(1).max(10),
  pricingType: z.enum(["fixed_price", "no_price"]),
  metadata: z.record(z.string()).optional(),
  redirectUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function getCommerceApiKey(): string {
  const key = process.env.CDP_COMMERCE_API_KEY?.trim();
  if (!key) {
    throw new Error("CDP_COMMERCE_API_KEY is not configured");
  }
  return key;
}

/**
 * Raw Commerce API response shape for a charge.
 * The Coinbase Commerce API returns charges nested under `data`.
 */
type RawCommerceCharge = {
  id: string;
  code: string;
  name: string;
  description?: string;
  pricing_type: string;
  pricing?: {
    local?: { amount: string; currency: string };
  };
  metadata?: Record<string, string>;
  redirect_url?: string;
  cancel_url?: string;
  hosted_url: string;
  created_at: string;
  expires_at: string;
  timeline: Array<{
    status: string;
    time: string;
  }>;
  payments: Array<{
    network: string;
    transaction_id: string;
    status: string;
  }>;
};

function normalizeCharge(raw: RawCommerceCharge): CdpCharge {
  // Derive status from the latest timeline entry
  const latestTimeline = raw.timeline?.[raw.timeline.length - 1];
  const rawStatus = latestTimeline?.status?.toUpperCase() ?? "NEW";

  const STATUS_MAP: Record<string, CdpCharge["status"]> = {
    NEW: "new",
    PENDING: "pending",
    COMPLETED: "completed",
    CONFIRMED: "completed",
    EXPIRED: "expired",
    CANCELED: "cancelled",
    CANCELLED: "cancelled",
    UNRESOLVED: "pending",
  };

  const status: CdpCharge["status"] = STATUS_MAP[rawStatus] ?? "new";

  return {
    id: raw.id,
    code: raw.code,
    name: raw.name,
    description: raw.description,
    amount: raw.pricing?.local?.amount ?? "0",
    currency: raw.pricing?.local?.currency ?? "USD",
    status,
    hostedUrl: raw.hosted_url,
    createdAt: raw.created_at,
    expiresAt: raw.expires_at,
    payments: (raw.payments ?? []).map((p) => ({
      network: p.network,
      transactionHash: p.transaction_id,
      status: p.status,
    })),
  };
}

async function commerceRequest<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: Record<string, UntypedJson>,
  idempotencyKey?: string,
): Promise<T> {
  const apiKey = getCommerceApiKey();
  const url = `${COMMERCE_API_BASE}${path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      "X-CC-Api-Key": apiKey,
      "X-CC-Version": "2018-03-22",
      Accept: "application/json",
    };

    // Coinbase Commerce supports idempotency via X-CC-Idempotency-Key header
    if (idempotencyKey) {
      headers["X-CC-Idempotency-Key"] = idempotencyKey;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body && (method === "POST")) {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      logger.error("cdp_commerce_api_error", {
        method,
        path,
        status: response.status,
        error: errorText,
      });
      throw new Error(
        `Commerce API error (${response.status}): ${errorText}`,
      );
    }

    // DELETE with 204 returns no body
    if (response.status === 204) {
      return undefined as T;
    }

    const json = (await response.json()) as { data: T };
    return json.data;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new payment charge via Coinbase Commerce.
 *
 * Returns the charge details including a hosted URL where the payer
 * can complete the crypto payment.
 */
export async function createCharge(
  params: CreateChargeParams,
  idempotencyKey?: string,
): Promise<CdpCharge> {
  logger.info("cdp_commerce_create_charge", {
    name: params.name,
    amount: params.amount,
    currency: params.currency,
    pricingType: params.pricingType,
    idempotencyKey: idempotencyKey ?? null,
  });

  const requestBody: Record<string, UntypedJson> = {
    name: params.name,
    pricing_type: params.pricingType,
    local_price: {
      amount: params.amount,
      currency: params.currency,
    },
  };

  if (params.description) {
    requestBody.description = params.description;
  }
  if (params.metadata) {
    requestBody.metadata = params.metadata;
  }
  if (params.redirectUrl) {
    requestBody.redirect_url = params.redirectUrl;
  }
  if (params.cancelUrl) {
    requestBody.cancel_url = params.cancelUrl;
  }

  const raw = await commerceRequest<RawCommerceCharge>(
    "POST",
    "/charges",
    requestBody,
    idempotencyKey,
  );

  const charge = normalizeCharge(raw);

  logger.info("cdp_commerce_charge_created", {
    chargeId: charge.id,
    code: charge.code,
    status: charge.status,
    hostedUrl: charge.hostedUrl,
  });

  return charge;
}

/**
 * Retrieve a single charge by its ID.
 */
export async function getCharge(chargeId: string): Promise<CdpCharge> {
  if (!chargeId) {
    throw new Error("Charge ID is required");
  }

  const raw = await commerceRequest<RawCommerceCharge>(
    "GET",
    `/charges/${encodeURIComponent(chargeId)}`,
  );

  return normalizeCharge(raw);
}

/**
 * List charges with optional filtering.
 */
export async function listCharges(
  options?: ListChargesOptions,
): Promise<CdpCharge[]> {
  const params = new URLSearchParams();

  const limit = Math.min(Math.max(options?.limit ?? 25, 1), 100);
  params.set("limit", String(limit));

  if (options?.status) {
    params.set("status", options.status);
  }

  const query = params.toString();
  const path = `/charges${query ? `?${query}` : ""}`;

  const rawList = await commerceRequest<RawCommerceCharge[]>("GET", path);

  // The list endpoint wraps charges in an array under `data`
  const items = Array.isArray(rawList) ? rawList : [];
  return items.map(normalizeCharge);
}

/**
 * Cancel an active charge. Only charges in "new" status can be cancelled.
 */
export async function cancelCharge(chargeId: string): Promise<void> {
  if (!chargeId) {
    throw new Error("Charge ID is required");
  }

  logger.info("cdp_commerce_cancel_charge", { chargeId });

  await commerceRequest<RawCommerceCharge>(
    "POST",
    `/charges/${encodeURIComponent(chargeId)}/cancel`,
  );

  logger.info("cdp_commerce_charge_cancelled", { chargeId });
}
