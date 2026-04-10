import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import {
  generateUniqueSlug,
  mapOrganization,
  slugify,
  type OrganizationResponse,
} from "@/server/organization/organization-utils";
import { resolveOrgContext } from "@/server/organization/organization-handlers";

const ALLOWED_ROLES_FOR_UPDATE = new Set(["OWNER", "ADMIN", "owner", "admin"]);

type UpdatePayload = {
  organizationId?: UntypedJson;
  data?: UntypedJson;
};

type UpdateData = {
  name?: string;
  slug?: string;
};

export async function POST(request: Request) {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return cookieBridge.commit(apiResponse.badRequest("Update payload must be a JSON object."));

    const payload = body as UpdatePayload;
    const organizationId = typeof payload.organizationId === "string" ? payload.organizationId.trim() : "";
    if (!organizationId) {
      return cookieBridge.commit(apiResponse.badRequest("organizationId is required"));
    }

    const inputData = payload.data;
    if (!inputData || typeof inputData !== "object") {
      return cookieBridge.commit(apiResponse.badRequest("data is required"));
    }

    const dataObj = inputData as Record<string, UntypedJson>;
    const data: UpdateData = {};
    if (typeof dataObj.name === "string") {
      data.name = dataObj.name.trim();
    }
    if (typeof dataObj.slug === "string") {
      data.slug = dataObj.slug.trim();
    }

    if (!data.name && !data.slug) {
      return cookieBridge.commit(apiResponse.badRequest("No update fields provided"));
    }

    const orgCtx = await resolveOrgContext(cookieBridge);
    if (!orgCtx.ok) return orgCtx.response;
    const { admin, memberships } = orgCtx;

    const membership = memberships.find((entry) => entry?.organization?.id === organizationId);
    if (!membership || !membership.organization) {
      return cookieBridge.commit(apiResponse.notFound("Organization not found"));
    }

    if (!ALLOWED_ROLES_FOR_UPDATE.has(membership.role)) {
      return cookieBridge.commit(apiResponse.forbidden("Insufficient permissions"));
    }

    const updates: Record<string, UntypedJson> = {};

    if (data.name && data.name !== membership.organization.name) {
      updates.name = data.name;
    }

    if (data.slug) {
      const baseSlug = slugify(data.slug, membership.organization.slug ?? "org");
      const uniqueSlug = await generateUniqueSlug(admin, baseSlug, organizationId);
      if (uniqueSlug !== membership.organization.slug) {
        updates.slug = uniqueSlug;
      }
    }

    if (Object.keys(updates).length === 0) {
      return cookieBridge.commit(
        apiResponse.success({ success: true, organization: mapOrganization(membership.organization) }),
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await admin
      .from("org")
      .update(updates)
      .eq("id", organizationId)
      .select("*")
      .single();

    if (updateError) {
      if (typeof updateError.code === "string" && updateError.code === "23505") {
        return cookieBridge.commit(apiResponse.error("SLUG_ALREADY_IN_USE", "Slug already in use", 409));
      }
      throw updateError;
    }

    const organizationResponse: OrganizationResponse = mapOrganization(updated);

    return cookieBridge.commit(
      apiResponse.success({ success: true, organization: organizationResponse }),
    );
  } catch (error) {
    return cookieBridge.commit(
      apiResponse.error("ORGANIZATION_UPDATE_ERROR", error instanceof Error ? error.message : "Failed to update organization", 500),
    );
  }
}
