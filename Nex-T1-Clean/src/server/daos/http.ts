import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext, type SupabaseAuthContext } from "@/server/auth/auth-context";
import { ensureActiveOrg } from "@/server/organization/active-org";

export type DaoRequestContext = {
  userId: string;
  orgId: string;
  auth: SupabaseAuthContext;
  cookieBridge: ReturnType<typeof createCookieBridge>;
};

export async function resolveDaoRequestContext(
  request?: Request,
): Promise<
  | { ok: true; value: DaoRequestContext }
  | { ok: false; response: Response }
> {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(cookieBridge, {
    refreshSession: false,
    request,
  });

  if (!context?.userId) {
    return {
      ok: false,
      response: cookieBridge.commit(apiResponse.unauthorized("Not signed in")),
    };
  }

  const activeOrg = await ensureActiveOrg({
    cookieSource: cookieBridge,
    userId: context.userId,
    validateExisting: true,
  });
  if (!activeOrg.ok) {
    return {
      ok: false,
      response: activeOrg.response,
    };
  }

  return {
    ok: true,
    value: {
      userId: context.userId,
      orgId: activeOrg.orgId,
      auth: context,
      cookieBridge: activeOrg.cookieBridge,
    },
  };
}

export function commitDaoResponse(
  ctx: DaoRequestContext,
  response: Response,
): Response {
  return ctx.cookieBridge.pending().length > 0
    ? ctx.cookieBridge.commit(response)
    : response;
}
