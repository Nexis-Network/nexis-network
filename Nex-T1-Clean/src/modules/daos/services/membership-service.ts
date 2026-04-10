import {
  daoMembershipInputSchema,
  daoMembershipSchema,
  type DaoMembership,
  type DaoMembershipInput,
} from "@/modules/daos/contracts";
import {
  assertLinkedAgentAccessible,
  loadDaoOrganization,
  resolveAccess,
} from "./internal/dao-service-access";
import { insertDaoActivity } from "./internal/dao-service-persistence";
import {
  DaoServiceError,
  normalizeAddress,
  parseRow,
  parseRows,
} from "./internal/dao-service-utils";
import { refreshDaoDirectoryIndex } from "./directory-service";

export async function upsertDaoMembership(options: {
  userId: string;
  orgId?: string | null;
  daoId: string;
  input: DaoMembershipInput;
}): Promise<DaoMembership> {
  const access = await resolveAccess({
    userId: options.userId,
    orgId: options.orgId,
    requireManager: true,
  });
  const dao = await loadDaoOrganization({
    service: access.service,
    daoId: options.daoId,
    orgId: access.orgId,
  });
  const input = daoMembershipInputSchema.parse(options.input);

  if (input.agentId) {
    await assertLinkedAgentAccessible({
      service: access.service,
      linkedAgentId: input.agentId,
      orgId: access.orgId,
    });
  }

  let existingQuery = access.service
    .from("dao_memberships")
    .select("*")
    .eq("dao_id", dao.id)
    .limit(1);

  if (input.userId) {
    existingQuery = existingQuery.eq("user_id", input.userId);
  } else if (input.agentId) {
    existingQuery = existingQuery.eq("agent_id", input.agentId);
  } else if (input.walletAddress) {
    existingQuery = existingQuery.eq(
      "wallet_address",
      normalizeAddress(input.walletAddress, dao.primaryChainFamily),
    );
  }

  const { data: existingRow, error: existingError } =
    await existingQuery.maybeSingle();
  if (existingError) {
    throw new DaoServiceError(existingError.message, {
      status: 400,
      code: "DAO_MEMBERSHIP_EXISTING_LOOKUP_FAILED",
    });
  }

  const normalizedWalletAddress = input.walletAddress
    ? normalizeAddress(input.walletAddress, dao.primaryChainFamily)
    : null;

  const payload = {
    dao_id: dao.id,
    org_id: access.orgId,
    user_id: input.userId ?? null,
    agent_id: input.agentId ?? null,
    membership_type: input.membershipType,
    role: input.role,
    wallet_address: normalizedWalletAddress,
    voting_power: input.votingPower ?? null,
    source: input.source ?? "manual",
    is_active: input.isActive,
    metadata: input.metadata ?? {},
    added_by_user_id: access.userId,
  };

  const { data, error } = existingRow
    ? await access.service
        .from("dao_memberships")
        .update(payload)
        .eq("id", existingRow.id)
        .select("*")
        .single()
    : await access.service
        .from("dao_memberships")
        .insert(payload)
        .select("*")
        .single();

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_MEMBERSHIP_UPSERT_FAILED",
    });
  }

  const membership = parseRow(daoMembershipSchema, data, "dao_membership");

  await insertDaoActivity({
    service: access.service,
    daoId: dao.id,
    orgId: access.orgId,
    actorUserId: access.userId,
    actorAgentId: input.agentId ?? null,
    activityType: "dao.member.updated",
    title: "DAO membership updated",
    body: `Membership updated with role ${membership.role}.`,
    metadata: {
      membershipId: membership.id,
      membershipType: membership.membershipType,
      role: membership.role,
    },
  });

  await refreshDaoDirectoryIndex({
    service: access.service,
    orgId: access.orgId,
    daoId: dao.id,
  });

  return membership;
}

export async function listDaoMembers(options: {
  userId: string;
  orgId?: string | null;
  daoId: string;
}): Promise<DaoMembership[]> {
  const access = await resolveAccess({
    userId: options.userId,
    orgId: options.orgId,
  });

  await loadDaoOrganization({
    service: access.service,
    daoId: options.daoId,
    orgId: access.orgId,
  });

  const { data, error } = await access.service
    .from("dao_memberships")
    .select("*")
    .eq("dao_id", options.daoId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_MEMBERSHIP_LIST_FAILED",
    });
  }

  return parseRows(daoMembershipSchema, data ?? [], "dao_membership");
}

