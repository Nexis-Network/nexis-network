import { apiResponse } from "@/lib/api-platform";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { createDefaultOrganization, fetchAuthUser, getAdminClient, listUserOrganizations } from "@/server/organization/organization-utils";


import { logger } from '@/lib/logger';
type CookieBridge = ReturnType<typeof createCookieBridge>;

export type OrgContext =
  | { ok: true; admin: ReturnType<typeof getAdminClient>; userId: string; user: NonNullable<Awaited<ReturnType<typeof fetchAuthUser>>>; memberships: Awaited<ReturnType<typeof listUserOrganizations>> }
  | { ok: false; response: Response };

export async function resolveOrgContext(cookieBridge: CookieBridge, userId?: string): Promise<OrgContext> {
  try {
    let supabaseUid = userId;

    if (!supabaseUid) {
      const { context } = await resolveSupabaseContext(cookieBridge, { refreshSession: false });
      supabaseUid = context?.userId ?? undefined;
    }

    if (!supabaseUid) {
      return { ok: false, response: cookieBridge.commit(apiResponse.unauthorized("Not signed in")) };
    }

    const admin = getAdminClient();
    const user = await fetchAuthUser(admin, supabaseUid);

    if (!user) {
      return { ok: false, response: cookieBridge.commit(apiResponse.badRequest("User record missing")) };
    }

    let memberships = await listUserOrganizations(admin, supabaseUid);

    if (memberships.length === 0) {
      await createDefaultOrganization(admin, user);
      memberships = await listUserOrganizations(admin, supabaseUid);
    }

    return { ok: true, admin, userId: supabaseUid, user, memberships };
  } catch (error) {
    logger.error("[resolveOrgContext] Error:", error);
    return {
      ok: false,
      response: cookieBridge.commit(
        apiResponse.internalError("Failed to load organization context"),
      ),
    };
  }
}
