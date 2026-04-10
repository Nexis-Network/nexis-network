import { createHmac, timingSafeEqual } from "node:crypto";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";

function normalizeSecret(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function verifyAlchemySignature(body: string, signature: string, signingKey: string): boolean {
  const expectedHex = createHmac("sha256", signingKey).update(body).digest("hex");
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(signature, "hex");

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

export async function POST(request: Request) {
  const signingKey = normalizeSecret(process.env.ALCHEMY_ROLLUP_WEBHOOK_SIGNING_KEY);
  if (!signingKey) {
    return apiResponse.serviceUnavailable(
      "Alchemy rollup webhook signing key is not configured",
      "ROLLUP_WEBHOOK_NOT_CONFIGURED",
    );
  }

  const signature = normalizeSecret(request.headers.get("x-alchemy-signature"));
  if (!signature) {
    return apiResponse.forbidden("Missing Alchemy webhook signature");
  }

  const rawBody = await request.text();
  if (!verifyAlchemySignature(rawBody, signature, signingKey)) {
    return apiResponse.forbidden("Invalid Alchemy webhook signature");
  }

  try {
    const payload = rawBody ? JSON.parse(rawBody) : {};

    logger.info("alchemy_rollup_webhook_received", {
      webhookId:
        typeof payload?.webhookId === "string" ? payload.webhookId : null,
      type: typeof payload?.type === "string" ? payload.type : null,
      source:
        typeof payload?.event?.network === "string" ? payload.event.network : null,
    });

    return apiResponse.success({
      accepted: true,
    });
  } catch (error) {
    logger.warn("alchemy_rollup_webhook_invalid_json", {
      error: error instanceof Error ? error.message : String(error),
    });
    return apiResponse.badRequest("Webhook payload must be valid JSON", "INVALID_WEBHOOK_PAYLOAD");
  }
}
