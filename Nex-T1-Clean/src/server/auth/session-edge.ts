import { type User } from "@supabase/supabase-js";
import { type CookieBridge, createCookieBridge } from "@/server/auth/cookie-bridge";
import { verifySupabaseJwt } from "@/server/auth/jwks-verify";
import {
    type SupabaseTokenClaims,
    extractEmailFromClaims,
    getSupabaseAuthStorageKey,
} from "@/server/auth/token-utils";

const SUPABASE_ACCESS_COOKIE = "sb-access-token";
const SUPABASE_REFRESH_COOKIE = "sb-refresh-token";

function coerceTokenString(value: UntypedJson): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function extractBearerToken(request: Request | null | undefined): string | null {
  const headerAuth = request?.headers?.get("authorization");
  if (!headerAuth) return null;
  if (!headerAuth.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return coerceTokenString(headerAuth.slice(7));
}

export type VerifiedSupabaseSession = {
    user: User;
    accessToken: string;
    refreshToken: string | null;
    issuedAt: number;
    expiresAt: number;
    session: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        token_type: string;
        user: User;
    };
    claims: SupabaseTokenClaims;
};

export function extractSupabaseAuthState({
    cookieJar,
    request,
}: {
    cookieJar: CookieBridge;
    request?: Request | null;
}) {
    const cookies = cookieJar.getAll();
    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let storedSession: { access_token?: string; refresh_token?: string } | null = null;

    // Create a map for easier cookie lookup
    const cookieMap = new Map(cookies.map((c) => [c.name, c.value]));

    // 1. Try Authorization header (Bearer token) FIRST
    const headerToken = extractBearerToken(request);
    const headerSupabase = coerceTokenString(request?.headers?.get("x-supabase-auth"));

    // 2. Try standard Supabase cookies
    const accessCookieValue = cookieMap.get(SUPABASE_ACCESS_COOKIE);
    const refreshCookieValue = cookieMap.get(SUPABASE_REFRESH_COOKIE);

    if (accessCookieValue) accessToken = accessCookieValue;
    if (refreshCookieValue) refreshToken = refreshCookieValue;

    // 3. Fallback to chunked session cookie written by @supabase/ssr (sb-<project>-auth-token)
    if (!accessToken || !refreshToken) { // Check both as chunked session might provide both
        const storageKey = getSupabaseAuthStorageKey();
        if (storageKey) {
            // Gather base + chunked cookies
            const rawChunks = cookieJar
                .getAll()
                .filter((cookie) => cookie.name === storageKey || cookie.name.startsWith(`${storageKey}.`))
                .map((cookie) => ({
                    index: cookie.name === storageKey ? 0 : Number.parseInt(cookie.name.slice(storageKey.length + 1), 10) || 0,
                    value: cookie.value,
                }))
                .sort((a, b) => a.index - b.index)
                .map((chunk) => chunk.value);

            if (rawChunks.length > 0) {
                const merged = rawChunks.join("");
                const decoded = merged.startsWith("base64-")
                    ? decodeBase64UrlSafe(merged.slice("base64-".length))
                    : decodeURIComponentSafe(merged);

                try {
                    const session = decoded ? JSON.parse(decoded) : null;
                    if (session && typeof session === "object") {
                        storedSession = session; // Store the parsed session
                        if (typeof session.access_token === "string") {
                            accessToken = session.access_token;
                        }
                        if (typeof session.refresh_token === "string") {
                            refreshToken = session.refresh_token;
                        }
                    }
                } catch {
                    // ignore malformed chunked session
                }
            }
        }
    }

    // Prioritize header over cookie
    const sessionToken = coerceTokenString(storedSession?.access_token);
    const legacyCookieToken = coerceTokenString(cookieMap.get(SUPABASE_ACCESS_COOKIE));
    
    // If header token exists, use it. Otherwise fall back to cookies.
    accessToken = headerToken ?? headerSupabase ?? accessToken ?? sessionToken ?? legacyCookieToken ?? null;

    const finalRefreshToken =
        coerceTokenString(storedSession?.refresh_token) ??
        coerceTokenString(cookieMap.get(SUPABASE_REFRESH_COOKIE)) ??
        refreshToken ?? 
        null;

    return { accessToken, refreshToken: finalRefreshToken, session: storedSession };
}

function decodeBase64UrlSafe(value: string): string | null {
    try {
        return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    } catch {
        return null;
    }
}

function decodeURIComponentSafe(value: string): string | null {
    try {
        return decodeURIComponent(value);
    } catch {
        return null;
    }
}

/**
 * Edge-compatible session verification.
 * ONLY verifies the JWT signature. Does NOT check Redis or Supabase DB.
 * Use this in Middleware.
 */
export async function getVerifiedSupabaseSessionEdge({
    cookieBridge,
    request,
}: {
    cookieBridge?: CookieBridge;
    request?: Request | null;
}): Promise<VerifiedSupabaseSession | null> {
    const bridge = cookieBridge ?? createCookieBridge({ getAll: () => [] });
    const authState = extractSupabaseAuthState({ cookieJar: bridge, request });

    if (!authState.accessToken) {
        return null;
    }

    const verified = await verifySupabaseJwt(authState.accessToken);
    if (!verified) {
        return null;
    }

    const claims = verified.payload as SupabaseTokenClaims;

    // Check token expiration
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresAt = typeof claims.exp === "number" ? claims.exp : null;
    if (expiresAt && expiresAt < nowSeconds) {
        return null;
    }

    // Construct a minimal User object from the JWT claims
    const coerceString = (value: UntypedJson): string =>
        typeof value === "string" ? value : Array.isArray(value) ? (typeof value[0] === "string" ? value[0] : "") : "";

    // This is "stateless" because we trust the signed JWT
    const user: User = {
        id: coerceString(claims.sub) || coerceString(claims.user_id) || coerceString(claims.userId) || coerceString(claims.id),
        aud: coerceString((claims as Record<string, UntypedJson>).aud),
        role: coerceString(claims.role),
        email: extractEmailFromClaims(claims) ?? "",
        email_confirmed_at: typeof claims.email_confirmed_at === "string" ? claims.email_confirmed_at : undefined,
        phone: coerceString(claims.phone),
        confirmed_at: typeof claims.confirmed_at === "string" ? claims.confirmed_at : undefined,
        last_sign_in_at: typeof claims.last_sign_in_at === "string" ? claims.last_sign_in_at : undefined,
        app_metadata: claims.app_metadata ?? {},
        user_metadata: claims.user_metadata ?? {},
        created_at: "",
        updated_at: "",
    };

    return {
        user,
        accessToken: authState.accessToken,
        refreshToken: authState.refreshToken,
        issuedAt: claims.iat ?? nowSeconds,
        expiresAt: expiresAt ?? nowSeconds + 3600,
        session: {
            access_token: authState.accessToken,
            refresh_token: authState.refreshToken ?? "",
            expires_in: (expiresAt ?? nowSeconds + 3600) - nowSeconds,
            token_type: "bearer",
            user,
        },
        claims,
    };
}
