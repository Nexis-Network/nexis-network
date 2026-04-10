import {
  type DaoCapabilities,
  type DaoCapabilityPatch,
  type UpdateDaoInput,
  daoUpdateInputSchema,
  normalizeDaoSlug,
} from "@/modules/daos/contracts";
import {
  assertLinkedAgentAccessible,
  loadDaoOrganization,
  resolveAccess,
} from "./internal/dao-service-access";
import {
  insertDaoActivity,
  upsertDaoCapabilitiesRecord,
} from "./internal/dao-service-persistence";
import {
  DaoServiceError,
  nowIso,
} from "./internal/dao-service-utils";
import { getDaoOverview, refreshDaoDirectoryIndex } from "./directory-service";

export async function updateDao(options: {
  userId: string;
  orgId?: string | null;
  daoId: string;
  input: UpdateDaoInput;
}) {
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
  const input = daoUpdateInputSchema.parse(options.input);

  await assertLinkedAgentAccessible({
    service: access.service,
    linkedAgentId: input.linkedAgentId,
    orgId: access.orgId,
  });

  const nextSlug = input.slug?.trim()
    ? normalizeDaoSlug(input.slug)
    : dao.slug;
  const lifecycleState = input.lifecycleState ?? dao.lifecycleState;
  const archivedAt =
    lifecycleState === "archived" || lifecycleState === "detached"
      ? dao.archivedAt ?? nowIso()
      : null;

  const { error } = await access.service
    .from("dao_organizations")
    .update({
      ...(input.name !== undefined ? { name: input.name } : {}),
      slug: nextSlug,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.ownershipMode !== undefined ? { ownership_mode: input.ownershipMode } : {}),
      lifecycle_state: lifecycleState,
      ...(input.governanceModel !== undefined ? { governance_model: input.governanceModel } : {}),
      ...(input.treasuryModel !== undefined ? { treasury_model: input.treasuryModel } : {}),
      ...(input.linkedAgentId !== undefined ? { linked_agent_id: input.linkedAgentId } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      archived_at: archivedAt,
    })
    .eq("id", dao.id)
    .eq("org_id", access.orgId);

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_UPDATE_FAILED",
    });
  }

  if (lifecycleState === "detached") {
    await access.service
      .from("dao_capabilities")
      .update({
        agent_automation_enabled: false,
        agent_voting_enabled: false,
      })
      .eq("dao_id", dao.id);
  }

  await insertDaoActivity({
    service: access.service,
    daoId: dao.id,
    orgId: access.orgId,
    actorUserId: access.userId,
    activityType: "dao.updated",
    title: "DAO updated",
    body: `Settings updated for ${dao.name}.`,
    metadata: {
      lifecycleState,
      linkedAgentId: input.linkedAgentId ?? dao.linkedAgentId,
    },
  });

  await refreshDaoDirectoryIndex({
    service: access.service,
    orgId: access.orgId,
    daoId: dao.id,
  });

  return getDaoOverview({
    userId: access.userId,
    orgId: access.orgId,
    daoId: dao.id,
  });
}

export async function updateDaoCapabilities(options: {
  userId: string;
  orgId?: string | null;
  daoId: string;
  patch: DaoCapabilityPatch;
}): Promise<DaoCapabilities> {
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

  const capabilities = await upsertDaoCapabilitiesRecord({
    service: access.service,
    daoId: dao.id,
    orgId: access.orgId,
    ownershipMode: dao.ownershipMode,
    patch: options.patch,
  });

  await insertDaoActivity({
    service: access.service,
    daoId: dao.id,
    orgId: access.orgId,
    actorUserId: access.userId,
    activityType: "dao.capabilities.updated",
    title: "DAO capabilities updated",
    body: `Capability flags changed for ${dao.name}.`,
    metadata: options.patch as Record<string, UntypedJson>,
  });

  await refreshDaoDirectoryIndex({
    service: access.service,
    orgId: access.orgId,
    daoId: dao.id,
  });

  return capabilities;
}
