import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { processCdpWebhookEvent } from "@/server/services/cdp/webhooks";


// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const webhookPayloadSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  data: z.record(z.unknown()),
  timestamp: z.string().min(1),
});

// ---------------------------------------------------------------------------
// HMAC verification
// ---------------------------------------------------------------------------

const SIGNATURE_HEADER = "x-cc-webhook-signature";

function verifySignature(rawBody: string, signatureHex: string, secret: string): boolean {
  const expectedHmac = createHmac("sha256", secret).update(rawBody).digest("hex");

  // Constant-time comparison to prevent timing attacks
  const expectedBuffer = Buffer.from(expectedHmac, "hex");
  const receivedBuffer = Buffer.from(signatureHex, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/cdp
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.CDP_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    logger.error("cdp_webhook_secret_not_configured");
    return NextResponse.json(
      { success: false, error: "Webhook endpoint not configured" },
      { status: 503 },
    );
  }

  // Read raw body for HMAC verification
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    logger.warn("cdp_webhook_body_read_failed");
    return NextResponse.json(
      { success: false, error: "Failed to read request body" },
      { status: 400 },
    );
  }

  if (!rawBody || rawBody.length === 0) {
    return NextResponse.json(
      { success: false, error: "Empty request body" },
      { status: 400 },
    );
  }

  // Verify HMAC-SHA256 signature
  const signatureHeader = request.headers.get(SIGNATURE_HEADER);
  if (!signatureHeader) {
    logger.warn("cdp_webhook_missing_signature");
    return NextResponse.json(
      { success: false, error: "Missing webhook signature" },
      { status: 401 },
    );
  }

  if (!verifySignature(rawBody, signatureHeader, webhookSecret)) {
    logger.warn("cdp_webhook_invalid_signature");
    return NextResponse.json(
      { success: false, error: "Invalid webhook signature" },
      { status: 401 },
    );
  }

  // Parse and validate payload
  let payload: z.infer<typeof webhookPayloadSchema>;
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    payload = webhookPayloadSchema.parse(parsed);
  } catch (error) {
    const message = error instanceof z.ZodError
      ? `Payload validation failed: ${error.issues.map((i) => i.message).join(", ")}`
      : "Invalid JSON payload";
    logger.warn("cdp_webhook_invalid_payload", { error: message });
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }

  // Process event asynchronously (fire-and-forget with error logging).
  // We acknowledge the webhook immediately to avoid timeouts from CDP.
  processCdpWebhookEvent(payload).catch((error) => {
    logger.error("cdp_webhook_processing_error", {
      eventId: payload.id,
      type: payload.type,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  logger.info("cdp_webhook_received", {
    eventId: payload.id,
    type: payload.type,
  });

  return NextResponse.json({ success: true, eventId: payload.id }, { status: 200 });
}
