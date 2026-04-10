import { apiResponse } from "@/lib/api-platform";
import { extractClientIP } from "@/lib/request-utils";
import {
  checkRateLimit,
  walletChallengeRateLimit,
} from "@/server/security/rate-limit";
import { issueChallenge } from "@/server/wallets/passkeys/challenge-store";
import {
  createAuthenticationOptions,
  resolveRpConfigFromRequest,
} from "@/server/wallets/passkeys/webauthn";


function isNativePasskeyLoginEnabled(): boolean {
  return process.env.PASSKEY_NATIVE_LOGIN_ENABLED?.trim().toLowerCase() !== "false";
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
  const rateKey = `passkey-login-options:${clientIp}`;
  const { success, headers } = await checkRateLimit(
    rateKey,
    walletChallengeRateLimit,
  );

  if (!success) {
    const response = apiResponse.error(
      "PASSKEY_LOGIN_RATE_LIMIT",
      "Too many passkey login attempts. Please try again shortly.",
      429,
    );
    Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  }

  const rp = resolveRpConfigFromRequest(request);
  const { options, challenge } = await createAuthenticationOptions({
    rp,
    allowCredentialIds: [],
    userVerification: "required",
  });
  const { token } = await issueChallenge({
    userId: null,
    purpose: "login",
    challenge,
  });

  const response = apiResponse.success({
    ok: true,
    options,
    challengeToken: token,
  });
  Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}
