import { apiResponse } from "@/lib/api-platform";
import { authLogger } from "@/server/logging/logger";
import { checkRateLimit, otpRateLimit } from "@/server/security/rate-limit";
import { buildMagicLinkConfirmUrl } from "@/lib/auth/magic-link";
import { createClient } from "@supabase/supabase-js";
import { assertSupabaseConfig } from "@/lib/supabase/config";
import { extractClientIP, createCompositeRateLimitKey } from "@/lib/request-utils";
import { verifyCaptcha } from "@/lib/security/captcha";
import { createContinueToken } from "@/server/auth/continue-token";


import { logger } from '@/lib/logger';

type MagicLinkRequestBody = {
  email: UntypedJson;
  inviteCode?: UntypedJson;
  invite_code?: UntypedJson;
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
  let body: MagicLinkRequestBody;
  try {
    body = await request.json() as MagicLinkRequestBody;
  } catch {
    return apiResponse.badRequest("Magic link payload must be valid JSON");
  }

  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : null;
  if (!email) {
    return apiResponse.badRequest("Email is required.");
  }

  const inviteCode = typeof body.inviteCode === "string" ? body.inviteCode.trim() : typeof body.invite_code === "string" ? body.invite_code.trim() : null;
  const redirectTo = typeof body.redirectTo === "string" ? body.redirectTo.trim() : "/app";

  const clientIp = extractClientIP(request);
  const rateKey = createCompositeRateLimitKey({ clientIP: clientIp, route: "magiclink", userId: email });
  const { success } = await checkRateLimit(rateKey, otpRateLimit);
  if (!success) {
    return apiResponse.error("RATE_LIMITED", "Too many requests. Please try again soon.", 429);
  }

  const captchaToken = typeof (body as Record<string, UntypedJson>).captchaToken === "string" ? ((body as Record<string, UntypedJson>).captchaToken as string).trim() : null;
  const captcha = await verifyCaptcha(captchaToken, clientIp);
  if (!captcha.success) {
    return apiResponse.badRequest(captcha.reason ?? "Captcha validation failed.");
  }

  try {
    const { url, anonKey } = assertSupabaseConfig();

    const key = anonKey; // Force usage of Anon Key for client-side like auth flows whitelist

    if (!key) {
      return apiResponse.internalError("Supabase keys are not configured.");
    }

    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const origin = resolveRequestOrigin(request);
    const continueToken = createContinueToken(redirectTo ?? "/app");
    const emailRedirectTo = buildMagicLinkConfirmUrl(origin, continueToken ?? redirectTo);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
        shouldCreateUser: true,
        data: inviteCode ? { invite_code: inviteCode } : undefined,
      },
    });

    if (error) {
      throw error;
    }

    authLogger.info("magic_link_requested", { email: email.toLowerCase(), redirectTo: emailRedirectTo });
    return apiResponse.success({ ok: true, expires_in: 60 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send magic link.";
    logger.error(`[MagicLink] Raw Error:`, error);
    authLogger.warn("magic_link_request_failed", { email: email.toLowerCase(), message });
    return apiResponse.internalError(message);
  }
}
