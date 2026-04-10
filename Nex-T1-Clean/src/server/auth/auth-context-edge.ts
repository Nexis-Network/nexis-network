import { cookies as readCookies } from "next/headers";
import {
    createCookieBridge,
    type CookieBridge,
} from "@/server/auth/cookie-bridge";
import {
    extractEmailFromClaims,
    extractRolesFromClaims,
    buildSupabaseSessionRecord,
    type SupabaseSessionRecord,
    type SupabaseTokenClaims,
} from "@/server/auth/token-utils";
import { getVerifiedSupabaseSessionEdge } from "@/server/auth/session-edge";

export type { SupabaseSessionRecord, SupabaseTokenClaims } from "@/server/auth/token-utils";
export { getSupabaseAuthStorageKey } from "@/server/auth/token-utils";

export const SUPABASE_ACCESS_COOKIE = "sb-access-token";
export const SUPABASE_REFRESH_COOKIE = "sb-refresh-token";

export type SupabaseAuthContext = {
    accessToken: string;
    refreshToken?: string;
    userId: string;
    orgId?: string | null;
    email?: string | null;
    issuedAt?: number | null;
    expiresAt?: number | null;
    session: SupabaseSessionRecord;
    claims: SupabaseTokenClaims;
    roles: readonly string[];
};

export type ResolveSupabaseContextOptions = {
    request?: Request | null;
    refreshSession?: boolean;
};

/**
 * Edge-compatible context resolver.
 * Uses stateless JWT verification.
 */
export async function resolveSupabaseContextEdge(
    source?: CookieBridge | Awaited<ReturnType<typeof readCookies>>,
    options: ResolveSupabaseContextOptions = {},
): Promise<{ context: SupabaseAuthContext | null; cookies: CookieBridge }> {
    const cookieBridge =
        source && "setAll" in (source as CookieBridge)
            ? (source as CookieBridge)
            : createCookieBridge(
                (source as Awaited<ReturnType<typeof readCookies>>) ?? (await readCookies()),
            );

    const verifiedSession = await getVerifiedSupabaseSessionEdge({
        cookieBridge,
        request: options.request ?? null,
    });

    if (!verifiedSession) {
        return { context: null, cookies: cookieBridge };
    }

    const email = typeof verifiedSession.user.email === "string" ? verifiedSession.user.email : extractEmailFromClaims(verifiedSession.claims);
    const roles = extractRolesFromClaims(verifiedSession.claims);
    const rawOrgId =
        verifiedSession.claims["org_active_account"] ??
        verifiedSession.claims["org_id"] ??
        verifiedSession.claims["organization_id"];
    const orgId = typeof rawOrgId === "string" && rawOrgId.trim().length > 0 ? rawOrgId : null;

    const sessionRecord =
        buildSupabaseSessionRecord(
            verifiedSession.accessToken,
            verifiedSession.claims,
            verifiedSession.session,
            verifiedSession.user.id,
        ) ??
        {
            id: `supabase_session_${verifiedSession.user.id}`,
            provider: "supabase",
            user: verifiedSession.session.user as UntypedJson as Record<string, UntypedJson>,
            token: {
                access_token: verifiedSession.accessToken,
                refresh_token: verifiedSession.refreshToken ?? undefined,
                token_type: "bearer",
                expires_in: verifiedSession.expiresAt
                    ? Math.max(verifiedSession.expiresAt - (verifiedSession.issuedAt ?? Math.floor(Date.now() / 1000)), 0)
                    : undefined,
            },
            metadata: { source: "supabase" },
        };

    const context: SupabaseAuthContext = {
        accessToken: verifiedSession.accessToken,
        refreshToken: verifiedSession.refreshToken ?? undefined,
        userId: verifiedSession.user.id,
        orgId,
        email,
        issuedAt: verifiedSession.issuedAt,
        expiresAt: verifiedSession.expiresAt,
        session: sessionRecord,
        claims: verifiedSession.claims,
        roles,
    };

    return { context, cookies: cookieBridge };
}
