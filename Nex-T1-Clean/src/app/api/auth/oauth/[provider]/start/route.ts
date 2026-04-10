import { connection, NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { type SignInWithOAuthCredentials } from "@supabase/supabase-js";
import { createClient } from "@/server/services/supabase/server";

import { authLogger } from "@/server/logging/logger";
import { sanitizeRedirectTarget } from "@/server/auth/auth-context";
import { getProviderConfig } from "@/lib/auth/config";
import { createContinueToken } from "@/server/auth/continue-token";
import {
  getPublicSupabaseConfig,
  getSupabaseConfig,
} from "@/lib/supabase/config";
import {
  buildAuthErrorRedirect,
  resolvePublicAppOrigin,
} from "@/lib/auth/auth-origin";

const SOCIAL_PROVIDERS = new Set([
  "google",
  "google_oauth",
  "github",
  "github_oauth",
  "discord",
  "discord_oauth",
  "twitter",
  "twitter_oauth",
  "x",
  "x_oauth",
  "apple",
  "apple_oauth",
]);

function isSupabaseRootRedirect(candidateUrl: string): boolean {
  try {
    const resolved = new URL(candidateUrl);
    const supabaseBase = getSupabaseConfig()?.url;
    if (!supabaseBase) {
      return false;
    }
    const base = new URL(supabaseBase);
    const normalizedPath = resolved.pathname.replace(/\/+$/, "") || "/";
    return resolved.origin === base.origin && normalizedPath === "/";
  } catch {
    return false;
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  await connection();
  const { provider: raw } = await context.params;
  const requestedProvider = raw?.toLowerCase();
  if (!requestedProvider) {
    authLogger.warn("oauth_start_missing_provider");
    return new Response(JSON.stringify({ error: "Missing provider" }), {
      status: 400,
    });
  }

  const providerConfig = getProviderConfig(requestedProvider);
  const provider = providerConfig?.id ?? requestedProvider;

  const incomingUrl = new URL(req.url);
  const appOrigin = resolvePublicAppOrigin(req);
  const appOriginUrl = new URL(appOrigin);
  const redirectTo = sanitizeRedirectTarget(
    incomingUrl.searchParams.get("redirectTo"),
    appOriginUrl,
    "/app",
  );
  const inviteParam = (() => {
    const value = incomingUrl.searchParams.get("invite");
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed.length <= 128 ? trimmed : null;
  })();

  const publicConfig = getPublicSupabaseConfig();
  if (!publicConfig) {
    authLogger.error("oauth_start_supabase_unconfigured", { provider });
    Sentry.captureMessage("Supabase client unavailable during OAuth start", {
      level: "error",
      extra: { provider },
    });
    return new Response(
      JSON.stringify({ error: "Supabase is not configured" }),
      { status: 503 },
    );
  }

  // Use the server-side, cookie-aware client to ensures the PKCE code verifier
  // is correctly persisted to cookies (`sb-auth-token-code-verifier`).
  // Without this, the callback route will fail to exchange the code.
  const supabase = await createClient();

  if (!supabase) {
    authLogger.error("oauth_start_supabase_client_failed", { provider });
    return new Response(
      JSON.stringify({ error: "Failed to initialize Supabase client" }),
      { status: 500 },
    );
  }

  const callbackUrl = new URL(`/auth/callback`, appOrigin);
  const continueToken = createContinueToken(redirectTo);
  callbackUrl.searchParams.set("next", continueToken ?? redirectTo);
  callbackUrl.searchParams.set("provider", provider);
  if (inviteParam) {
    callbackUrl.searchParams.set("invite", inviteParam);
  }

  if (!providerConfig) {
    authLogger.warn("oauth_start_unknown_provider", { provider });
    // Fallback to raw provider if config not found, but log warning
  }

  const scopes = providerConfig?.scopes;
  const queryParams = providerConfig?.queryParams;

  authLogger.info("oauth_start", {
    provider,
    redirectTo,
    normalizedRedirect: callbackUrl.toString(),
    invite: inviteParam ?? undefined,
    scopes,
    social: SOCIAL_PROVIDERS.has(provider),
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as SignInWithOAuthCredentials["provider"],
    options: {
      redirectTo: callbackUrl.toString(),
      scopes,
      queryParams,
    },
  });

  if (error) {
    authLogger.error("oauth_start_error", {
      provider,
      redirectTo,
      error: error.message,
      code: error.code,
    });
    Sentry.captureException(error, {
      tags: { provider },
      extra: { redirectTo },
    });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  if (data?.url) {
    // If Supabase fails to build the provider redirect, it can sometimes return the
    // project root (which responds with {"error":"requested path is invalid"}).
    // Catch that here and surface a clearer error for users.
    if (!/^https?:\/\//iu.test(data.url) || isSupabaseRootRedirect(data.url)) {
      authLogger.error("oauth_start_invalid_redirect", {
        provider,
        url: data.url,
      });
      return buildAuthErrorRedirect(
        appOrigin,
        `oauth_invalid_redirect_${provider}`,
      );
    }

    return NextResponse.redirect(data.url, { status: 307 });
  }

  authLogger.error("oauth_start_missing_url", { provider, redirectTo });
  Sentry.captureMessage("Supabase OAuth start did not return url", {
    level: "error",
    extra: { provider, redirectTo },
  });
  return new Response(
    JSON.stringify({ error: "Unable to generate OAuth redirect" }),
    { status: 500 },
  );
}
