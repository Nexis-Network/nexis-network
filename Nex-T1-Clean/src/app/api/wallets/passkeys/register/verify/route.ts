import { apiResponse } from "@/lib/api-platform";

import { z } from "zod";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { withAuth } from "@/server/security/with-auth";
// NOTE: MFA (AAL2) is NOT required for passkey registration.
// Registering a passkey is adding a security factor, not performing a sensitive action.
// Requiring MFA here would create a chicken-and-egg problem during onboarding.
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { consumeChallenge } from "@/server/wallets/passkeys/challenge-store";
import {
  resolveRpConfigFromRequest,
  verifyRegistration,
} from "@/server/wallets/passkeys/webauthn";
import { emitWalletEvent } from "@/server/notifications/emit";
import { enqueueJob } from "@/server/queues/enqueue";

import { logger } from "@/lib/logger";

const BodySchema = z.object({
  response: z.custom<RegistrationResponseJSON>(
    (value) => typeof value === "object" && value !== null,
  ),
  challengeToken: z.string().nullable().optional(),
});

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function POST(request: Request) {
  const auth = await withAuth(request, {
    allowPublic: false,
    requireOrg: false,
  });
  if (!auth.ok) return auth.response;

  const session = auth.session;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  const rp = resolveRpConfigFromRequest(request);
  const userId = session!.user.id;
  if (userId === "00000000-0000-0000-0000-000000000000") {
    return apiResponse.error(
      "dev_auth_bypass_enabled",
      "Developer auth bypass enabled",
      409,
    );
  }

  const supabase = getSupabaseAdminClient();
  const stored = await consumeChallenge({
    userId,
    purpose: "register",
    token: parsed.data.challengeToken,
  });
  if (!stored) {
    return apiResponse.badRequest(
      "Challenge expired or invalid",
      "challenge_expired",
    );
  }

  const response = parsed.data.response;
  const verification = await verifyRegistration({
    rp,
    expectedChallenge: stored.challenge,
    response,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return apiResponse.badRequest(
      "Registration verification failed",
      "registration_failed",
    );
  }

  const registrationInfo = verification.registrationInfo;
  const credentialId =
    typeof registrationInfo?.credential?.id === "string"
      ? registrationInfo.credential.id
      : null;
  const credentialPublicKey = registrationInfo?.credential?.publicKey as
    | Uint8Array
    | undefined;
  const counter =
    typeof registrationInfo?.credential?.counter === "number"
      ? registrationInfo.credential.counter
      : 0;
  if (!credentialId || !credentialPublicKey) {
    return apiResponse.badRequest(
      "Missing credential info",
      "registration_failed",
    );
  }

  // Store COSE public key bytes (base64url) for later verification.
  const publicKeyB64 = toBase64Url(credentialPublicKey);

  const transports = Array.isArray(response.response?.transports)
    ? (response.response.transports as string[])
    : null;

  const { error } = await supabase.from("wallet_passkeys").insert({
    user_id: userId,
    credential_id: credentialId,
    public_key_b64url: publicKeyB64,
    counter: Number.isFinite(counter) ? counter : 0,
    transports,
  });

  if (error) {
    // Log full error for debugging
    logger.error("[wallet_passkeys] Insert failed:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      userId,
      credentialId,
    });

    // Likely duplicate; treat as idempotent.
    if (String(error.code) === "23505") {
      await emitWalletEvent({
        user_id: userId,
        event_type: "passkey_registered",
        status: "success",
        title: "Passkey registered",
        body: "A passkey was registered (already existed).",
        metadata: { credentialId, alreadyExisted: true },
      });
      return apiResponse.success({
        ok: true,
        credentialId,
        alreadyExisted: true,
      });
    }
    return apiResponse.error("db_insert_failed", "DB insert failed", 500, {
      code: error.code,
    });
  }

  await emitWalletEvent({
    user_id: userId,
    event_type: "passkey_registered",
    status: "success",
    title: "Passkey registered",
    body: "A new wallet passkey was registered.",
    metadata: { credentialId, alreadyExisted: false },
  });

  // Trigger wallet bootstrap asynchronously so CDP/Crossmint provisioning stays off the request path.
  void enqueueJob("user_wallet_bootstrap", {
    userId,
    email: session?.user?.email ?? null,
    source: "wallets.passkeys.register.verify",
  });

  return apiResponse.success({ ok: true, credentialId, alreadyExisted: false });
}
