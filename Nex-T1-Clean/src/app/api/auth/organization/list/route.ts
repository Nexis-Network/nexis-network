import { connection } from "next/server";
import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import {
  mapOrganization,
  type OrganizationResponse,
} from "@/server/organization/organization-utils";
import { resolveOrgContext } from "@/server/organization/organization-handlers";

export async function GET() {
  await connection();
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);

  try {
    const orgCtx = await resolveOrgContext(cookieBridge);
    if (!orgCtx.ok) {
      // Avoid noisy 500s in dev when Supabase admin/config isn't available yet.
      if (orgCtx.response.status >= 500 && process.env.NODE_ENV !== "production") {
        const fallbackResponse = apiResponse.success([] as OrganizationResponse[]);
        fallbackResponse.headers.set("X-Organization-Fallback", "1");
        return cookieBridge.commit(fallbackResponse);
      }
      return orgCtx.response;
    }
    const { memberships } = orgCtx;

    const organizations: OrganizationResponse[] = [];
    const seen = new Set<string>();

    for (const membership of memberships) {
      if (!membership?.organization) continue;
      const mapped = mapOrganization(membership.organization);
      if (!seen.has(mapped.id)) {
        seen.add(mapped.id);
        organizations.push(mapped);
      }
    }

    return cookieBridge.commit(apiResponse.success(organizations));
  } catch (error) {
    return cookieBridge.commit(
      apiResponse.error("ORGANIZATION_LIST_ERROR", error instanceof Error ? error.message : "Failed to load organizations", 500),
    );
  }
}
