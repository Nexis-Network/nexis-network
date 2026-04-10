import { cookies as readCookies } from "next/headers";

import { createEmptyProfile, deriveProfileFromSession } from "@/lib/user/profile";
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
import { getVerifiedSupabaseSession } from "@/server/auth/session";
import {
  getNonProductionTestModeOrgId,
  getNonProductionTestModeUserId,
  isNonProductionTestMode,
} from "@/server/auth/test-mode";

export type { SupabaseSessionRecord, SupabaseTokenClaims } from "@/server/auth/token-utils";
export { getSupabaseAuthStorageKey } from "@/server/auth/token-utils";

export const SUPABASE_ACCESS_COOKIE = "sb-access-token";
export const SUPABASE_REFRESH_COOKIE = "sb-refresh-token";

const ALLOWED_REDIRECT_HOSTS = (process.env.NEX_ALLOWED_REDIRECT_HOSTS ?? "")
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

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

function buildNonProductionTestModeContext(
  cookieBridge: CookieBridge,
  options: ResolveSupabaseContextOptions,
): SupabaseAuthContext {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 3600;
  const userId = getNonProductionTestModeUserId({
    cookies: cookieBridge,
    request: options.request ?? null,
  });
  const orgId = getNonProductionTestModeOrgId({
    cookies: cookieBridge,
    request: options.request ?? null,
  });
  const email = "dev@example.com";
  const claims: SupabaseTokenClaims = {
    sub: userId,
    email,
    role: "authenticated",
    org_active_account: orgId,
    app_metadata: {
      provider: "email",
      role: "authenticated",
    },
    user_metadata: {
      full_name: "Dev User",
    },
    iat: issuedAt,
    exp: expiresAt,
  };

  return {
    accessToken: "test-mode-access-token",
    refreshToken: "test-mode-refresh-token",
    userId,
    orgId,
    email,
    issuedAt,
    expiresAt,
    session: {
      id: `supabase_session_${userId}`,
      provider: "supabase",
      user: {
        id: userId,
        email,
        aud: "authenticated",
        role: "authenticated",
        app_metadata: {
          provider: "email",
          role: "authenticated",
        },
        user_metadata: {
          full_name: "Dev User",
        },
      },
      token: {
        access_token: "test-mode-access-token",
        refresh_token: "test-mode-refresh-token",
        token_type: "bearer",
        expires_in: 3600,
      },
      metadata: {
        source: "test-mode",
        orgId,
      },
    },
    claims,
    roles: ["authenticated"],
  };
}

export async function resolveSupabaseContext(
  source?: CookieBridge | Awaited<ReturnType<typeof readCookies>>,
  options: ResolveSupabaseContextOptions = {},
): Promise<{ context: SupabaseAuthContext | null; cookies: CookieBridge }> {
  const cookieBridge =
    source && "setAll" in (source as CookieBridge)
      ? (source as CookieBridge)
      : createCookieBridge(
          (source as Awaited<ReturnType<typeof readCookies>>) ?? (await readCookies()),
        );

  const verifiedSession = await getVerifiedSupabaseSession({
    cookieBridge,
    request: options.request ?? null,
  });

  if (!verifiedSession) {
    if (
      isNonProductionTestMode({
        cookies: cookieBridge,
        request: options.request ?? null,
      })
    ) {
      return {
        context: buildNonProductionTestModeContext(cookieBridge, options),
        cookies: cookieBridge,
      };
    }
    return { context: null, cookies: cookieBridge };
  }

  const email = typeof verifiedSession.user.email === "string" ? verifiedSession.user.email : extractEmailFromClaims(verifiedSession.claims);
  const roles = extractRolesFromClaims(verifiedSession.claims);
  const rawOrgId =
    verifiedSession.claims["org_active_account"] ??
    verifiedSession.claims["org_id"] ??
    verifiedSession.claims["organization_id"];
  const orgId = typeof rawOrgId === "string" && rawOrgId.trim().length > 0 ? rawOrgId : null;

  const context: SupabaseAuthContext = {
    accessToken: verifiedSession.accessToken,
    refreshToken: verifiedSession.refreshToken ?? undefined,
    userId: verifiedSession.user.id,
    orgId,
    email,
    issuedAt: verifiedSession.issuedAt,
    expiresAt: verifiedSession.expiresAt,
    session:
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
      },
    claims: verifiedSession.claims,
    roles,
  };

  return { context, cookies: cookieBridge };
}

export function sanitizeRedirectTarget(target: string | null | undefined, origin: URL, fallback = "/") {
  if (!target) {
    return fallback;
  }

  const trimmed = target.trim();
  if (trimmed.length === 0) {
    return fallback;
  }

  if (trimmed.startsWith("//")) {
    return fallback;
  }

  if (/^https?:\/\//iu.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const host = url.hostname.toLowerCase();
      const allowSet = new Set([origin.hostname.toLowerCase(), ...ALLOWED_REDIRECT_HOSTS]);
      if (allowSet.has(host)) {
        return url.toString();
      }
    } catch {
      /* fall through */
    }
    return fallback;
  }

  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  return trimmed;
}

export function mergeDerivedProfile(
  base: ReturnType<typeof createEmptyProfile>,
  session: SupabaseSessionRecord | null | undefined,
) {
  const derived = deriveProfileFromSession(session) ?? createEmptyProfile();
  return {
    ...base,
    identity: {
      ...base.identity,
      ...derived.identity,
    },
    security: {
      ...base.security,
      ...derived.security,
    },
    bio: derived.bio ?? base.bio,
    locale: derived.locale ?? base.locale,
  };
}
