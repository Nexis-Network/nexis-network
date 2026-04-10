import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { AuthApiError, type EmailOtpType } from "@supabase/supabase-js";


import { sanitizeRedirectTarget } from "@/server/auth/auth-context";
import { verifyContinueToken } from "@/server/auth/continue-token";
import { authLogger } from "@/server/logging/logger";
import { createClient } from "@/server/services/supabase/server";


const EMAIL_TOKEN_HASH_TYPES = new Set<EmailOtpType>(
  ["magiclink", "signup", "invite", "recovery", "email_change"] as EmailOtpType[],
);

function normalizeEmailOtpType(rawType: string | null): EmailOtpType {
  if (!rawType) return "magiclink";
  const normalized = rawType.toLowerCase();
  return EMAIL_TOKEN_HASH_TYPES.has(normalized as EmailOtpType)
    ? (normalized as EmailOtpType)
    : "magiclink";
}

function buildAuthRedirect(origin: string, errorCode: string) {
  const target = new URL("/auth", origin);
  target.searchParams.set("view", "sign-in");
  target.searchParams.set("error", errorCode);
  return NextResponse.redirect(target, { status: 302 });
}

export async function GET(request: NextRequest) {
  const incoming = new URL(request.url);
  const tokenHash = incoming.searchParams.get("token_hash") ?? incoming.searchParams.get("tokenHash");
  const otpType = normalizeEmailOtpType(incoming.searchParams.get("type"));
  const rawRedirect = incoming.searchParams.get("redirectTo") ?? incoming.searchParams.get("next") ?? "/app";
  const continuePayload = verifyContinueToken(rawRedirect);
  const resolvedRedirect = continuePayload?.path ?? rawRedirect;
  const sanitizedRedirect = sanitizeRedirectTarget(resolvedRedirect, incoming, "/app");

  if (!tokenHash) {
    authLogger.warn("magic_link_confirm_missing_token", { type: otpType, redirectParam: sanitizedRedirect });
    return buildAuthRedirect(incoming.origin, "missing_token");
  }

  const supabase = await createClient();
  if (!supabase) {
    authLogger.error("magic_link_confirm_supabase_unconfigured");
    return buildAuthRedirect(incoming.origin, "supabase_unconfigured");
  }

  try {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (error) {
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify magic link";
    const code =
      error instanceof AuthApiError
        ? error.code ?? "magic_link_invalid"
        : "magic_link_invalid";
    authLogger.warn("magic_link_confirm_failed", { type: otpType, redirectTo: sanitizedRedirect, message, code });
    Sentry.captureException(error, {
      tags: { flow: "magic-link" },
      extra: { type: otpType, redirectTo: sanitizedRedirect },
    });
    return buildAuthRedirect(incoming.origin, code);
  }

  const destination =
    sanitizedRedirect.startsWith("http://") || sanitizedRedirect.startsWith("https://")
      ? sanitizedRedirect
      : new URL(sanitizedRedirect, incoming.origin).toString();

  authLogger.info("magic_link_confirm_success", { type: otpType, redirectTo: destination });

  return NextResponse.redirect(destination, { status: 302 });
}
