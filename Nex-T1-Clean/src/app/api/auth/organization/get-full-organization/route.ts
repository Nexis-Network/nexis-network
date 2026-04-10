import { connection } from "next/server";
import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import {
  mapOrganization,
  listOrganizationMembers,
  type OrganizationResponse,
} from "@/server/organization/organization-utils";
import { resolveOrgContext } from "@/server/organization/organization-handlers";

export async function GET(request: Request) {
  await connection();
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);

  try {
    const orgCtx = await resolveOrgContext(cookieBridge);
    if (!orgCtx.ok) return orgCtx.response;
    const { admin, memberships } = orgCtx;

    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId");
    const organizationSlug = url.searchParams.get("organizationSlug");

    const findById = (id?: string | null) =>
      id ? memberships.find((membership) => membership?.organization?.id === id) : undefined;
    const findBySlug = (slug?: string | null) =>
      slug ? memberships.find((membership) => membership?.organization?.slug === slug) : undefined;

    const selectedMembership = findById(organizationId) ?? findBySlug(organizationSlug) ?? memberships[0];

    if (!selectedMembership || !selectedMembership.organization) {
      return cookieBridge.commit(apiResponse.notFound("Organization not found"));
    }

    const organization = selectedMembership.organization;
    const organizationResponse: OrganizationResponse = mapOrganization(organization);

    const members = await listOrganizationMembers(admin, organization.id);

    return cookieBridge.commit(
      apiResponse.success({
        ...organizationResponse,
        members,
        invitations: [],
      })
    );
  } catch (error) {
    return cookieBridge.commit(
      apiResponse.error("ORGANIZATION_LOAD_ERROR", error instanceof Error ? error.message : "Failed to load organization", 500),
    );
  }
}
