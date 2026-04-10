import { NextResponse } from "next/server";
// Use the Edge-safe auth context type so the middleware bundle stays Edge-compatible
import type { SupabaseAuthContext } from "@/server/auth/auth-context-edge";

/**
 * Session refresh configuration.
 */
export const SUPABASE_SESSION_REFRESH_CACHE_COOKIE = "nex_session_refresh";
export const SUPABASE_SESSION_REFRESH_CACHE_WINDOW_SECONDS = 300; // 5 minutes
export const SUPABASE_SESSION_REFRESH_THRESHOLD_SECONDS = 600; // 10 minutes before expiry

const SESSION_REFRESH_COOKIE_SECRET = process.env.NEX_SESSION_REFRESH_SECRET?.trim();
const textEncoder = new TextEncoder();

/**
 * Compute HMAC signature for refresh timestamp to prevent tampering.
 */
async function computeRefreshSignature(timestamp: number): Promise<string | null> {
  if (!SESSION_REFRESH_COOKIE_SECRET) return null;
  const payload = textEncoder.encode(`${timestamp}:${SESSION_REFRESH_COOKIE_SECRET}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Encode a refresh timestamp into a signed cookie value.
 */
export async function encodeRefreshCookie(timestamp: number): Promise<string | null> {
  const signature = await computeRefreshSignature(timestamp);
  if (!SESSION_REFRESH_COOKIE_SECRET) {
    return Number.isFinite(timestamp) ? `${timestamp}` : null;
  }
  if (!signature) return null;
  return `${timestamp}.${signature}`;
}

/**
 * Parse and verify a refresh cookie value.
 */
export async function parseRefreshCookie(value: string | undefined): Promise<number | null> {
  if (!value) return null;
  
  const [rawTimestamp, signature] = value.split(".");
  if (!rawTimestamp) return null;
  
  const timestamp = Number.parseInt(rawTimestamp, 10);
  if (!Number.isFinite(timestamp)) return null;
  
  if (SESSION_REFRESH_COOKIE_SECRET) {
    if (!signature) return null;
    const expectedSignature = await computeRefreshSignature(timestamp);
    if (!expectedSignature || expectedSignature !== signature) return null;
  }
  
  return timestamp;
}

/**
 * Stamp a refresh cookie on the response.
 */
export async function stampRefreshCookie(response: NextResponse, timestamp: number): Promise<void> {
  const value = await encodeRefreshCookie(timestamp);
  if (!value) return;
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(SUPABASE_SESSION_REFRESH_CACHE_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SUPABASE_SESSION_REFRESH_CACHE_WINDOW_SECONDS,
  });
}

/**
 * Determine if a session needs to be refreshed based on expiration time.
 */
export function shouldRefreshSupabaseSession(
  context: SupabaseAuthContext | null,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!context) return true;
  
  const expiresAt = typeof context.expiresAt === "number" ? context.expiresAt : null;
  if (!expiresAt) return true;
  
  return expiresAt - nowSeconds <= SUPABASE_SESSION_REFRESH_THRESHOLD_SECONDS;
}

/**
 * Consolidated decision logic for session refresh.
 * 
 * @returns Object with decision and reasoning
 */
export function determineSessionRefreshNeeded(params: {
  hasSupabaseSession: boolean;
  context: SupabaseAuthContext | null;
  routeRequiresAuth: boolean;
  refreshMode: "always" | "lazy";
  lastRefreshSeconds: number | null;
  nowSeconds: number;
}): { shouldRefresh: boolean; reason: string } {
  const {
    hasSupabaseSession,
    context,
    routeRequiresAuth,
    refreshMode,
    lastRefreshSeconds,
    nowSeconds,
  } = params;

  const recentlyRefreshed =
    typeof lastRefreshSeconds === "number" &&
    nowSeconds - lastRefreshSeconds < SUPABASE_SESSION_REFRESH_CACHE_WINDOW_SECONDS;

  // Don't refresh if we just did
  if (recentlyRefreshed) {
    return { shouldRefresh: false, reason: "recently_refreshed" };
  }

  const needsRefresh = hasSupabaseSession ? shouldRefreshSupabaseSession(context, nowSeconds) : false;

  // For protected routes: refresh if no session or session needs refresh
  if (routeRequiresAuth) {
    if (!hasSupabaseSession) {
      return { shouldRefresh: true, reason: "no_session_on_protected_route" };
    }
    if (needsRefresh) {
      return { shouldRefresh: true, reason: "session_expiring_on_protected_route" };
    }
    return { shouldRefresh: false, reason: "session_valid" };
  }

  // For public routes with "always" refresh mode
  if (hasSupabaseSession && needsRefresh && refreshMode === "always") {
    return { shouldRefresh: true, reason: "session_expiring_always_refresh" };
  }

  return { shouldRefresh: false, reason: "no_refresh_needed" };
}
