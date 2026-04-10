import { apiResponse } from "@/lib/api-platform";

import { z } from "zod";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { withAuth } from "@/server/security/with-auth";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { consumeChallenge } from "@/server/wallets/passkeys/challenge-store";
import {
  resolveRpConfigFromRequest,
  verifyAuthentication,
} from "@/server/wallets/passkeys/webauthn";


const BodySchema = z.object({
  response: z.custom<AuthenticationResponseJSON>(
    (value) => typeof value === "object" && value !== null,
  ),
  challengeToken: z.string().nullable().optional(),
});

function fromBase64Url(value: string): Uint8Array {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((value.length + 3) % 4);
  const buf = Buffer.from(padded, "base64");
  // Ensure we return a Uint8Array backed by an ArrayBuffer (not SharedArrayBuffer).
  return new Uint8Array(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  );
}

export async function POST(request: Request) {
  const auth = await withAuth(request, {
    allowPublic: false,
    requireOrg: false,
  });
  if (!auth.ok) return auth.response;

  const session = auth.session;
  const userId = session!.user.id;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  const stored = await consumeChallenge({
    userId,
    purpose: "auth",
    token: parsed.data.challengeToken,
  });
  if (!stored) {
    return apiResponse.badRequest(
      "Challenge expired or invalid",
      "challenge_expired",
    );
  }

  const response = parsed.data.response;
  const credentialId = String(response.id ?? "");
  if (!credentialId) {
    return apiResponse.badRequest(
      "Missing credential ID",
      "missing_credential_id",
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data: rows } = await supabase
    .from("wallet_passkeys")
    .select("id,credential_id,public_key_b64url,counter")
    .eq("user_id", userId)
    .eq("credential_id", credentialId)
    .is("revoked_at", null)
    .limit(1);

  const row = rows?.[0];
  if (!row) {
    return apiResponse.notFound("Unknown credential");
  }

  const rp = resolveRpConfigFromRequest(request);

  const verification = await verifyAuthentication({
    rp,
    expectedChallenge: stored.challenge,
    response,
    credential: {
      id: row.credential_id,
      publicKey: fromBase64Url(
        row.public_key_b64url,
      ) as Uint8Array<ArrayBuffer>,
      counter: Number(row.counter ?? 0),
    },
  });

  if (!verification.verified) {
    return apiResponse.unauthorized("Authentication failed");
  }

  const nextCounter = verification.authenticationInfo?.newCounter;
  const update: Record<string, UntypedJson> = {
    last_used_at: new Date().toISOString(),
  };
  if (
    typeof nextCounter === "number" &&
    Number.isFinite(nextCounter) &&
    nextCounter >= 0
  ) {
    update.counter = nextCounter;
  }

  await supabase.from("wallet_passkeys").update(update).eq("id", row.id);

  return apiResponse.success({ ok: true, credentialId });
}
