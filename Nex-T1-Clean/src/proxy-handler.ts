import { NextResponse, type NextRequest } from "next/server";
import { buildCspValue, applySecurityHeaders } from "@/lib/middleware/security-headers";
import { handleApiRoutes } from "@/middleware/api-handler";
import { handlePageRoutes } from "@/middleware/page-handler";
import { COUNTRY_COOKIE_NAME, LOCALE_COOKIE_NAME } from "@/i18n/config";
import { LOCALE_HEADER_NAME, resolveRequestLocale } from "@/i18n/request";

// COOP must be relaxed for routes that open or monitor cross-origin popups (e.g., OAuth)
const COOP_RELAXED_PREFIXES = ["/auth", "/oauth", "/api/auth", "/mcp"];

const shouldRelaxCoop = (pathname: string, isDev: boolean) =>
  isDev || COOP_RELAXED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const GEO_COUNTRY_HEADER_KEYS = ["x-vercel-ip-country", "cf-ipcountry", "x-country-code", "x-jurisdiction-country"] as const;

function getCountryCode(request: NextRequest) {
  for (const key of GEO_COUNTRY_HEADER_KEYS) {
    const value = request.headers.get(key)?.trim().toUpperCase();
    if (value && value.length === 2) {
      return value;
    }
  }

  return null;
}

// Re-export for backwards compatibility
export {
  SUPABASE_SESSION_REFRESH_CACHE_COOKIE,
  SUPABASE_SESSION_REFRESH_THRESHOLD_SECONDS,
  shouldRefreshSupabaseSession,
} from "@/lib/middleware/session-refresh";

const flagEnabled = (value: string | null | undefined) =>
  value === "true" || value === "1" || value === "yes";

/**
 * Main middleware proxy function.
 * Note: The `config` (matcher) must be defined directly in the root middleware.ts
 * for Next.js static analysis. Do not export config from this module.
 */
export async function proxy(request: NextRequest) {
  // Generate nonce for CSP
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const isDev = process.env.NODE_ENV !== "production";
  const frameAncestorsOverride = process.env.CSP_FRAME_ANCESTORS?.trim();
  // Optional allowlist for embedding in iframes (teams, dashboards, etc.)
  const allowEmbedding = Boolean(
    frameAncestorsOverride && !/^'?none'?$/i.test(frameAncestorsOverride)
  );

  const cspValue = buildCspValue(nonce, isDev, frameAncestorsOverride);

  // Prepare request headers with nonce and CSP
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspValue);
  const resolvedCountryCode = getCountryCode(request);
  const resolvedLocale = resolveRequestLocale({
    acceptLanguage: request.headers.get("accept-language"),
    cookieLocale: request.cookies.get(LOCALE_COOKIE_NAME)?.value,
    countryCode: request.cookies.get(COUNTRY_COOKIE_NAME)?.value ?? resolvedCountryCode,
  });
  requestHeaders.set(LOCALE_HEADER_NAME, resolvedLocale);

  const { pathname } = request.nextUrl;
  const coopPolicy = shouldRelaxCoop(pathname, isDev) ? "unsafe-none" : "same-origin-allow-popups";

  const createSecureResponse = (response: NextResponse) =>
    applySecurityHeaders(response, cspValue, nonce, { allowEmbedding, coopPolicy });

  const isE2ETest =
    flagEnabled(process.env.E2E_TEST_MODE) ||
    flagEnabled(process.env.NEXT_PUBLIC_TEST_MODE) ||
    flagEnabled(process.env.PLAYWRIGHT_TEST);

  // ─────────────────────────────────────────────────────────────────────────
  // API Routes Handler
  // ─────────────────────────────────────────────────────────────────────────
  const isLocalDev = process.env.NODE_ENV !== "production";
  if (pathname.startsWith("/api") || pathname.startsWith("/.well-known")) {
    if (pathname.startsWith("/api")) {
      return handleApiRoutes({
        request,
        requestHeaders,
        createSecureResponse,
        isE2ETest,
        isLocalDev,
      });
    }
    // For .well-known (like workflow API), just bypass and apply security headers
    return createSecureResponse(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Next.js Internal Routes (bypass auth)
  // ─────────────────────────────────────────────────────────────────────────
  if (pathname.startsWith("/_next")) {
    return createSecureResponse(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Page Routes Handler
  // ─────────────────────────────────────────────────────────────────────────
  const response = await handlePageRoutes({
    request,
    requestHeaders,
    createSecureResponse,
    isE2ETest,
  });
  if (!request.cookies.get(LOCALE_COOKIE_NAME)?.value) {
    response.cookies.set(LOCALE_COOKIE_NAME, resolvedLocale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === "production",
    });
  }
  if (!request.cookies.get(COUNTRY_COOKIE_NAME)?.value && resolvedCountryCode) {
    response.cookies.set(COUNTRY_COOKIE_NAME, resolvedCountryCode, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}

// Matcher config intentionally NOT exported here.
// Next.js requires config to be defined directly in middleware.ts (not re-exported)
// for static analysis at build time. See: middleware.ts
