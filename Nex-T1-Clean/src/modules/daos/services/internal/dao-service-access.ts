import { canManageAgent } from "@/server/agents/access";
import { resolveOrgMembershipRole } from "@/server/agents/agent-access";
import type { OrgMemberRole } from "@/server/api/helpers/with-agent-auth";
import {
  createServiceRoleClient,
  type SupabaseServiceRoleClient,
} from "@/server/services/supabase/service-role";
import {
  daoChainBindingSchema,
  daoMembershipSchema,
  daoOrganizationSchema,
  daoTreasuryActionSchema,
  type DaoMembership,
  type DaoOrganization,
  type DaoTreasuryAction,
} from "@/modules/daos/contracts";
import {
  type AccessResult,
  DaoServiceError,
  getHighestDaoRole,
  isNonEmptyString,
  normalizeAddress,
  parseRow,
  parseRows,
} from "./dao-service-utils";

async function resolveDefaultOrgIdForUser(
  service: SupabaseServiceRoleClient,
  userId: string,
): Promise<string | null> {
  const { data } = await service
    .from("org_member")
    .select("org_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  const orgId = Array.isArray(data) && data.length > 0 ? data[0]?.org_id : null;
  return typeof orgId === "string" && orgId.trim().length > 0 ? orgId : null;
}

export async function resolveAccess(options: {
  userId: string;
  orgId?: string | null;
  requireManager?: boolean;
  service?: SupabaseServiceRoleClient;
}): Promise<AccessResult> {
  const service = options.service ?? createServiceRoleClient();
  const orgId = isNonEmptyString(options.orgId ?? undefined)
    ? String(options.orgId)
    : await resolveDefaultOrgIdForUser(service, options.userId);

  if (!orgId) {
    throw new DaoServiceError("Active organization not found", {
      status: 400,
      code: "ORG_REQUIRED",
    });
  }

  const membership = await resolveOrgMembershipRole({
    service,
    orgId,
    userId: options.userId,
  });

  if (!membership.isMember) {
    throw new DaoServiceError("Forbidden", {
      status: 403,
      code: "FORBIDDEN",
    });
  }

  if (options.requireManager && !canManageAgent(membership.role)) {
    throw new DaoServiceError("Manager role required", {
      status: 403,
      code: "MANAGER_REQUIRED",
    });
  }

  return {
    service,
    userId: options.userId,
    orgId,
    membershipRole: membership.role,
  };
}

export async function loadDaoOrganization(options: {
  service: SupabaseServiceRoleClient;
  daoId: string;
  orgId: string;
}): Promise<DaoOrganization> {
  const { data, error } = await options.service
    .from("dao_organizations")
    .select("*")
    .eq("id", options.daoId)
    .eq("org_id", options.orgId)
    .maybeSingle();

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_LOOKUP_FAILED",
    });
  }

  if (!data) {
    throw new DaoServiceError("DAO not found", {
      status: 404,
      code: "DAO_NOT_FOUND",
    });
  }

  return parseRow(daoOrganizationSchema, data, "dao_organization");
}

export async function loadDaoMembershipsForUser(options: {
  service: SupabaseServiceRoleClient;
  daoId: string;
  userId: string;
}): Promise<DaoMembership[]> {
  const { data, error } = await options.service
    .from("dao_memberships")
    .select("*")
    .eq("dao_id", options.daoId)
    .eq("user_id", options.userId)
    .eq("is_active", true);

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_MEMBERSHIP_LOOKUP_FAILED",
    });
  }

  return parseRows(daoMembershipSchema, data ?? [], "dao_membership");
}

export async function loadDaoChainBinding(options: {
  service: SupabaseServiceRoleClient;
  daoId: string;
  orgId: string;
  chainBindingId: string;
}) {
  const { data, error } = await options.service
    .from("dao_chain_bindings")
    .select("*")
    .eq("id", options.chainBindingId)
    .eq("dao_id", options.daoId)
    .eq("org_id", options.orgId)
    .maybeSingle();

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_CHAIN_BINDING_LOOKUP_FAILED",
    });
  }

  if (!data) {
    throw new DaoServiceError("DAO chain binding not found", {
      status: 404,
      code: "DAO_CHAIN_BINDING_NOT_FOUND",
    });
  }

  return parseRow(daoChainBindingSchema, data, "dao_chain_binding");
}

export async function loadDaoTreasuryAction(options: {
  service: SupabaseServiceRoleClient;
  daoId: string;
  orgId: string;
  actionId: string;
}): Promise<DaoTreasuryAction> {
  const { data, error } = await options.service
    .from("dao_treasury_actions")
    .select("*")
    .eq("id", options.actionId)
    .eq("dao_id", options.daoId)
    .eq("org_id", options.orgId)
    .maybeSingle();

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_TREASURY_ACTION_LOOKUP_FAILED",
    });
  }

  if (!data) {
    throw new DaoServiceError("Treasury action not found", {
      status: 404,
      code: "DAO_TREASURY_ACTION_NOT_FOUND",
    });
  }

  return parseRow(daoTreasuryActionSchema, data, "dao_treasury_action");
}

export async function resolveDaoPermission(options: {
  service: SupabaseServiceRoleClient;
  daoId: string;
  userId: string;
  orgMembershipRole: OrgMemberRole;
  allowedDaoRoles?: Set<string>;
}): Promise<{ canManageOrg: boolean; highestDaoRole: string | null }> {
  const canManageOrg = canManageAgent(options.orgMembershipRole);
  if (canManageOrg) {
    return { canManageOrg: true, highestDaoRole: "admin" };
  }

  const memberships = await loadDaoMembershipsForUser({
    service: options.service,
    daoId: options.daoId,
    userId: options.userId,
  });

  const highestDaoRole = getHighestDaoRole(memberships);
  if (
    options.allowedDaoRoles &&
    (!highestDaoRole || !options.allowedDaoRoles.has(highestDaoRole))
  ) {
    throw new DaoServiceError("DAO role does not permit this action", {
      status: 403,
      code: "DAO_ROLE_FORBIDDEN",
    });
  }

  return { canManageOrg: false, highestDaoRole };
}

export async function assertLinkedAgentAccessible(options: {
  service: SupabaseServiceRoleClient;
  linkedAgentId: string | null | undefined;
  orgId: string;
}): Promise<void> {
  if (!options.linkedAgentId) {
    return;
  }

  const { data, error } = await options.service
    .from("agent")
    .select("id,org_id")
    .eq("id", options.linkedAgentId)
    .maybeSingle();

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "AGENT_LOOKUP_FAILED",
    });
  }

  if (!data || data.org_id !== options.orgId) {
    throw new DaoServiceError("Linked agent is not in this organization", {
      status: 400,
      code: "INVALID_LINKED_AGENT",
    });
  }
}

export async function verifyProofAddressOwnership(options: {
  service: SupabaseServiceRoleClient;
  userId: string;
  chainFamily: "evm" | "solana";
  proofAddress: string;
  linkedAgentId?: string | null;
}): Promise<{ ok: boolean; ownershipType: "user" | "agent" | null }> {
  const normalized = normalizeAddress(options.proofAddress, options.chainFamily);

  const { count: userWalletCount, error: userWalletError } = await options.service
    .from("wallet_accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", options.userId)
    .ilike("address", normalized);

  if (userWalletError) {
    throw new DaoServiceError(userWalletError.message, {
      status: 400,
      code: "WALLET_OWNERSHIP_LOOKUP_FAILED",
    });
  }

  if ((userWalletCount ?? 0) > 0) {
    return { ok: true, ownershipType: "user" };
  }

  const agentWalletQuery = options.service
    .from("agent_wallets")
    .select("id, agent:agent!inner(owner_user_id)", {
      count: "exact",
      head: true,
    })
    .eq("agent.owner_user_id", options.userId)
    .ilike("address", normalized);

  if (options.linkedAgentId) {
    agentWalletQuery.eq("agent_id", options.linkedAgentId);
  }

  const { count: agentWalletCount, error: agentWalletError } =
    await agentWalletQuery;
  if (agentWalletError) {
    throw new DaoServiceError(agentWalletError.message, {
      status: 400,
      code: "AGENT_WALLET_OWNERSHIP_LOOKUP_FAILED",
    });
  }

  if ((agentWalletCount ?? 0) > 0) {
    return { ok: true, ownershipType: "agent" };
  }

  return { ok: false, ownershipType: null };
}

