import { z } from "zod";

import { jsonRecordSchema, jsonValueSchema } from "@/lib/validation/json";

export const daoChainFamilyLiterals = ["evm", "solana"] as const;
export const daoOwnershipModeLiterals = ["user", "agent", "hybrid"] as const;
export const daoLifecycleStateLiterals = ["draft", "active", "archived", "detached"] as const;
export const daoImportSourceLiterals = ["app", "imported"] as const;
export const daoSyncStatusLiterals = ["pending", "running", "succeeded", "failed", "cancelled"] as const;
export const daoMembershipRoleLiterals = [
  "owner",
  "admin",
  "council",
  "proposer",
  "member",
  "observer",
] as const;
export const daoMembershipTypeLiterals = ["user", "agent", "external"] as const;
export const daoProposalStatusLiterals = [
  "draft",
  "active",
  "succeeded",
  "defeated",
  "queued",
  "executed",
  "cancelled",
  "expired",
] as const;
export const daoVoteChoiceLiterals = ["for", "against", "abstain", "veto"] as const;
export const daoTreasuryActionStatusLiterals = [
  "draft",
  "pending_approval",
  "approved",
  "submitted",
  "executed",
  "failed",
  "cancelled",
] as const;

export const daoChainFamilySchema = z.enum(daoChainFamilyLiterals);
export const daoOwnershipModeSchema = z.enum(daoOwnershipModeLiterals);
export const daoLifecycleStateSchema = z.enum(daoLifecycleStateLiterals);
export const daoImportSourceSchema = z.enum(daoImportSourceLiterals);
export const daoSyncStatusSchema = z.enum(daoSyncStatusLiterals);
export const daoMembershipRoleSchema = z.enum(daoMembershipRoleLiterals);
export const daoMembershipTypeSchema = z.enum(daoMembershipTypeLiterals);
export const daoProposalStatusSchema = z.enum(daoProposalStatusLiterals);
export const daoVoteChoiceSchema = z.enum(daoVoteChoiceLiterals);
export const daoTreasuryActionStatusSchema = z.enum(daoTreasuryActionStatusLiterals);

const nullableStringSchema = z.string().nullable().optional().transform((value) => value ?? null);
const isoDateTimeSchema = z.string().datetime({ offset: true });
const nullableIsoDateTimeSchema = isoDateTimeSchema.nullable().optional().transform((value) => value ?? null);
const numericStringSchema = z.union([z.string(), z.number()]).transform((value) => String(value));

export const daoCapabilitiesRecordSchema = z.object({
  id: z.string().uuid(),
  dao_id: z.string().uuid(),
  org_id: z.string().uuid(),
  treasury_management_enabled: z.boolean(),
  proposal_creation_enabled: z.boolean(),
  voting_enabled: z.boolean(),
  member_management_enabled: z.boolean(),
  agent_automation_enabled: z.boolean(),
  agent_voting_enabled: z.boolean(),
  import_enabled: z.boolean(),
  analytics_enabled: z.boolean(),
  metadata: jsonRecordSchema.nullable().default({}),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const daoCapabilitiesSchema = daoCapabilitiesRecordSchema.transform((record) => ({
  id: record.id,
  daoId: record.dao_id,
  orgId: record.org_id,
  treasuryManagementEnabled: record.treasury_management_enabled,
  proposalCreationEnabled: record.proposal_creation_enabled,
  votingEnabled: record.voting_enabled,
  memberManagementEnabled: record.member_management_enabled,
  agentAutomationEnabled: record.agent_automation_enabled,
  agentVotingEnabled: record.agent_voting_enabled,
  importEnabled: record.import_enabled,
  analyticsEnabled: record.analytics_enabled,
  metadata: record.metadata ?? {},
  createdAt: record.created_at,
  updatedAt: record.updated_at,
}));

export type DaoCapabilities = z.infer<typeof daoCapabilitiesSchema>;

export const daoOrganizationRecordSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  ownership_mode: daoOwnershipModeSchema,
  lifecycle_state: daoLifecycleStateSchema,
  primary_chain_family: daoChainFamilySchema,
  import_source: daoImportSourceSchema,
  governance_model: z.string(),
  treasury_model: z.string(),
  created_by_user_id: z.string().uuid().nullable(),
  linked_agent_id: z.string().uuid().nullable(),
  tags: z.array(z.string()).nullable().default([]),
  metadata: jsonRecordSchema.nullable().default({}),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
  archived_at: nullableIsoDateTimeSchema,
});

export const daoOrganizationSchema = daoOrganizationRecordSchema.transform((record) => ({
  id: record.id,
  orgId: record.org_id,
  slug: record.slug,
  name: record.name,
  description: record.description ?? null,
  category: record.category ?? null,
  ownershipMode: record.ownership_mode,
  lifecycleState: record.lifecycle_state,
  primaryChainFamily: record.primary_chain_family,
  importSource: record.import_source,
  governanceModel: record.governance_model,
  treasuryModel: record.treasury_model,
  createdByUserId: record.created_by_user_id ?? null,
  linkedAgentId: record.linked_agent_id ?? null,
  tags: record.tags ?? [],
  metadata: record.metadata ?? {},
  createdAt: record.created_at,
  updatedAt: record.updated_at,
  archivedAt: record.archived_at ?? null,
}));

export type DaoOrganization = z.infer<typeof daoOrganizationSchema>;

export const daoChainBindingRecordSchema = z.object({
  id: z.string().uuid(),
  dao_id: z.string().uuid(),
  org_id: z.string().uuid(),
  chain_family: daoChainFamilySchema,
  chain_ref: z.string(),
  governance_address: z.string().nullable(),
  treasury_address: z.string().nullable(),
  safe_address: z.string().nullable(),
  timelock_address: z.string().nullable(),
  token_address: z.string().nullable(),
  realm_address: z.string().nullable(),
  squads_address: z.string().nullable(),
  external_dao_id: z.string().nullable(),
  external_url: z.string().nullable(),
  sync_status: daoSyncStatusSchema,
  import_source: daoImportSourceSchema,
  metadata: jsonRecordSchema.nullable().default({}),
  last_synced_at: nullableIsoDateTimeSchema,
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const daoChainBindingSchema = daoChainBindingRecordSchema.transform((record) => ({
  id: record.id,
  daoId: record.dao_id,
  orgId: record.org_id,
  chainFamily: record.chain_family,
  chainRef: record.chain_ref,
  governanceAddress: record.governance_address ?? null,
  treasuryAddress: record.treasury_address ?? null,
  safeAddress: record.safe_address ?? null,
  timelockAddress: record.timelock_address ?? null,
  tokenAddress: record.token_address ?? null,
  realmAddress: record.realm_address ?? null,
  squadsAddress: record.squads_address ?? null,
  externalDaoId: record.external_dao_id ?? null,
  externalUrl: record.external_url ?? null,
  syncStatus: record.sync_status,
  importSource: record.import_source,
  metadata: record.metadata ?? {},
  lastSyncedAt: record.last_synced_at ?? null,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
}));

export type DaoChainBinding = z.infer<typeof daoChainBindingSchema>;

export const daoTreasuryRecordSchema = z.object({
  id: z.string().uuid(),
  dao_id: z.string().uuid(),
  org_id: z.string().uuid(),
  chain_binding_id: z.string().uuid().nullable(),
  label: z.string(),
  chain_family: daoChainFamilySchema,
  treasury_type: z.string(),
  address: z.string(),
  is_primary: z.boolean(),
  total_value_usd: z.union([z.string(), z.number()]).nullable(),
  native_symbol: z.string().nullable(),
  controlling_role: z.string().nullable(),
  metadata: jsonRecordSchema.nullable().default({}),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const daoTreasurySchema = daoTreasuryRecordSchema.transform((record) => ({
  id: record.id,
  daoId: record.dao_id,
  orgId: record.org_id,
  chainBindingId: record.chain_binding_id ?? null,
  label: record.label,
  chainFamily: record.chain_family,
  treasuryType: record.treasury_type,
  address: record.address,
  isPrimary: record.is_primary,
  totalValueUsd: record.total_value_usd === null ? null : Number(record.total_value_usd),
  nativeSymbol: record.native_symbol ?? null,
  controllingRole: record.controlling_role ?? null,
  metadata: record.metadata ?? {},
  createdAt: record.created_at,
  updatedAt: record.updated_at,
}));

export type DaoTreasury = z.infer<typeof daoTreasurySchema>;

export const daoMembershipRecordSchema = z.object({
  id: z.string().uuid(),
  dao_id: z.string().uuid(),
  org_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  agent_id: z.string().uuid().nullable(),
  membership_type: daoMembershipTypeSchema,
  role: daoMembershipRoleSchema,
  wallet_address: z.string().nullable(),
  voting_power: z.union([z.string(), z.number()]).nullable(),
  source: z.string().nullable(),
  is_active: z.boolean(),
  metadata: jsonRecordSchema.nullable().default({}),
  added_by_user_id: z.string().uuid().nullable(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const daoMembershipSchema = daoMembershipRecordSchema.transform((record) => ({
  id: record.id,
  daoId: record.dao_id,
  orgId: record.org_id,
  userId: record.user_id ?? null,
  agentId: record.agent_id ?? null,
  membershipType: record.membership_type,
  role: record.role,
  walletAddress: record.wallet_address ?? null,
  votingPower: record.voting_power === null ? null : String(record.voting_power),
  source: record.source ?? null,
  isActive: record.is_active,
  metadata: record.metadata ?? {},
  addedByUserId: record.added_by_user_id ?? null,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
}));

export type DaoMembership = z.infer<typeof daoMembershipSchema>;

export const daoProposalRecordSchema = z.object({
  id: z.string().uuid(),
  dao_id: z.string().uuid(),
  org_id: z.string().uuid(),
  chain_binding_id: z.string().uuid().nullable(),
  external_proposal_id: z.string().nullable(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  proposer_user_id: z.string().uuid().nullable(),
  proposer_agent_id: z.string().uuid().nullable(),
  status: daoProposalStatusSchema,
  start_at: nullableIsoDateTimeSchema,
  end_at: nullableIsoDateTimeSchema,
  queued_at: nullableIsoDateTimeSchema,
  executed_at: nullableIsoDateTimeSchema,
  quorum: numericStringSchema.nullable(),
  threshold: numericStringSchema.nullable(),
  for_votes: numericStringSchema.nullable(),
  against_votes: numericStringSchema.nullable(),
  abstain_votes: numericStringSchema.nullable(),
  actions: z.array(jsonValueSchema).nullable().default([]),
  metadata: jsonRecordSchema.nullable().default({}),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const daoProposalSchema = daoProposalRecordSchema.transform((record) => ({
  id: record.id,
  daoId: record.dao_id,
  orgId: record.org_id,
  chainBindingId: record.chain_binding_id ?? null,
  externalProposalId: record.external_proposal_id ?? null,
  title: record.title,
  slug: record.slug,
  description: record.description ?? null,
  proposerUserId: record.proposer_user_id ?? null,
  proposerAgentId: record.proposer_agent_id ?? null,
  status: record.status,
  startAt: record.start_at ?? null,
  endAt: record.end_at ?? null,
  queuedAt: record.queued_at ?? null,
  executedAt: record.executed_at ?? null,
  quorum: record.quorum ?? null,
  threshold: record.threshold ?? null,
  forVotes: record.for_votes ?? null,
  againstVotes: record.against_votes ?? null,
  abstainVotes: record.abstain_votes ?? null,
  actions: record.actions ?? [],
  metadata: record.metadata ?? {},
  createdAt: record.created_at,
  updatedAt: record.updated_at,
}));

export type DaoProposal = z.infer<typeof daoProposalSchema>;

export const daoVoteRecordSchema = z.object({
  id: z.string().uuid(),
  dao_id: z.string().uuid(),
  org_id: z.string().uuid(),
  proposal_id: z.string().uuid(),
  voter_user_id: z.string().uuid().nullable(),
  voter_agent_id: z.string().uuid().nullable(),
  voter_address: z.string(),
  choice: daoVoteChoiceSchema,
  weight: numericStringSchema.nullable(),
  reason: z.string().nullable(),
  tx_hash: z.string().nullable(),
  cast_at: isoDateTimeSchema,
  metadata: jsonRecordSchema.nullable().default({}),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const daoVoteSchema = daoVoteRecordSchema.transform((record) => ({
  id: record.id,
  daoId: record.dao_id,
  orgId: record.org_id,
  proposalId: record.proposal_id,
  voterUserId: record.voter_user_id ?? null,
  voterAgentId: record.voter_agent_id ?? null,
  voterAddress: record.voter_address,
  choice: record.choice,
  weight: record.weight ?? null,
  reason: record.reason ?? null,
  txHash: record.tx_hash ?? null,
  castAt: record.cast_at,
  metadata: record.metadata ?? {},
  createdAt: record.created_at,
  updatedAt: record.updated_at,
}));

export type DaoVote = z.infer<typeof daoVoteSchema>;

export const daoImportRecordSchema = z.object({
  id: z.string().uuid(),
  dao_id: z.string().uuid().nullable(),
  org_id: z.string().uuid(),
  requested_by_user_id: z.string().uuid(),
  chain_family: daoChainFamilySchema,
  import_source: daoImportSourceSchema,
  status: daoSyncStatusSchema,
  request_payload: jsonRecordSchema,
  resolved_payload: jsonRecordSchema.nullable().default({}),
  last_error: z.string().nullable(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const daoImportSchema = daoImportRecordSchema.transform((record) => ({
  id: record.id,
  daoId: record.dao_id ?? null,
  orgId: record.org_id,
  requestedByUserId: record.requested_by_user_id,
  chainFamily: record.chain_family,
  importSource: record.import_source,
  status: record.status,
  requestPayload: record.request_payload,
  resolvedPayload: record.resolved_payload ?? {},
  lastError: record.last_error ?? null,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
}));

export type DaoImport = z.infer<typeof daoImportSchema>;

export const daoActivityRecordSchema = z.object({
  id: z.string().uuid(),
  dao_id: z.string().uuid(),
  org_id: z.string().uuid(),
  actor_user_id: z.string().uuid().nullable(),
  actor_agent_id: z.string().uuid().nullable(),
  activity_type: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  chain_family: z.string().nullable(),
  chain_ref: z.string().nullable(),
  tx_hash: z.string().nullable(),
  metadata: jsonRecordSchema.nullable().default({}),
  created_at: isoDateTimeSchema,
});

export const daoActivitySchema = daoActivityRecordSchema.transform((record) => ({
  id: record.id,
  daoId: record.dao_id,
  orgId: record.org_id,
  actorUserId: record.actor_user_id ?? null,
  actorAgentId: record.actor_agent_id ?? null,
  activityType: record.activity_type,
  title: record.title,
  body: record.body ?? null,
  chainFamily: record.chain_family ?? null,
  chainRef: record.chain_ref ?? null,
  txHash: record.tx_hash ?? null,
  metadata: record.metadata ?? {},
  createdAt: record.created_at,
}));

export type DaoActivity = z.infer<typeof daoActivitySchema>;

export const daoSyncJobRecordSchema = z.object({
  id: z.string().uuid(),
  dao_id: z.string().uuid(),
  org_id: z.string().uuid(),
  chain_binding_id: z.string().uuid().nullable(),
  job_type: z.string(),
  status: daoSyncStatusSchema,
  attempt_count: z.number().int(),
  scheduled_for: isoDateTimeSchema,
  started_at: nullableIsoDateTimeSchema,
  finished_at: nullableIsoDateTimeSchema,
  last_error: z.string().nullable(),
  metadata: jsonRecordSchema.nullable().default({}),
  cursor: z.string().nullable(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const daoSyncJobSchema = daoSyncJobRecordSchema.transform((record) => ({
  id: record.id,
  daoId: record.dao_id,
  orgId: record.org_id,
  chainBindingId: record.chain_binding_id ?? null,
  jobType: record.job_type,
  status: record.status,
  attemptCount: record.attempt_count,
  scheduledFor: record.scheduled_for,
  startedAt: record.started_at ?? null,
  finishedAt: record.finished_at ?? null,
  lastError: record.last_error ?? null,
  metadata: record.metadata ?? {},
  cursor: record.cursor ?? null,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
}));

export type DaoSyncJob = z.infer<typeof daoSyncJobSchema>;

export const daoDirectoryIndexRecordSchema = z.object({
  dao_id: z.string().uuid(),
  org_id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  ownership_mode: daoOwnershipModeSchema,
  lifecycle_state: daoLifecycleStateSchema,
  import_source: daoImportSourceSchema,
  primary_chain_family: daoChainFamilySchema,
  tags: z.array(z.string()).nullable().default([]),
  chain_refs: z.array(z.string()).nullable().default([]),
  treasury_value_usd: z.union([z.string(), z.number()]).nullable(),
  active_proposal_count: z.number().int(),
  member_count: z.number().int(),
  capability_score: z.number().int(),
  last_activity_at: nullableIsoDateTimeSchema,
  metadata: jsonRecordSchema.nullable().default({}),
  updated_at: isoDateTimeSchema,
});

export const daoDirectoryIndexSchema = daoDirectoryIndexRecordSchema.transform((record) => ({
  daoId: record.dao_id,
  orgId: record.org_id,
  slug: record.slug,
  name: record.name,
  description: record.description ?? null,
  category: record.category ?? null,
  ownershipMode: record.ownership_mode,
  lifecycleState: record.lifecycle_state,
  importSource: record.import_source,
  primaryChainFamily: record.primary_chain_family,
  tags: record.tags ?? [],
  chainRefs: record.chain_refs ?? [],
  treasuryValueUsd: record.treasury_value_usd === null ? null : Number(record.treasury_value_usd),
  activeProposalCount: record.active_proposal_count,
  memberCount: record.member_count,
  capabilityScore: record.capability_score,
  lastActivityAt: record.last_activity_at ?? null,
  metadata: record.metadata ?? {},
  updatedAt: record.updated_at,
}));

export type DaoDirectoryIndexItem = z.infer<typeof daoDirectoryIndexSchema>;

export const daoTreasuryActionRecordSchema = z.object({
  id: z.string().uuid(),
  dao_id: z.string().uuid(),
  org_id: z.string().uuid(),
  chain_binding_id: z.string().uuid().nullable(),
  proposal_id: z.string().uuid().nullable(),
  requested_by_user_id: z.string().uuid().nullable(),
  requested_by_agent_id: z.string().uuid().nullable(),
  title: z.string(),
  action_type: z.string(),
  target_address: z.string().nullable(),
  value_base_units: numericStringSchema.nullable(),
  payload: jsonRecordSchema,
  status: daoTreasuryActionStatusSchema,
  approval_request_id: z.string().uuid().nullable(),
  tx_hash: z.string().nullable(),
  last_error: z.string().nullable(),
  metadata: jsonRecordSchema.nullable().default({}),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const daoTreasuryActionSchema = daoTreasuryActionRecordSchema.transform((record) => ({
  id: record.id,
  daoId: record.dao_id,
  orgId: record.org_id,
  chainBindingId: record.chain_binding_id ?? null,
  proposalId: record.proposal_id ?? null,
  requestedByUserId: record.requested_by_user_id ?? null,
  requestedByAgentId: record.requested_by_agent_id ?? null,
  title: record.title,
  actionType: record.action_type,
  targetAddress: record.target_address ?? null,
  valueBaseUnits: record.value_base_units ?? null,
  payload: record.payload,
  status: record.status,
  approvalRequestId: record.approval_request_id ?? null,
  txHash: record.tx_hash ?? null,
  lastError: record.last_error ?? null,
  metadata: record.metadata ?? {},
  createdAt: record.created_at,
  updatedAt: record.updated_at,
}));

export type DaoTreasuryAction = z.infer<typeof daoTreasuryActionSchema>;

export const daoOverviewSchema = z.object({
  dao: daoOrganizationSchema,
  directory: daoDirectoryIndexSchema.nullable().optional(),
  bindings: z.array(daoChainBindingSchema),
  treasuries: z.array(daoTreasurySchema),
  capabilities: daoCapabilitiesSchema.nullable(),
  members: z.array(daoMembershipSchema),
  proposals: z.array(daoProposalSchema),
  votes: z.array(daoVoteSchema),
  activity: z.array(daoActivitySchema),
  syncJobs: z.array(daoSyncJobSchema),
  treasuryActions: z.array(daoTreasuryActionSchema),
  imports: z.array(daoImportSchema),
});

export type DaoOverview = z.infer<typeof daoOverviewSchema>;

export const daoDirectoryFiltersSchema = z.object({
  query: z.string().trim().optional(),
  category: z.string().trim().optional(),
  chainFamily: daoChainFamilySchema.optional(),
  ownershipMode: daoOwnershipModeSchema.optional(),
  importSource: daoImportSourceSchema.optional(),
  lifecycleState: daoLifecycleStateSchema.optional(),
  mineOnly: z.boolean().optional().default(false),
});

export type DaoDirectoryFilters = z.output<typeof daoDirectoryFiltersSchema>;

export const daoCapabilityPatchSchema = z.object({
  treasuryManagementEnabled: z.boolean().optional(),
  proposalCreationEnabled: z.boolean().optional(),
  votingEnabled: z.boolean().optional(),
  memberManagementEnabled: z.boolean().optional(),
  agentAutomationEnabled: z.boolean().optional(),
  agentVotingEnabled: z.boolean().optional(),
  importEnabled: z.boolean().optional(),
  analyticsEnabled: z.boolean().optional(),
  metadata: jsonRecordSchema.optional(),
});

export type DaoCapabilityPatch = z.output<typeof daoCapabilityPatchSchema>;

export const daoCreateInputSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120).optional(),
  description: z.string().max(4000).optional(),
  category: z.string().max(80).optional(),
  ownershipMode: daoOwnershipModeSchema.default("user"),
  primaryChainFamily: daoChainFamilySchema,
  chainRef: z.string().min(2).max(128),
  governanceModel: z.string().min(2).max(120).optional(),
  treasuryModel: z.string().min(2).max(120).optional(),
  linkedAgentId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().min(1).max(64)).max(12).optional(),
  capabilities: daoCapabilityPatchSchema.optional(),
  binding: z.object({
    governanceAddress: nullableStringSchema,
    treasuryAddress: nullableStringSchema,
    safeAddress: nullableStringSchema,
    timelockAddress: nullableStringSchema,
    tokenAddress: nullableStringSchema,
    realmAddress: nullableStringSchema,
    squadsAddress: nullableStringSchema,
    externalDaoId: nullableStringSchema,
    externalUrl: nullableStringSchema,
    metadata: jsonRecordSchema.optional(),
  }).optional(),
  metadata: jsonRecordSchema.optional(),
});

export type CreateDaoInput = z.output<typeof daoCreateInputSchema>;

export const daoImportInputSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  slug: z.string().min(2).max(120).optional(),
  description: z.string().max(4000).optional(),
  category: z.string().max(80).optional(),
  ownershipMode: daoOwnershipModeSchema.default("user"),
  chainFamily: daoChainFamilySchema,
  chainRef: z.string().min(2).max(128),
  governanceAddress: nullableStringSchema,
  treasuryAddress: nullableStringSchema,
  safeAddress: nullableStringSchema,
  timelockAddress: nullableStringSchema,
  tokenAddress: nullableStringSchema,
  realmAddress: nullableStringSchema,
  squadsAddress: nullableStringSchema,
  proofAddress: z.string().min(2).max(128),
  linkedAgentId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().min(1).max(64)).max(12).optional(),
  capabilities: daoCapabilityPatchSchema.optional(),
  metadata: jsonRecordSchema.optional(),
});

export type ImportDaoInput = z.output<typeof daoImportInputSchema>;

export const daoUpdateInputSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  slug: z.string().min(2).max(120).optional(),
  description: z.string().max(4000).nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  ownershipMode: daoOwnershipModeSchema.optional(),
  lifecycleState: daoLifecycleStateSchema.optional(),
  governanceModel: z.string().min(2).max(120).optional(),
  treasuryModel: z.string().min(2).max(120).optional(),
  linkedAgentId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().min(1).max(64)).max(12).optional(),
  metadata: jsonRecordSchema.optional(),
});

export type UpdateDaoInput = z.output<typeof daoUpdateInputSchema>;

export const daoMembershipInputSchema = z.object({
  userId: z.string().uuid().nullable().optional(),
  agentId: z.string().uuid().nullable().optional(),
  membershipType: daoMembershipTypeSchema.default("user"),
  role: daoMembershipRoleSchema,
  walletAddress: nullableStringSchema,
  votingPower: z.string().optional(),
  source: z.string().max(120).optional(),
  isActive: z.boolean().optional().default(true),
  metadata: jsonRecordSchema.optional(),
}).refine((value) => Boolean(value.userId || value.agentId || value.walletAddress), {
  message: "At least one of userId, agentId, or walletAddress is required.",
  path: ["userId"],
});

export type DaoMembershipInput = z.output<typeof daoMembershipInputSchema>;

export const daoProposalInputSchema = z.object({
  title: z.string().min(2).max(240),
  slug: z.string().min(2).max(160).optional(),
  description: z.string().max(8000).optional(),
  chainBindingId: z.string().uuid().nullable().optional(),
  externalProposalId: z.string().max(160).optional(),
  proposerAgentId: z.string().uuid().nullable().optional(),
  status: daoProposalStatusSchema.optional().default("draft"),
  startAt: nullableIsoDateTimeSchema,
  endAt: nullableIsoDateTimeSchema,
  quorum: z.string().max(128).optional(),
  threshold: z.string().max(128).optional(),
  actions: z.array(jsonValueSchema).optional(),
  metadata: jsonRecordSchema.optional(),
});

export type DaoProposalInput = z.output<typeof daoProposalInputSchema>;

export const daoVoteInputSchema = z.object({
  proposalId: z.string().uuid(),
  choice: daoVoteChoiceSchema,
  voterAgentId: z.string().uuid().nullable().optional(),
  voterAddress: z.string().min(2).max(128),
  weight: z.string().max(128).optional(),
  reason: z.string().max(4000).optional(),
  txHash: z.string().max(256).optional(),
  metadata: jsonRecordSchema.optional(),
});

export type DaoVoteInput = z.output<typeof daoVoteInputSchema>;

export const daoTreasuryActionInputSchema = z.object({
  chainBindingId: z.string().uuid().nullable().optional(),
  proposalId: z.string().uuid().nullable().optional(),
  requestedByAgentId: z.string().uuid().nullable().optional(),
  title: z.string().min(2).max(240),
  actionType: z.string().min(2).max(120),
  targetAddress: nullableStringSchema,
  valueBaseUnits: z.string().max(128).optional(),
  payload: jsonRecordSchema,
  status: daoTreasuryActionStatusSchema.optional().default("draft"),
  approvalRequestId: z.string().uuid().nullable().optional(),
  txHash: z.string().max(256).optional(),
  metadata: jsonRecordSchema.optional(),
});

export type DaoTreasuryActionInput = z.output<typeof daoTreasuryActionInputSchema>;

export const daoSyncJobInputSchema = z.object({
  chainBindingId: z.string().uuid().nullable().optional(),
  jobType: z.string().min(2).max(120),
  scheduledFor: nullableIsoDateTimeSchema,
  metadata: jsonRecordSchema.optional(),
});

export type DaoSyncJobInput = z.output<typeof daoSyncJobInputSchema>;

export function normalizeDaoSlug(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const normalized = trimmed
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || `dao-${Date.now().toString(36)}`;
}
