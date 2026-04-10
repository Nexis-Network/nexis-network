import {
  daoActivitySchema,
  daoCapabilitiesSchema,
  daoChainBindingSchema,
  daoDirectoryFiltersSchema,
  daoDirectoryIndexSchema,
  daoImportSchema,
  daoMembershipSchema,
  daoProposalSchema,
  daoSyncJobSchema,
  daoTreasuryActionSchema,
  daoTreasurySchema,
  daoVoteSchema,
  type DaoDirectoryFilters,
  type DaoDirectoryIndexItem,
  type DaoOverview,
} from "@/modules/daos/contracts";
import {
  createServiceRoleClient,
  type SupabaseServiceRoleClient,
} from "@/server/services/supabase/service-role";
import {
  loadDaoOrganization,
  resolveAccess,
} from "./internal/dao-service-access";
import {
  calculateCapabilityScore,
  DaoServiceError,
  parseOptionalRow,
  parseRow,
  parseRows,
} from "./internal/dao-service-utils";

export type DirectoryRecord = DaoDirectoryIndexItem & {
  isMine: boolean;
};

export async function refreshDaoDirectoryIndex(options: {
  daoId: string;
  orgId: string;
  service?: SupabaseServiceRoleClient;
}): Promise<DaoDirectoryIndexItem> {
  const service = options.service ?? createServiceRoleClient();
  const dao = await loadDaoOrganization({
    service,
    daoId: options.daoId,
    orgId: options.orgId,
  });

  const [
    bindingsData,
    treasuriesData,
    proposalsData,
    membersData,
    capabilitiesData,
    activityData,
  ] = await Promise.all([
    service
      .from("dao_chain_bindings")
      .select("*")
      .eq("dao_id", dao.id)
      .order("created_at", { ascending: true }),
    service
      .from("dao_treasuries")
      .select("*")
      .eq("dao_id", dao.id)
      .order("is_primary", { ascending: false }),
    service
      .from("dao_proposals")
      .select("*")
      .eq("dao_id", dao.id)
      .order("created_at", { ascending: false }),
    service
      .from("dao_memberships")
      .select("*")
      .eq("dao_id", dao.id)
      .eq("is_active", true),
    service.from("dao_capabilities").select("*").eq("dao_id", dao.id).maybeSingle(),
    service
      .from("dao_activity")
      .select("created_at")
      .eq("dao_id", dao.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (bindingsData.error || treasuriesData.error || proposalsData.error || membersData.error) {
    throw new DaoServiceError(
      bindingsData.error?.message ||
        treasuriesData.error?.message ||
        proposalsData.error?.message ||
        membersData.error?.message ||
        "Failed to refresh DAO directory index",
      {
        status: 400,
        code: "DAO_DIRECTORY_REFRESH_FAILED",
      },
    );
  }

  const bindings = parseRows(daoChainBindingSchema, bindingsData.data ?? [], "dao_chain_binding");
  const treasuries = parseRows(daoTreasurySchema, treasuriesData.data ?? [], "dao_treasury");
  const proposals = parseRows(daoProposalSchema, proposalsData.data ?? [], "dao_proposal");
  const members = parseRows(daoMembershipSchema, membersData.data ?? [], "dao_membership");
  const capabilities = capabilitiesData.data
    ? parseRow(daoCapabilitiesSchema, capabilitiesData.data, "dao_capabilities")
    : null;

  const treasuryValueUsd = treasuries.reduce(
    (total, treasury) => total + (treasury.totalValueUsd ?? 0),
    0,
  );
  const hasTreasuryValue = treasuries.some(
    (treasury) =>
      typeof treasury.totalValueUsd === "number" &&
      Number.isFinite(treasury.totalValueUsd),
  );

  const lastActivityAt =
    typeof activityData.data?.created_at === "string"
      ? activityData.data.created_at
      : proposals[0]?.updatedAt ?? dao.updatedAt;

  const payload = {
    dao_id: dao.id,
    org_id: dao.orgId,
    slug: dao.slug,
    name: dao.name,
    description: dao.description,
    category: dao.category,
    ownership_mode: dao.ownershipMode,
    lifecycle_state: dao.lifecycleState,
    import_source: dao.importSource,
    primary_chain_family: dao.primaryChainFamily,
    tags: dao.tags,
    chain_refs: bindings.map((binding) => binding.chainRef),
    treasury_value_usd: hasTreasuryValue ? treasuryValueUsd.toFixed(6) : null,
    active_proposal_count: proposals.filter((proposal) => proposal.status === "active").length,
    member_count: members.filter((member) => member.isActive).length,
    capability_score: calculateCapabilityScore(capabilities),
    last_activity_at: lastActivityAt ?? null,
    metadata: {
      linkedAgentId: dao.linkedAgentId,
      governanceModel: dao.governanceModel,
      treasuryModel: dao.treasuryModel,
    },
  };

  const { data, error } = await service
    .from("dao_directory_index")
    .upsert(payload, { onConflict: "dao_id" })
    .select("*")
    .single();

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_DIRECTORY_UPSERT_FAILED",
    });
  }

  return parseRow(daoDirectoryIndexSchema, data, "dao_directory_index");
}

async function hydrateMissingDirectoryIndex(options: {
  service: SupabaseServiceRoleClient;
  orgId: string;
}): Promise<void> {
  const { data, error } = await options.service
    .from("dao_organizations")
    .select("id")
    .eq("org_id", options.orgId);

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_INDEX_HYDRATE_FAILED",
    });
  }

  for (const row of data ?? []) {
    if (typeof row.id === "string") {
      await refreshDaoDirectoryIndex({
        service: options.service,
        orgId: options.orgId,
        daoId: row.id,
      });
    }
  }
}

export async function listDaoDirectory(options: {
  userId: string;
  orgId?: string | null;
  filters?: Partial<DaoDirectoryFilters> | null;
}): Promise<DirectoryRecord[]> {
  const access = await resolveAccess({
    userId: options.userId,
    orgId: options.orgId,
  });
  const filters = daoDirectoryFiltersSchema.parse(options.filters ?? {});

  const { data, error } = await access.service
    .from("dao_directory_index")
    .select("*")
    .eq("org_id", access.orgId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_DIRECTORY_LIST_FAILED",
    });
  }

  if ((data ?? []).length === 0) {
    await hydrateMissingDirectoryIndex({
      service: access.service,
      orgId: access.orgId,
    });
  }

  const { data: refreshedData, error: refreshedError } = await access.service
    .from("dao_directory_index")
    .select("*")
    .eq("org_id", access.orgId)
    .order("updated_at", { ascending: false });

  if (refreshedError) {
    throw new DaoServiceError(refreshedError.message, {
      status: 400,
      code: "DAO_DIRECTORY_REFRESH_LIST_FAILED",
    });
  }

  const items = parseRows(
    daoDirectoryIndexSchema,
    refreshedData ?? [],
    "dao_directory_index",
    { skipInvalid: true },
  );

  const myMemberships = await access.service
    .from("dao_memberships")
    .select("dao_id")
    .eq("org_id", access.orgId)
    .eq("user_id", access.userId)
    .eq("is_active", true);

  if (myMemberships.error) {
    throw new DaoServiceError(myMemberships.error.message, {
      status: 400,
      code: "DAO_MEMBERSHIP_DIRECTORY_LOOKUP_FAILED",
    });
  }

  const mine = new Set(
    (myMemberships.data ?? [])
      .map((row) => row.dao_id)
      .filter((value): value is string => typeof value === "string"),
  );

  const queryNeedle = filters.query?.trim().toLowerCase() ?? "";
  const categoryNeedle = filters.category?.trim().toLowerCase() ?? "";

  return items
    .map((item) => ({ ...item, isMine: mine.has(item.daoId) }))
    .filter((item) => {
      if (filters.mineOnly && !item.isMine) return false;
      if (filters.chainFamily && item.primaryChainFamily !== filters.chainFamily) return false;
      if (filters.ownershipMode && item.ownershipMode !== filters.ownershipMode) return false;
      if (filters.importSource && item.importSource !== filters.importSource) return false;
      if (filters.lifecycleState && item.lifecycleState !== filters.lifecycleState) return false;
      if (categoryNeedle && item.category?.toLowerCase() !== categoryNeedle) return false;

      if (!queryNeedle) return true;

      const haystack = [
        item.name,
        item.slug,
        item.description ?? "",
        item.category ?? "",
        item.tags.join(" "),
        item.chainRefs.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(queryNeedle);
    });
}

export async function getDaoOverview(options: {
  userId: string;
  orgId?: string | null;
  daoId: string;
}): Promise<DaoOverview> {
  const access = await resolveAccess({
    userId: options.userId,
    orgId: options.orgId,
  });
  const dao = await loadDaoOrganization({
    service: access.service,
    daoId: options.daoId,
    orgId: access.orgId,
  });

  const [
    directoryData,
    bindingsData,
    treasuriesData,
    capabilitiesData,
    membersData,
    proposalsData,
    votesData,
    activityData,
    syncJobsData,
    treasuryActionsData,
    importsData,
  ] = await Promise.all([
    access.service.from("dao_directory_index").select("*").eq("dao_id", dao.id).maybeSingle(),
    access.service.from("dao_chain_bindings").select("*").eq("dao_id", dao.id).order("created_at", { ascending: true }),
    access.service.from("dao_treasuries").select("*").eq("dao_id", dao.id).order("is_primary", { ascending: false }),
    access.service.from("dao_capabilities").select("*").eq("dao_id", dao.id).maybeSingle(),
    access.service.from("dao_memberships").select("*").eq("dao_id", dao.id).order("created_at", { ascending: true }),
    access.service.from("dao_proposals").select("*").eq("dao_id", dao.id).order("updated_at", { ascending: false }),
    access.service.from("dao_votes").select("*").eq("dao_id", dao.id).order("cast_at", { ascending: false }),
    access.service.from("dao_activity").select("*").eq("dao_id", dao.id).order("created_at", { ascending: false }).limit(50),
    access.service.from("dao_sync_jobs").select("*").eq("dao_id", dao.id).order("created_at", { ascending: false }).limit(20),
    access.service.from("dao_treasury_actions").select("*").eq("dao_id", dao.id).order("created_at", { ascending: false }).limit(20),
    access.service.from("dao_imports").select("*").eq("dao_id", dao.id).order("created_at", { ascending: false }).limit(10),
  ]);

  const firstError =
    directoryData.error ||
    bindingsData.error ||
    treasuriesData.error ||
    capabilitiesData.error ||
    membersData.error ||
    proposalsData.error ||
    votesData.error ||
    activityData.error ||
    syncJobsData.error ||
    treasuryActionsData.error ||
    importsData.error;

  if (firstError) {
    throw new DaoServiceError(firstError.message, {
      status: 400,
      code: "DAO_OVERVIEW_LOOKUP_FAILED",
    });
  }

  return {
    dao,
    directory: parseOptionalRow(daoDirectoryIndexSchema, directoryData.data, "dao_directory_index"),
    bindings: parseRows(daoChainBindingSchema, bindingsData.data ?? [], "dao_chain_binding", { skipInvalid: true }),
    treasuries: parseRows(daoTreasurySchema, treasuriesData.data ?? [], "dao_treasury", { skipInvalid: true }),
    capabilities: parseOptionalRow(daoCapabilitiesSchema, capabilitiesData.data, "dao_capabilities"),
    members: parseRows(daoMembershipSchema, membersData.data ?? [], "dao_membership", { skipInvalid: true }),
    proposals: parseRows(daoProposalSchema, proposalsData.data ?? [], "dao_proposal", { skipInvalid: true }),
    votes: parseRows(daoVoteSchema, votesData.data ?? [], "dao_vote", { skipInvalid: true }),
    activity: parseRows(daoActivitySchema, activityData.data ?? [], "dao_activity", { skipInvalid: true }),
    syncJobs: parseRows(daoSyncJobSchema, syncJobsData.data ?? [], "dao_sync_job", { skipInvalid: true }),
    treasuryActions: parseRows(daoTreasuryActionSchema, treasuryActionsData.data ?? [], "dao_treasury_action", { skipInvalid: true }),
    imports: parseRows(daoImportSchema, importsData.data ?? [], "dao_import", { skipInvalid: true }),
  };
}
