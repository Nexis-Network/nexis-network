
import { type NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import {
  verifyCommerceWebhookSignature,
  processCommerceWebhookEvent,
  type CommerceWebhookPayload,
} from "@/server/services/cdp/commerce-webhooks";

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

/**
 * POST /api/cdp/commerce/webhook
 *
 * Receive and process Coinbase Commerce webhook events.
 *
 * Coinbase Commerce sends events with:
 *   Header: X-CC-WEBHOOK-SIGNATURE (HMAC-SHA256)
 *   Body:   { id, scheduled_for, attempt_number, event: { ... } }
 *
 * No auth header is required -- instead we verify the HMAC signature
 * using the CDP_COMMERCE_WEBHOOK_SECRET shared secret.
 *
 * Returns 200 on success to acknowledge receipt.
 */
export async function POST(request: NextRequest) {
  return timeApiRoute("cdp.commerce.webhook.POST", async () => {
    try {
      // Read raw body for signature verification
      const rawBody = await request.text();

      // Verify signature
      const signature =
        request.headers.get("X-CC-Webhook-Signature") ??
        request.headers.get("x-cc-webhook-signature") ??
        "";

      const webhookSecret =
        process.env.CDP_COMMERCE_WEBHOOK_SECRET?.trim() ?? "";

      if (!webhookSecret) {
        logger.error("cdp_commerce_webhook_secret_missing");
        return NextResponse.json(
          { error: "Webhook not configured" },
          { status: 503 },
        );
      }

      if (!signature) {
        logger.warn("cdp_commerce_webhook_missing_signature");
        return NextResponse.json(
          { error: "Missing signature header" },
          { status: 401 },
        );
      }

      const isValid = verifyCommerceWebhookSignature(
        rawBody,
        signature,
        webhookSecret,
      );

      if (!isValid) {
        logger.warn("cdp_commerce_webhook_invalid_signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 },
        );
      }

      // Parse the verified payload
      const payload = JSON.parse(rawBody) as CommerceWebhookPayload;

      if (!payload.event?.type || !payload.event?.data) {
        logger.warn("cdp_commerce_webhook_malformed_payload", {
          payloadId: payload.id,
        });
        return NextResponse.json(
          { error: "Malformed webhook payload" },
          { status: 400 },
        );
      }

      // Process the event asynchronously but respond immediately
      // In production, consider pushing to a queue for reliable processing
      await processCommerceWebhookEvent(payload);

      return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
      logger.error("cdp_commerce_webhook_error", {
        error: error instanceof Error ? error.message : String(error),
      });

      // Return 200 to prevent Coinbase from retrying on our processing errors
      // This prevents infinite retry loops. Investigate via logs instead.
      return NextResponse.json({ received: true }, { status: 200 });
    }
  });
}
