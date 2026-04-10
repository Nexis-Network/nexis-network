import { createErrorResponse } from "@/lib/request-utils";
import {
  resolveAuthenticatedSupabaseUser,
  toStandardErrorResponse,
} from "@/server/api/helpers/auth-guard";
import type { createClient as createSupabase } from "@/server/services/supabase/server";

export type OrgMemberRole = "owner" | "admin" | "manager" | "viewer";

type AgentAuthResult =
  | {
      ok: true;
      // Non-null because withAgentAuth returns error response if supabase is null
      supabase: NonNullable<Awaited<ReturnType<typeof createSupabase>>>;
      userId: string;
      agentId: string;
      orgId: string;
      membershipRole: OrgMemberRole;
      agentOwnerUserId: string | null;
      agentVisibility: "public" | "private" | "unlisted";
      correlationId: string;
    }
  | { ok: false; response: Response };

type Options = {
  req: Request;
  agentId: string;
};

function normalizeOrgMemberRole(value: UntypedJson): OrgMemberRole {
  switch (value) {
    case "owner":
    case "admin":
    case "manager":
    case "viewer":
      return value;
    default:
      return "viewer";
  }
}

/**
 * Ensures Supabase client exists, user is authenticated, agent exists, and caller is member of the agent's org.
 * Returns common values used across agent routes.
 */
export async function withAgentAuth({ req, agentId }: Options): Promise<AgentAuthResult> {
  const authGuard = await resolveAuthenticatedSupabaseUser(req);
  if (!authGuard.ok) {
    return {
      ok: false,
      response: toStandardErrorResponse(authGuard),
    };
  }
  const { correlationId, supabase, userId } = authGuard.auth;

  const { data: agentRow, error: agentError } = await supabase
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
      response: createErrorResponse(new Error("Agent not found"), { status: 404, headers: { "X-Correlation-Id": correlationId } }),
    };
  }

  const { data: membership } = await supabase
    .from("org_member")
    .select("role")
    .eq("org_id", agentRow.org_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return {
      ok: false,
      response: createErrorResponse(new Error("Forbidden"), { status: 403, headers: { "X-Correlation-Id": correlationId } }),
    };
  }

  return {
    ok: true,
    supabase,
    userId,
    agentId,
    orgId: agentRow.org_id,
    membershipRole: normalizeOrgMemberRole(membership.role),
    agentOwnerUserId: (agentRow.owner_user_id as string | null) ?? null,
    agentVisibility: normalizeAgentVisibility(agentRow.visibility),
    correlationId,
  };
}

function normalizeAgentVisibility(value: UntypedJson): "public" | "private" | "unlisted" {
  switch (value) {
    case "public":
    case "private":
    case "unlisted":
      return value;
    default:
      return "private";
  }
}
