import { z } from "zod";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { apiResponse } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { consumeChallenge } from "@/server/wallets/passkeys/challenge-store";
import {
  resolveRpConfigFromRequest,
  verifyAuthentication,
} from "@/server/wallets/passkeys/webauthn";
import { issueStepUpToken } from "@/server/security/step-up-token";


function isPasskeyTxApprovalEnabled(): boolean {
  return process.env.PASSKEY_TX_APPROVAL_ENABLED?.trim().toLowerCase() !== "false";
}

const BodySchema = z.object({
  response: z.custom<AuthenticationResponseJSON>(
    (value) => typeof value === "object" && value !== null,
  ),
  challengeToken: z.string().nullable().optional(),
});

type WalletPasskeyRow = {
  id: string;
  credential_id: string;
  public_key_b64url: string;
  counter: number | null;
};

function fromBase64Url(value: string): Uint8Array {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((value.length + 3) % 4);
  const buf = Buffer.from(padded, "base64");
  return new Uint8Array(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  );
}

export async function POST(request: Request) {
  if (!isPasskeyTxApprovalEnabled()) {
    return apiResponse.error(
      "PASSKEY_TX_APPROVAL_DISABLED",
      "Passkey transaction approval is temporarily unavailable.",
      503,
    );
  }

  const auth = await withAuth(request, { allowPublic: false, requireOrg: false });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  const stored = await consumeChallenge({
    userId: auth.session.user.id,
    purpose: "step_up",
    token: parsed.data.challengeToken,
  });
  if (!stored?.scope) {
    return apiResponse.badRequest(
      "Challenge expired or invalid",
      "challenge_expired",
    );
  }

  const responseJson = parsed.data.response;
  const credentialId = String(responseJson.id ?? "").trim();
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
    .eq("user_id", auth.session.user.id)
    .eq("credential_id", credentialId)
    .is("revoked_at", null)
    .limit(1);

  const row = (rows?.[0] as WalletPasskeyRow | undefined) ?? null;
  if (!row) {
    return apiResponse.notFound("Unknown credential");
  }

  const rp = resolveRpConfigFromRequest(request);
  const verification = await verifyAuthentication({
    rp,
    expectedChallenge: stored.challenge,
    response: responseJson,
    requireUserVerification: true,
    credential: {
      id: row.credential_id,
      publicKey: fromBase64Url(row.public_key_b64url) as Uint8Array<ArrayBuffer>,
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

  const token = await issueStepUpToken({
    userId: auth.session.user.id,
    action: stored.scope.action,
    payloadHash: stored.scope.payloadHash,
  });

  return apiResponse.success({
    ok: true,
    stepUpToken: token.token,
    expiresIn: token.expiresIn,
  });
}
