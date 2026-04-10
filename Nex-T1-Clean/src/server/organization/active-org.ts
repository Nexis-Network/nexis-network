import { cookies as readCookies } from "next/headers";

import { createCookieBridge, getCookieValue, type CookieBridge } from "@/server/auth/cookie-bridge";
import { resolveOrgContext } from "@/server/organization/organization-handlers";

export type ActiveOrgResult =
  | { ok: true; orgId: string; cookieBridge: CookieBridge }
  | { ok: false; response: Response };

type CookieSource = { getAll(): ReturnType<CookieBridge["getAll"]> } | CookieBridge;

function isCookieBridge(value: CookieSource): value is CookieBridge {
  return Boolean(value && typeof (value as CookieBridge).pending === "function");
}

/**
 * Ensures the authenticated user has an org/workspace and returns its id.
 * - If the org cookie already exists, it is returned.
 * - When requested, the org cookie is validated against the user's memberships.
 * - If the user has no orgs, a personal workspace is created via resolveOrgContext.
 * - The org cookie is staged on the returned CookieBridge (caller should commit if responding).
 */
export async function ensureActiveOrg(
  options: { cookieSource?: CookieSource; userId?: string; validateExisting?: boolean } = {},
): Promise<ActiveOrgResult> {
  const source = options.cookieSource;
  const cookieBridge = source && isCookieBridge(source)
    ? (source as CookieBridge)
    : createCookieBridge(source ?? (await readCookies()));

  const existing = getCookieValue(cookieBridge, "org_active_account");
  if (existing && !options.validateExisting) {
    return { ok: true, orgId: existing, cookieBridge };
  }

  const orgCtx = await resolveOrgContext(cookieBridge, options.userId);
  if (!orgCtx.ok) {
    return { ok: false, response: orgCtx.response };
  }

  const membershipOrgIds = orgCtx.memberships.flatMap((membership) => {
    const orgId = membership?.organization?.id;
    return typeof orgId === "string" && orgId.length > 0 ? [orgId] : [];
  });

  const orgId = existing && membershipOrgIds.includes(existing)
    ? existing
    : membershipOrgIds[0] ?? null;
  if (!orgId) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "organization_not_found" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    };
  }

  if (existing !== orgId) {
    cookieBridge.setAll([
      {
        name: "org_active_account",
        value: orgId,
        options: { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" },
      },
    ]);
  }

  return { ok: true, orgId, cookieBridge };
}

export function commitActiveOrgCookies(result: ActiveOrgResult, response: Response): Response {
  if (!result.ok) return response;
  const { cookieBridge } = result;
  return cookieBridge.pending().length > 0 ? cookieBridge.commit(response) : response;
}
