import {
  daoCapabilitiesSchema,
  daoSyncJobSchema,
  daoTreasurySchema,
  type DaoCapabilities,
  type DaoCapabilityPatch,
  type DaoSyncJob,
  type DaoTreasury,
} from "@/modules/daos/contracts";
import type { SupabaseServiceRoleClient } from "@/server/services/supabase/service-role";
import {
  buildCapabilitiesInsert,
  type JsonRecord,
  DaoServiceError,
  parseRow,
} from "./dao-service-utils";

export async function insertDaoActivity(options: {
  service: SupabaseServiceRoleClient;
  daoId: string;
  orgId: string;
  actorUserId?: string | null;
  actorAgentId?: string | null;
  activityType: string;
  title: string;
  body?: string | null;
  chainFamily?: "evm" | "solana" | null;
  chainRef?: string | null;
  txHash?: string | null;
  metadata?: JsonRecord;
}): Promise<void> {
  const { error } = await options.service.from("dao_activity").insert({
    dao_id: options.daoId,
    org_id: options.orgId,
    actor_user_id: options.actorUserId ?? null,
    actor_agent_id: options.actorAgentId ?? null,
    activity_type: options.activityType,
    title: options.title,
    body: options.body ?? null,
    chain_family: options.chainFamily ?? null,
    chain_ref: options.chainRef ?? null,
    tx_hash: options.txHash ?? null,
    metadata: options.metadata ?? {},
  });

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_ACTIVITY_INSERT_FAILED",
    });
  }
}

export async function refreshProposalVoteTotals(options: {
  service: SupabaseServiceRoleClient;
  proposalId: string;
}): Promise<void> {
  const { data, error } = await options.service
    .from("dao_votes")
    .select("choice, weight")
    .eq("proposal_id", options.proposalId);

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_VOTE_TOTALS_LOOKUP_FAILED",
    });
  }

  let forVotes = 0;
  let againstVotes = 0;
  let abstainVotes = 0;

  for (const row of data ?? []) {
    const weight = Number(row.weight ?? 0);
    if (!Number.isFinite(weight)) continue;
    if (row.choice === "for") forVotes += weight;
    if (row.choice === "against" || row.choice === "veto") againstVotes += weight;
    if (row.choice === "abstain") abstainVotes += weight;
  }

  const { error: updateError } = await options.service
    .from("dao_proposals")
    .update({
      for_votes: String(forVotes),
      against_votes: String(againstVotes),
      abstain_votes: String(abstainVotes),
    })
    .eq("id", options.proposalId);

  if (updateError) {
    throw new DaoServiceError(updateError.message, {
      status: 400,
      code: "DAO_VOTE_TOTALS_UPDATE_FAILED",
    });
  }
}

export async function upsertDaoCapabilitiesRecord(options: {
  service: SupabaseServiceRoleClient;
  daoId: string;
  orgId: string;
  ownershipMode: "user" | "agent" | "hybrid";
  patch?: DaoCapabilityPatch;
}): Promise<DaoCapabilities> {
  const insert = buildCapabilitiesInsert(options);
  const { data, error } = await options.service
    .from("dao_capabilities")
    .upsert(insert, {
      onConflict: "dao_id",
    })
    .select("*")
    .single();

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_CAPABILITIES_UPSERT_FAILED",
    });
  }

  return parseRow(daoCapabilitiesSchema, data, "dao_capabilities");
}

export async function maybeInsertPrimaryTreasury(options: {
  service: SupabaseServiceRoleClient;
  daoId: string;
  orgId: string;
  chainBindingId: string | null;
  chainFamily: "evm" | "solana";
  address: string | null;
  treasuryType: string;
  metadata?: JsonRecord;
}): Promise<DaoTreasury | null> {
  if (!options.address || !options.address.trim()) {
    return null;
  }

  const { data, error } = await options.service
    .from("dao_treasuries")
    .insert({
      dao_id: options.daoId,
      org_id: options.orgId,
      chain_binding_id: options.chainBindingId,
      label: "Primary Treasury",
      chain_family: options.chainFamily,
      treasury_type: options.treasuryType,
      address: options.address,
      is_primary: true,
      metadata: options.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_TREASURY_INSERT_FAILED",
    });
  }

  return parseRow(daoTreasurySchema, data, "dao_treasury");
}

export async function claimDaoSyncJob(options: {
  service: SupabaseServiceRoleClient;
  jobId: string;
  daoId: string;
  now: string;
}): Promise<DaoSyncJob | null> {
  const runningJobResult = await options.service
    .from("dao_sync_jobs")
    .update({
      status: "running",
      started_at: options.now,
      last_error: null,
    })
    .eq("id", options.jobId)
    .eq("dao_id", options.daoId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (runningJobResult.error) {
    throw new DaoServiceError(runningJobResult.error.message, {
      status: 400,
      code: "DAO_SYNC_JOB_START_FAILED",
    });
  }

  return runningJobResult.data
    ? parseRow(daoSyncJobSchema, runningJobResult.data, "dao_sync_job")
    : null;
}
