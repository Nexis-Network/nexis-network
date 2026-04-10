import { z } from "zod";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { apiResponse } from "@/lib/api-platform";
import { extractClientIP } from "@/lib/request-utils";
import {
  checkRateLimit,
  walletVerifyRateLimit,
} from "@/server/security/rate-limit";
import {
  getSupabaseAdminClient,
  getSupabaseServerAnonClient,
} from "@/server/services/supabase/supabase-admin";
import { consumeChallenge } from "@/server/wallets/passkeys/challenge-store";
import {
  resolveRpConfigFromRequest,
  verifyAuthentication,
} from "@/server/wallets/passkeys/webauthn";


function isNativePasskeyLoginEnabled(): boolean {
  return process.env.PASSKEY_NATIVE_LOGIN_ENABLED?.trim().toLowerCase() !== "false";
}

const BodySchema = z.object({
  response: z.custom<AuthenticationResponseJSON>(
    (value) => typeof value === "object" && value !== null,
  ),
  challengeToken: z.string().nullable().optional(),
});

type WalletPasskeyRow = {
  id: string;
  user_id: string;
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
  if (!isNativePasskeyLoginEnabled()) {
    return apiResponse.error(
      "PASSKEY_NATIVE_LOGIN_DISABLED",
      "Native passkey sign-in is temporarily unavailable.",
      503,
    );
  }

  const clientIp = extractClientIP(request);
  const rateKey = `passkey-login-verify:${clientIp}`;
  const { success, headers } = await checkRateLimit(rateKey, walletVerifyRateLimit);

  if (!success) {
    const response = apiResponse.error(
      "PASSKEY_LOGIN_RATE_LIMIT",
      "Too many passkey verification attempts. Please try again shortly.",
      429,
    );
    Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  const stored = await consumeChallenge({
    purpose: "login",
    token: parsed.data.challengeToken,
  });
  if (!stored) {
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
    .select("id,user_id,credential_id,public_key_b64url,counter")
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

  const { data: authUserResult, error: authUserError } =
    await supabase.auth.admin.getUserById(row.user_id);
  const user = authUserResult?.user ?? null;
  if (authUserError || !user?.email) {
    return apiResponse.error(
      "PASSKEY_LOGIN_USER_RESOLUTION_FAILED",
      "Could not resolve the passkey owner.",
      409,
    );
  }
  const email = user.email;
  const { data: linkData, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
  if (linkError || !linkData?.properties?.email_otp) {
    return apiResponse.internalError("Unable to generate passkey login token.");
  }

  const anonClient = getSupabaseServerAnonClient();
  const { data: verifyData, error: verifyError } = await anonClient.auth.verifyOtp({
    email,
    token: linkData.properties.email_otp,
    type: "magiclink",
  });
  if (verifyError || !verifyData?.session) {
    return apiResponse.internalError("Failed to mint Supabase session for passkey user.");
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

  const routeResponse = apiResponse.success({
    access_token: verifyData.session.access_token,
    refresh_token: verifyData.session.refresh_token,
    expires_in: verifyData.session.expires_in,
    token_type: verifyData.session.token_type,
    user: verifyData.user ?? verifyData.session.user,
    session: verifyData.session,
    credentialId,
  });
  Object.entries(headers).forEach(([key, value]) => routeResponse.headers.set(key, value));
  return routeResponse;
}
