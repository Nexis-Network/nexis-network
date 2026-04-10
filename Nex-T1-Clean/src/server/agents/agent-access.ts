import type { NextRequest } from "next/server";

import { createErrorResponse, getOrCreateCorrelationId } from "@/lib/request-utils";
import { canManageAgent, canViewPrivateAgentConfig, shouldRedactAgentConfig } from "@/server/agents/access";
import type { OrgMemberRole } from "@/server/api/helpers/with-agent-auth";
import { withAuth } from "@/server/security/with-auth";
import { createServiceRoleClient, type SupabaseServiceRoleClient } from "@/server/services/supabase/service-role";

export type AgentVisibility = "public" | "private" | "unlisted";

export type AgentAccess = {
  correlationId: string;
  service: SupabaseServiceRoleClient;
  agent: {
    id: string;
    orgId: string;
    ownerUserId: string | null;
    visibility: AgentVisibility;
  };
  userId: string | null;
  membershipRole: OrgMemberRole;
  isMember: boolean;
  canManage: boolean;
  canViewPrivateConfig: boolean;
  shouldRedactConfig: boolean;
};

export type AgentAccessResult =
  | { ok: true; access: AgentAccess }
  | { ok: false; response: Response };

export async function resolveAgentAccess(
  req: NextRequest,
  agentId: string,
  options: { allowPublic?: boolean; requireMembership?: boolean } = {},
): Promise<AgentAccessResult> {
  const correlationId = getOrCreateCorrelationId(req);
  const allowPublic = options.allowPublic ?? true;
  const requireMembership = options.requireMembership ?? false;

  const auth = await withAuth(req, { allowPublic, requireOrg: false });
  if (!auth.ok) return { ok: false, response: auth.response };
  const userId = auth.session?.user?.id ?? null;

  let service: SupabaseServiceRoleClient;
  try {
    service = createServiceRoleClient();
  } catch (error) {
    return {
      ok: false,
      response: createErrorResponse(error, {
        status: 500,
        customMessage: "Supabase service role not configured",
        headers: { "X-Correlation-Id": correlationId },
      }),
    };
  }

  const { data: agentRow, error: agentError } = await service
    .from("agent")
    .select("id, org_id, owner_user_id, visibility")
    .eq("id", agentId)
    .maybeSingle();

  if (agentError) {
    return {
      ok: false,
      response: createErrorResponse(new Error(agentError.message), {
        status: 400,
        customMessage: "Unable to load agent",
        headers: { "X-Correlation-Id": correlationId },
      }),
    };
  }

  if (!agentRow) {
    return {
      ok: false,
      response: createErrorResponse(new Error("Agent not found"), {
        status: 404,
        customMessage: "agent not found",
        headers: { "X-Correlation-Id": correlationId },
      }),
    };
  }

  const { role: membershipRole, isMember } = await resolveOrgMembershipRole({
    service,
    orgId: agentRow.org_id,
    userId,
  });

  if (requireMembership && !isMember) {
    return {
      ok: false,
      response: createErrorResponse(new Error("Forbidden"), {
        status: 403,
        headers: { "X-Correlation-Id": correlationId },
      }),
    };
  }

  const ownerUserId = (agentRow.owner_user_id as string | null) ?? null;
  const visibility = normalizeAgentVisibility(agentRow.visibility);

  const canViewPrivateConfig = userId
    ? canViewPrivateAgentConfig({
        userId,
        membershipRole,
        agentOwnerUserId: ownerUserId,
      })
    : false;

  const shouldRedactConfig = shouldRedactAgentConfig({
    agentVisibility: visibility,
    canViewPrivateConfig,
  });

  const canManage = isMember ? canManageAgent(membershipRole) : false;

  if (visibility === "private") {
    const canViewPrivateAgent =
      isMember || (userId !== null && ownerUserId !== null && userId === ownerUserId);

    if (!canViewPrivateAgent) {
      return {
        ok: false,
        response: createErrorResponse(new Error("Agent not found"), {
          status: 404,
          customMessage: "agent not found",
          headers: { "X-Correlation-Id": correlationId },
        }),
      };
    }
  }

  return {
    ok: true,
    access: {
      correlationId,
      service,
      agent: {
        id: agentRow.id,
        orgId: agentRow.org_id,
        ownerUserId,
        visibility,
      },
      userId,
      membershipRole,
      isMember,
      canManage,
      canViewPrivateConfig,
      shouldRedactConfig,
    },
  };
}

export function normalizeOrgMemberRole(value: UntypedJson): OrgMemberRole {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  switch (normalized) {
    case "owner":
    case "admin":
    case "manager":
    case "viewer":
      return normalized;
    default:
      return "viewer";
  }
}

export async function resolveOrgMembershipRole(options: {
  service: SupabaseServiceRoleClient;
  orgId: string;
  userId: string | null;
}): Promise<{ role: OrgMemberRole; isMember: boolean; error?: string | null }> {
  if (!options.userId) return { role: "viewer", isMember: false };

  const { data: membership, error } = await options.service
    .from("org_member")
    .select("role")
    .eq("org_id", options.orgId)
    .eq("user_id", options.userId)
    .maybeSingle();

  if (!error && membership) {
    return { role: normalizeOrgMemberRole((membership).role), isMember: true, error: null };
  }

  let verificationError: string | null = error?.message ?? null;

  // Fallback: some deployments rely on organization_member and sync org_member via triggers.
  // If that sync is unavailable (or delayed), check organization_member directly.
  try {
    const { data: userRow, error: userError } = await options.service
      .from("user")
      .select("id")
      .eq("supabase_uid", options.userId)
      .maybeSingle();

    if (userError) {
      return { role: "viewer", isMember: false, error: verificationError ?? userError.message };
    }
    if (!userRow) return { role: "viewer", isMember: false, error: verificationError };

    const { data: orgMembership, error: orgMembershipError } = await options.service
      .from("organization_member")
      .select("role")
      .eq("organization_id", options.orgId)
      .eq("user_id", (userRow).id)
      .maybeSingle();

    if (orgMembershipError) {
      return { role: "viewer", isMember: false, error: verificationError ?? orgMembershipError.message };
    }
    if (!orgMembership) return { role: "viewer", isMember: false, error: verificationError };

    return { role: normalizeOrgMemberRole((orgMembership).role), isMember: true, error: null };
  } catch {
    return { role: "viewer", isMember: false, error: verificationError };
  }
}

export function normalizeAgentVisibility(value: UntypedJson): AgentVisibility {
  switch (value) {
    case "public":
    case "private":
    case "unlisted":
      return value;
    default:
      return "private";
  }
}
