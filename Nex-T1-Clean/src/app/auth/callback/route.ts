import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { AuthApiError } from "@supabase/supabase-js";


import { sanitizeRedirectTarget } from "@/server/auth/auth-context";
import { verifyContinueToken } from "@/server/auth/continue-token";
import { validateInvite } from "@/server/auth/invite";
import { authLogger } from "@/server/logging/logger";
import { createClient } from "@/server/services/supabase/server";
import { recordUserSession } from "@/server/auth/session-log";
import { extractClientIP, getOrCreateCorrelationId } from "@/lib/request-utils";
import { resolvePublicAppOrigin } from "@/lib/auth/auth-origin";
import { triggerUserWalletBootstrap } from "@/server/services/wallets/bootstrap";
import { resolveOnboardingCompleted } from "@/lib/auth/onboarding-status";


import { logger } from '@/lib/logger';


type ErrorRedirectOptions = {
  provider?: string;
};

function normalizeProviderParam(value: string | null | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized && /^[a-z0-9_-]{2,32}$/u.test(normalized) ? normalized : undefined;
}

function sanitizeProviderErrorDetail(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }

  return normalized.slice(0, 240);
}

function buildErrorRedirect(origin: string, errorCode: string, options?: ErrorRedirectOptions) {
  const target = new URL("/auth/error", origin);
  target.searchParams.set("error", errorCode);
  if (options?.provider) {
    target.searchParams.set("provider", options.provider);
  }
  return NextResponse.redirect(target.toString(), 302);
}

function resolveDestination(origin: string, target: string) {
  try {
    return new URL(target, origin).toString();
  } catch {
    return new URL("/", origin).toString();
  }
}

export async function GET(request: NextRequest) {
  const incoming = new URL(request.url);
  // Use the public app origin for all redirects, not the internal container origin
  const appOrigin = resolvePublicAppOrigin(request);
  const provider = normalizeProviderParam(incoming.searchParams.get("provider"));
  const state = incoming.searchParams.get("state") ?? undefined;
  const invite = incoming.searchParams.get("invite") ?? undefined;
  const type = incoming.searchParams.get("type") ?? undefined;
  const error = incoming.searchParams.get("error");
  const providerErrorCode = sanitizeProviderErrorDetail(incoming.searchParams.get("error_code"));
  const providerErrorDescription = sanitizeProviderErrorDetail(
    incoming.searchParams.get("error_description"),
  );
  const code = incoming.searchParams.get("code")?.trim();

  const nextParam = incoming.searchParams.get("next") ?? incoming.searchParams.get("redirectTo");
  const continuePayload = verifyContinueToken(nextParam);
  const resolvedNext = continuePayload?.path ?? nextParam;
  const sanitizedRedirect = sanitizeRedirectTarget(resolvedNext, incoming, "/app");
  const destination = resolveDestination(appOrigin, sanitizedRedirect);

  if (error) {
    authLogger.error("oauth_callback_provider_error", {
      provider,
      error,
      errorCode: providerErrorCode,
      errorDescription: providerErrorDescription,
      state,
    });
    Sentry.captureMessage("OAuth provider returned error", {
      level: "error",
      tags: { provider: provider ?? "unknown" },
      extra: {
        error,
        errorCode: providerErrorCode,
        errorDescription: providerErrorDescription,
        state,
      },
    });
    return buildErrorRedirect(appOrigin, `provider_${error}`, { provider });
  }

  if (!code) {
    authLogger.warn("oauth_callback_missing_code", { provider, state });
    return buildErrorRedirect(appOrigin, "missing_code", { provider });
  }

  const supabase = await createClient();
  if (!supabase) {
    authLogger.error("oauth_callback_supabase_unconfigured", { provider });
    Sentry.captureMessage("Supabase client unavailable during OAuth callback", {
      level: "error",
      tags: { provider: provider ?? "unknown" },
    });
    return buildErrorRedirect(appOrigin, "supabase_unconfigured", { provider });
  }

  try {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      throw exchangeError;
    }
  } catch (exchangeError) {
    const message = exchangeError instanceof Error ? exchangeError.message : "Failed to exchange authorization code";
    const codeValue =
      exchangeError instanceof AuthApiError ? exchangeError.code ?? "auth_api_error" : "exchange_error";

    // Enhanced error logging for debugging
    const errorDetails = exchangeError instanceof AuthApiError
      ? {
          authApiCode: exchangeError.code,
          authApiMessage: exchangeError.message,
          authApiStatus: exchangeError.status,
          authApiName: exchangeError.name,
        }
      : { rawError: String(exchangeError) };

    authLogger.error("oauth_callback_exchange_failed", {
      provider,
      message,
      code: codeValue,
      state,
      ...errorDetails,
    });

    // Log to console for immediate visibility in Railway logs
    logger.error("[OAuth Callback] Exchange failed:", JSON.stringify({
      provider,
      code: codeValue,
      ...errorDetails,
    }, null, 2));
    Sentry.captureException(exchangeError, {
      tags: { provider: provider ?? "unknown" },
      extra: { redirectTo: sanitizedRedirect, state },
    });

    return buildErrorRedirect(appOrigin, codeValue, { provider });
  }

  try {
    const { data, error: sessionError } = await supabase.auth.getSession();
    const sessionUser = data?.session?.user ?? null;
    if (sessionError || !sessionUser) {
      throw sessionError ?? new Error("Supabase session missing after exchange");
    }

    const rawMetadataProvider =
      sessionUser?.app_metadata && typeof sessionUser.app_metadata === "object"
        ? (sessionUser.app_metadata as Record<string, UntypedJson>).provider
        : undefined;
    const derivedProvider =
      typeof rawMetadataProvider === "string" && rawMetadataProvider.length > 0
        ? rawMetadataProvider
        : provider ?? "unknown";

    if (invite && type?.toLowerCase() === "signup") {
      const normalizedInviteCode = invite.trim().toUpperCase();
      const inviteValidation = await validateInvite(invite);
      if (!inviteValidation.ok) {
        authLogger.warn("oauth_callback_invite_invalid", { invite, reason: inviteValidation.reason });
        return buildErrorRedirect(appOrigin, inviteValidation.reason ?? "invite_invalid", { provider });
      }
      try {
        await supabase.auth.updateUser({ data: { invite_code: normalizedInviteCode } });
        await supabase.rpc("process_referral_signup_from_invite", {
          p_invite_code: normalizedInviteCode,
          p_referred_user_id: sessionUser.id,
          p_referred_email: sessionUser.email ?? null,
        });
      } catch (updateError) {
        authLogger.warn("oauth_callback_invite_metadata_failed", {
          provider: derivedProvider,
          message: updateError instanceof Error ? updateError.message : "Failed to persist invite code",
        });
        Sentry.captureException(updateError, {
          tags: { provider: derivedProvider },
          extra: { invite },
        });
      }
    }

    authLogger.info("oauth_callback_success", {
      provider: derivedProvider,
      redirectTo: sanitizedRedirect,
      state,
      invite,
      userId: sessionUser?.id,
      correlationId: getOrCreateCorrelationId(request),
    });

    if (sessionUser?.id) {
      void recordUserSession({
        userId: sessionUser.id,
        ip: extractClientIP(request),
        userAgent: request.headers.get("user-agent"),
        tokenHash: state ?? undefined,
      });

      triggerUserWalletBootstrap({
        userId: sessionUser.id,
        email: sessionUser.email,
        source: "auth.callback",
      });
    }

    // Check onboarding status
    if (sessionUser?.id && typeof supabase.from === "function") {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("onboarding_completed, username, display_name")
        .eq("id", sessionUser.id)
        .maybeSingle();

      if (profileError) {
        authLogger.warn("oauth_callback_profile_fetch_failed", {
          provider: derivedProvider,
          userId: sessionUser.id,
          code: profileError.code,
          message: profileError.message,
        });
        return NextResponse.redirect(destination, 302);
      }

      const onboardingCompleted = resolveOnboardingCompleted({
        profileOnboardingCompleted: profile?.onboarding_completed ?? null,
        userCreatedAt:
          typeof sessionUser.created_at === "string"
            ? sessionUser.created_at
            : null,
      });

      if (!onboardingCompleted) {
        return NextResponse.redirect(resolveDestination(appOrigin, "/onboarding"), 302);
      }
    }
  } catch (sessionError) {
    const message = sessionError instanceof Error ? sessionError.message : "Failed to load Supabase session after exchange";
    authLogger.error("oauth_callback_session_failed", {
      provider,
      message,
      state,
    });
    Sentry.captureException(sessionError, {
      tags: { provider: provider ?? "unknown" },
      extra: { redirectTo: sanitizedRedirect, state },
    });
    return buildErrorRedirect(appOrigin, "session_error", { provider });
  }

  return NextResponse.redirect(destination, 302);
}
