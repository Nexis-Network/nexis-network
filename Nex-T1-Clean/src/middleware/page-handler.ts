import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { updateSession } from "@/lib/supabase/middleware";
import {
  SUPABASE_ACCESS_COOKIE,
  SUPABASE_REFRESH_COOKIE,
  getSupabaseAuthStorageKey,
} from "@/server/auth/auth-context-edge";
import { resolveSupabaseContextEdge } from "@/server/auth/auth-context-edge";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import {
  SUPABASE_SESSION_REFRESH_CACHE_COOKIE,
  SUPABASE_SESSION_REFRESH_CACHE_WINDOW_SECONDS,
  parseRefreshCookie,
  stampRefreshCookie,
  determineSessionRefreshNeeded,
} from "@/lib/middleware/session-refresh";
import { extractSupabaseAuthState } from "@/server/auth/session-edge";
import { getRoutePolicyForPath } from "@/lib/middleware/route-policy";
import { getSupabaseConfig } from "@/lib/supabase/config";

import { logger } from "@/lib/logger";
const HIGH_ASSURANCE_REFRESH_STALE_SECONDS =
  2 * SUPABASE_SESSION_REFRESH_CACHE_WINDOW_SECONDS;
const STATEFUL_VERIFY_TIMEOUT_MS = 5000;

async function verifySupabaseSessionStatefully(
  accessToken: string,
): Promise<boolean> {
  const config = getSupabaseConfig();
  const supabaseUrl = config?.url ?? "";
  const apiKey = config?.anonKey ?? "";

  if (!supabaseUrl || !apiKey || !accessToken) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    STATEFUL_VERIFY_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: apiKey,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok;
  } catch (error) {
    logger.warn("auth_stateful_verify_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

type PageHandlerOptions = {
  request: NextRequest;
  requestHeaders: Headers;
  createSecureResponse: (response: NextResponse) => NextResponse;
  isE2ETest: boolean;
};

function isAppRouterFlightRequest(request: NextRequest): boolean {
  const rsc = request.headers.get("rsc");
  const routerStateTree = request.headers.get("next-router-state-tree");
  const accept = request.headers.get("accept") ?? "";

  return rsc === "1" || Boolean(routerStateTree) || accept.includes("text/x-component");
}

/**
 * Check if the request has any Supabase session cookies.
 */
function hasSupabaseSessionCookie(
  request: NextRequest,
  storageKey: string | null,
): boolean {
  if (process.env.NEX_DEBUG_MIDDLEWARE === "true") {
    logger.debug("[Middleware Debug]", {
      path: request.nextUrl.pathname,
      cookies: request.cookies.getAll().map((c) => c.name),
      storageKey,
      hasRefresh: request.cookies.has(SUPABASE_REFRESH_COOKIE),
      hasAccess: request.cookies.has(SUPABASE_ACCESS_COOKIE),
      envURL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
  }
  if (
    request.cookies.has(SUPABASE_ACCESS_COOKIE) ||
    request.cookies.has(SUPABASE_REFRESH_COOKIE)
  ) {
    return true;
  }

  if (!storageKey) return false;
  if (request.cookies.has(storageKey)) return true;
  for (let index = 0; index < 5; index += 1) {
    if (request.cookies.has(`${storageKey}.${index}`)) return true;
  }
  return false;
}

/**
 * Identify Supabase project-scoped cookies that don't match the current project ref.
 * This clears out legacy cookies (e.g., switching between Supabase projects) to avoid
 * noisy middleware logs and auth confusion.
 */
function findStaleSupabaseProjectCookies(
  request: NextRequest,
  storageKey: string | null,
): string[] {
  if (!storageKey) return [];

  return request.cookies
    .getAll()
    .map(({ name }) => name)
    .filter((name) => {
      // Check if it looks like a Supabase auth token
      const isProjectCookie =
        name.startsWith("sb-") && name.includes("-auth-token");
      if (!isProjectCookie) return false;

      // Allow the main token and its chunks
      const belongsToCurrentProject =
        name === storageKey || name.startsWith(`${storageKey}.`);

      // Also allow the PKCE code verifier cookie: {storageKey}-code-verifier
      const isCodeVerifier = name === `${storageKey}-code-verifier`;

      return !belongsToCurrentProject && !isCodeVerifier;
    });
}

export async function handlePageRoutes({
  request,
  requestHeaders,
  createSecureResponse,
  isE2ETest,
}: PageHandlerOptions): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const requestMethod = request.method.toUpperCase();
  const storageKey = getSupabaseAuthStorageKey();
  const staleProjectCookies = findStaleSupabaseProjectCookies(
    request,
    storageKey,
  );
  const hasSupabaseSession = hasSupabaseSessionCookie(request, storageKey);
  const routePolicy = getRoutePolicyForPath(pathname);
  const requiresAuth = routePolicy.requiresAuth;
  const isAuthRoute = pathname.startsWith("/auth");

  const applyCookieCleanup = (response: NextResponse) => {
    staleProjectCookies.forEach((name) => response.cookies.delete(name));
    return response;
  };

  // Allow analytics beacon traffic to reach the route handler even when the
  // analytics page itself remains auth-gated for normal navigation.
  const isAnalyticsBeaconRequest =
    pathname === "/analytics" &&
    (requestMethod === "POST" || requestMethod === "OPTIONS");
  if (isAnalyticsBeaconRequest) {
    const earlyResponse = NextResponse.next({
      request: { headers: requestHeaders },
    });
    return createSecureResponse(applyCookieCleanup(earlyResponse));
  }

  // Fast path: Skip all auth work for public routes without session
  const isDev = process.env.NODE_ENV !== "production";
  const devAuthBypass =
    isDev && process.env.DEV_AUTH_BYPASS === "true";

  if (process.env.NEX_DEBUG_MIDDLEWARE === "true") {
    logger.debug("[Middleware Debug] Auth Bypass Check:", {
      isDev,
      envVar: process.env.DEV_AUTH_BYPASS,
      devAuthBypass,
      path: pathname,
    });
  }

  if (isE2ETest || devAuthBypass || (!requiresAuth && !hasSupabaseSession)) {
    const earlyResponse = NextResponse.next({
      request: { headers: requestHeaders },
    });
    return createSecureResponse(applyCookieCleanup(earlyResponse));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Session Verification & Refresh
  // ─────────────────────────────────────────────────────────────────────────
  const cookieBridge = createCookieBridge(request.cookies);

  // Step 1: Verify the session using JWKS (single API call via getVerifiedSupabaseSession)
  const { context } = await resolveSupabaseContextEdge(cookieBridge, {
    request,
  });
  let verifiedContext = context;
  const isProduction = process.env.NODE_ENV === "production";

  const nowSeconds = Math.floor(Date.now() / 1000);
  const lastRefreshSeconds = await parseRefreshCookie(
    request.cookies.get(SUPABASE_SESSION_REFRESH_CACHE_COOKIE)?.value,
  );

  // Step 2: Determine if session refresh is needed (consolidated logic)
  const refreshDecision = determineSessionRefreshNeeded({
    hasSupabaseSession,
    context: verifiedContext,
    routeRequiresAuth: requiresAuth,
    refreshMode: routePolicy.refresh,
    lastRefreshSeconds,
    nowSeconds,
  });

  // Step 3: If refresh needed, sync session BUT pass the already-verified user
  // to avoid calling getUser() again (eliminates double API call!)
  const candidateUser = verifiedContext?.session?.user;
  const preVerifiedUser: User | undefined =
    candidateUser &&
    typeof candidateUser === "object" &&
    typeof (candidateUser as { id?: unknown }).id === "string"
      ? (candidateUser as User)
      : undefined;

  const syncResult = refreshDecision.shouldRefresh
    ? await updateSession(request, {
        // If we already have a verified context, pass the user to skip redundant verification
        // The session sync will still refresh cookies, but won't hit the auth API again
        preVerifiedUser,
      })
    : null;

  const response = (syncResult?.response ??
    NextResponse.next({
      request: { headers: requestHeaders },
    })) as NextResponse;
  const mutations = syncResult?.mutations ?? [];

  // Use the sync result's user if available, otherwise fall back to context
  let isAuthenticated = Boolean(syncResult?.user ?? verifiedContext);

  // Dev-only fallback: if Edge JWT verification is unavailable (e.g. HS256 without secret/JWKS),
  // but we do have session cookies, statefully verify against Supabase.
  // This keeps local development usable while production continues to fail closed.
  if (!isAuthenticated && !isProduction && hasSupabaseSession && requiresAuth) {
    const authState = extractSupabaseAuthState({
      cookieJar: cookieBridge,
      request,
    });
    const accessToken = authState.accessToken ?? null;
    if (accessToken) {
      const statefulVerified =
        await verifySupabaseSessionStatefully(accessToken);
      if (statefulVerified) {
        isAuthenticated = true;
        // Stamp refresh cookie so we don't re-hit Supabase on every request.
        await stampRefreshCookie(response, nowSeconds);
        if (process.env.NEX_DEBUG_MIDDLEWARE === "true") {
          logger.info("auth_stateful_dev_fallback_success", { path: pathname });
        }
      }
    }
  }

  const refreshAgeSeconds =
    typeof lastRefreshSeconds === "number"
      ? nowSeconds - lastRefreshSeconds
      : null;
  const isHighAssuranceRoute = routePolicy.assurance === "high";
  const refreshCookieStale =
    isHighAssuranceRoute &&
    hasSupabaseSession &&
    (refreshAgeSeconds === null ||
      refreshAgeSeconds > HIGH_ASSURANCE_REFRESH_STALE_SECONDS);

  if (refreshCookieStale && requiresAuth) {
    logger.warn("auth_refresh_cookie_stale", {
      path: pathname,
      ageSeconds: refreshAgeSeconds ?? -1,
    });
    const authState = extractSupabaseAuthState({
      cookieJar: cookieBridge,
      request,
    });
    const accessToken =
      authState.accessToken ?? verifiedContext?.accessToken ?? null;
    const statefulVerified = accessToken
      ? await verifySupabaseSessionStatefully(accessToken)
      : false;

    if (statefulVerified) {
      logger.info("auth_stateful_reverification_success", {
        path: pathname,
        ageSeconds: refreshAgeSeconds ?? -1,
      });
      // Refresh the stale marker so we don't re-verify repeatedly
      await stampRefreshCookie(response, nowSeconds);
    } else {
      logger.warn("auth_stateful_reverification_failed", {
        path: pathname,
        ageSeconds: refreshAgeSeconds ?? -1,
      });
      verifiedContext = null;
      isAuthenticated = false;
      response.cookies.delete(SUPABASE_ACCESS_COOKIE);
      response.cookies.delete(SUPABASE_REFRESH_COOKIE);
    }
  }

  // Stamp refresh cookie if we refreshed or auth is required but user is not authenticated
  if (refreshDecision.shouldRefresh || (requiresAuth && !isAuthenticated)) {
    await stampRefreshCookie(response, nowSeconds);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Authentication Flow
  // ─────────────────────────────────────────────────────────────────────────

  // Auth routes: if already authenticated, bounce to target (default /app)
  if (isAuthRoute) {
    if (isAuthenticated) {
      const redirectParam =
        request.nextUrl.searchParams.get("redirectTo") ??
        request.nextUrl.searchParams.get("next");

      const targetPath =
        redirectParam && redirectParam.startsWith("/") ? redirectParam : "/app";

      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = targetPath;
      redirectUrl.search = "";

      const redirectResponse = NextResponse.redirect(redirectUrl);
      if (refreshDecision.shouldRefresh) {
        await stampRefreshCookie(redirectResponse, nowSeconds);
      }

      mutations.forEach(({ name, value, options }) => {
        redirectResponse.cookies.set(name, value, options);
      });

      return createSecureResponse(applyCookieCleanup(redirectResponse));
    }

    return createSecureResponse(applyCookieCleanup(response));
  }

  // Public routes don't need auth check
  if (!requiresAuth) {
    return createSecureResponse(applyCookieCleanup(response));
  }

  if (!isAuthenticated) {
    // Clear all auth cookies to prevent redirect loops from stale/competing sessions
    const storageKey = getSupabaseAuthStorageKey();

    // Clear generic cookies
    response.cookies.delete(SUPABASE_ACCESS_COOKIE);
    response.cookies.delete(SUPABASE_REFRESH_COOKIE);
    response.cookies.delete(SUPABASE_SESSION_REFRESH_CACHE_COOKIE);

    // Clear project-specific cookies (and chunks)
    if (storageKey) {
      response.cookies.delete(storageKey);
      // Clear potential chunks (up to 20 is usually sufficient, using 10 safely covers most)
      for (let i = 0; i < 10; i++) {
        response.cookies.delete(`${storageKey}.${i}`);
      }
    }

    // App Router flight requests expect an RSC payload for the target route.
    // Rewriting protected route fetches to /auth can surface client-side
    // "Failed to fetch" navigation errors when the payload shape changes.
    // Use redirect for flight requests, keep rewrite for regular document loads.
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/auth";
    rewriteUrl.searchParams.set("view", "sign-in");
    rewriteUrl.searchParams.set(
      "redirectTo",
      `${pathname}${request.nextUrl.search ?? ""}`,
    );

    const shouldRedirectForFlight = isAppRouterFlightRequest(request);
    const unauthResponse = shouldRedirectForFlight
      ? NextResponse.redirect(rewriteUrl)
      : NextResponse.rewrite(rewriteUrl, {
          request: { headers: requestHeaders },
        });

    // Pass the redirect target via header for the auth page to handle post-login navigation
    requestHeaders.set(
      "x-auth-redirect-to",
      `${pathname}${request.nextUrl.search ?? ""}`,
    );

    // Apply cookie deletions to the rewrite response
    unauthResponse.cookies.delete(SUPABASE_ACCESS_COOKIE);
    unauthResponse.cookies.delete(SUPABASE_REFRESH_COOKIE);
    unauthResponse.cookies.delete(SUPABASE_SESSION_REFRESH_CACHE_COOKIE);

    if (storageKey) {
      unauthResponse.cookies.delete(storageKey);
      for (let i = 0; i < 10; i++) {
        unauthResponse.cookies.delete(`${storageKey}.${i}`);
      }
    }

    await stampRefreshCookie(unauthResponse, nowSeconds);

    // Apply cookie mutations from session sync
    mutations.forEach(({ name, value, options }) => {
      unauthResponse.cookies.set(name, value, options);
    });

    return createSecureResponse(applyCookieCleanup(unauthResponse));
  }

  if (routePolicy.requiredRoles?.length) {
    const userRoles = verifiedContext?.roles ?? [];
    const hasRole = userRoles.some((role) =>
      routePolicy.requiredRoles?.includes(role),
    );
    if (!hasRole) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/app";
      redirectUrl.searchParams.set("error", "forbidden");
      const forbiddenResponse = NextResponse.redirect(redirectUrl);
      return createSecureResponse(applyCookieCleanup(forbiddenResponse));
    }
  }

  return createSecureResponse(applyCookieCleanup(response));
}
