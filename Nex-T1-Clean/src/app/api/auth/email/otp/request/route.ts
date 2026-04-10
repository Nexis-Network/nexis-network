import { apiResponse } from "@/lib/api-platform";
import { buildMagicLinkConfirmUrl } from "@/lib/auth/magic-link";
import { createContinueToken } from "@/server/auth/continue-token";
import { prepareOtpRequest } from "@/server/auth/otp-utils";
import { authLogger } from "@/server/logging/logger";


type EmailOtpRequestBody = {
  email: UntypedJson;
  inviteCode?: UntypedJson;
  invite_code?: UntypedJson;
  mode?: UntypedJson;
  redirectTo?: UntypedJson;
};

function resolveRequestOrigin(request: Request): string {
  try {
    return new URL(request.url).origin;
  } catch {
    return (
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ??
      process.env.SITE_URL?.trim() ??
      "http://localhost:3000"
    );
  }
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") return apiResponse.badRequest("Email OTP payload must be a JSON object.");

  const body = payload as EmailOtpRequestBody;
  const rawEmail = String(body.email || "");
  const emailValue = rawEmail?.toLowerCase().trim();
  if (!emailValue) {
    return apiResponse.badRequest("Email is required.");
  }

  const inviteCode = body.inviteCode ? String(body.inviteCode) : (body.invite_code ? String(body.invite_code) : undefined);
  const redirectTo = body.redirectTo ? String(body.redirectTo) : undefined;

  const captchaToken = (body as Record<string, UntypedJson>).captchaToken ? String((body as Record<string, UntypedJson>).captchaToken) : undefined;
  const prepared = await prepareOtpRequest({
    request,
    routeKey: "otp:email",
    userId: emailValue,
    captchaToken,
  });
  if (!prepared.ok) {
    return prepared.response;
  }
  const { supabase, headers } = prepared;

  try {
    // Build redirect for magic link / PKCE flows
    const origin = resolveRequestOrigin(request);
    const continueToken = createContinueToken(redirectTo ?? "/app");
    const emailRedirectTo = buildMagicLinkConfirmUrl(origin, continueToken ?? redirectTo ?? "/app");

    const { error } = await supabase.auth.signInWithOtp({
      email: emailValue,
      options: {
        emailRedirectTo,
        shouldCreateUser: true,
        data: inviteCode ? { invite_code: inviteCode } : undefined,
      },
    });

    if (error) {
      throw error;
    }

    authLogger.info("email_otp_requested", { email: emailValue.toLowerCase() });
    const res = apiResponse.success({ ok: true, expires_in: 60 });
    if (headers) {
       Object.entries(headers).forEach(([k, v]) => {
           if (v) res.headers.set(k, v.toString());
       });
    }
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to request email code.";
    authLogger.warn("email_otp_request_failed", { email: emailValue.toLowerCase(), message });
    const res = apiResponse.internalError(message);
    if (headers) {
       Object.entries(headers).forEach(([k, v]) => {
           if (v) res.headers.set(k, v.toString());
       });
    }
    return res;
  }
}
