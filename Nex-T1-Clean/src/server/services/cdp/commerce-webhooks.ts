/**
 * CDP Commerce Webhook Handler
 *
 * Domain: Crypto Payments
 * Responsibility: Verify and process Coinbase Commerce webhook events.
 *
 * Coinbase Commerce sends webhook events with:
 *   Header: X-CC-WEBHOOK-SIGNATURE (HMAC-SHA256 of the raw body)
 *   Body:   { id, scheduled_for, attempt_number, event: { id, type, data, ... } }
 *
 * Supported event types:
 *   - charge:created
 *   - charge:pending
 *   - charge:confirmed
 *   - charge:failed
 *   - charge:expired
 */
import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CommerceWebhookEventType =
  | "charge:created"
  | "charge:pending"
  | "charge:confirmed"
  | "charge:failed"
  | "charge:expired";

export type CommerceWebhookChargeData = {
  id: string;
  code: string;
  name: string;
  description?: string;
  hosted_url: string;
  created_at: string;
  expires_at: string;
  metadata?: Record<string, string>;
  pricing_type: string;
  pricing?: {
    local?: { amount: string; currency: string };
  };
  payments: Array<{
    network: string;
    transaction_id: string;
    status: string;
    value: {
      amount: string;
      currency: string;
    };
  }>;
  timeline: Array<{
    status: string;
    time: string;
  }>;
};

export type CommerceWebhookEvent = {
  id: string;
  type: CommerceWebhookEventType;
  data: CommerceWebhookChargeData;
  api_version: string;
};

export type CommerceWebhookPayload = {
  id: string;
  scheduled_for: string;
  attempt_number: number;
  event: CommerceWebhookEvent;
};

// ---------------------------------------------------------------------------
// Signature Verification
// ---------------------------------------------------------------------------

/**
 * Verify the HMAC-SHA256 signature of a Coinbase Commerce webhook.
 *
 * @param rawBody  The raw request body as a string or Buffer
 * @param signature The value of the X-CC-WEBHOOK-SIGNATURE header
 * @param secret   The webhook shared secret from Coinbase Commerce dashboard
 * @returns true if the signature is valid
 */
export function verifyCommerceWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) {
    return false;
  }

  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8"));
    const computedSignature = hmac.digest("hex");

    // Constant-time comparison to prevent timing attacks.
    // Use UTF-8 Buffer comparison to handle both hex and non-hex signatures
    // without falling back to non-constant-time string comparison.
    const a = Buffer.from(computedSignature, "utf-8");
    const b = Buffer.from(signature, "utf-8");

    if (a.length !== b.length) {
      return false;
    }

    return timingSafeEqual(a, b);
  } catch (error) {
    logger.error("cdp_commerce_webhook_signature_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// ---------------------------------------------------------------------------
// Event Processing
// ---------------------------------------------------------------------------

/**
 * Process a verified Coinbase Commerce webhook event.
 *
 * This handler logs the event and can be extended to:
 * - Update charge status in the local database
 * - Send notifications to users
 * - Trigger fulfillment workflows
 * - Emit internal events for downstream consumers
 */
export async function processCommerceWebhookEvent(
  event: CommerceWebhookPayload,
): Promise<void> {
  const eventType = event.event.type;
  const chargeData = event.event.data;
  const chargeId = chargeData.id;
  const chargeCode = chargeData.code;

  logger.info("cdp_commerce_webhook_received", {
    eventId: event.id,
    eventType,
    chargeId,
    chargeCode,
    attemptNumber: event.attempt_number,
  });

  switch (eventType) {
    case "charge:created": {
      logger.info("cdp_commerce_charge_created_webhook", {
        chargeId,
        chargeCode,
        name: chargeData.name,
        amount: chargeData.pricing?.local?.amount,
        currency: chargeData.pricing?.local?.currency,
      });
      // Charge was created -- no action needed unless tracking in local DB
      break;
    }

    case "charge:pending": {
      const payment = chargeData.payments?.[chargeData.payments.length - 1];
      logger.info("cdp_commerce_charge_pending_webhook", {
        chargeId,
        chargeCode,
        network: payment?.network,
        txHash: payment?.transaction_id,
      });
      // Payment detected but not yet confirmed on-chain
      break;
    }

    case "charge:confirmed": {
      const confirmedPayment =
        chargeData.payments?.[chargeData.payments.length - 1];
      logger.info("cdp_commerce_charge_confirmed_webhook", {
        chargeId,
        chargeCode,
        network: confirmedPayment?.network,
        txHash: confirmedPayment?.transaction_id,
        paymentAmount: confirmedPayment?.value?.amount,
        paymentCurrency: confirmedPayment?.value?.currency,
      });
      // Payment confirmed -- trigger fulfillment, update order status, etc.
      break;
    }

    case "charge:failed": {
      logger.warn("cdp_commerce_charge_failed_webhook", {
        chargeId,
        chargeCode,
        timeline: chargeData.timeline,
      });
      // Payment failed -- notify user, mark order as failed
      break;
    }

    case "charge:expired": {
      logger.info("cdp_commerce_charge_expired_webhook", {
        chargeId,
        chargeCode,
      });
      // Charge expired without payment -- clean up pending order
      break;
    }

    default: {
      logger.warn("cdp_commerce_webhook_unknown_event", {
        eventType,
        chargeId,
      });
      break;
    }
  }
}
