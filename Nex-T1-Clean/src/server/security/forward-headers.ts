import type { CookieBridge } from "@/server/auth/cookie-bridge";
import { getCookieValue } from "@/server/auth/cookie-bridge";
import { extractSupabaseAuthState } from "@/server/auth/token-utils";

export type ForwardOptions = {
  request?: Request | null;
  cookieBridge: CookieBridge;
  includeSupabaseHeader?: boolean;
  includeAuthorization?: boolean;
  includeAccountId?: boolean;
  accessToken?: string | null;
};

export function readSupabaseTokens(opts: { request?: Request | null; cookieBridge: CookieBridge }) {
  const authState = extractSupabaseAuthState({ request: opts.request ?? null, cookieJar: opts.cookieBridge });
  const supabaseRaw = authState.accessToken ?? undefined;
  const supabaseBearer = supabaseRaw ? `Bearer ${supabaseRaw}` : undefined;

  return { supabaseRaw, supabaseBearer } as const;
}

export function composeUpstreamHeaders({
  request = null,
  cookieBridge,
  includeSupabaseHeader = true,
  includeAuthorization = true,
  includeAccountId = true,
  accessToken,
}: ForwardOptions) {
  const headers: Record<string, string> = {};
  const tokens = typeof accessToken === "string" && accessToken.trim().length > 0
    ? { supabaseRaw: accessToken.trim(), supabaseBearer: `Bearer ${accessToken.trim()}` }
    : readSupabaseTokens({ request, cookieBridge });
  const { supabaseRaw, supabaseBearer } = tokens;
  if (includeSupabaseHeader && supabaseRaw) headers["X-Supabase-Auth"] = supabaseRaw;
  if (includeAuthorization && supabaseBearer) headers.Authorization = supabaseBearer;
  if (includeAccountId) {
    const accountId = getCookieValue(cookieBridge, "org_active_account");
    if (accountId) headers["X-Account-Id"] = accountId;
  }
  return headers;
}
