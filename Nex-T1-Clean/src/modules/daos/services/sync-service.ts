import {
  syncEvmGovernorProposals,
} from "@/server/daos/evm-governance";
import { syncEvmSafeBackedTreasuryActions } from "@/server/daos/evm-treasury";
import {
  createServiceRoleClient,
  type SupabaseServiceRoleClient,
} from "@/server/services/supabase/service-role";
import {
  daoSyncJobInputSchema,
  daoSyncJobSchema,
  type DaoSyncJob,
  type DaoSyncJobInput,
} from "@/modules/daos/contracts";
import {
  loadDaoOrganization,
  resolveAccess,
} from "./internal/dao-service-access";
import {
  claimDaoSyncJob,
  insertDaoActivity,
} from "./internal/dao-service-persistence";
import { loadPrimaryEvmChainBinding } from "./internal/dao-service-wallets";
import {
  DaoServiceError,
  nowIso,
  parseRow,
  parseRows,
} from "./internal/dao-service-utils";
import { refreshDaoDirectoryIndex } from "./directory-service";

async function upsertSyncedEvmGovernorProposals(options: {
  service: SupabaseServiceRoleClient;
  daoId: string;
  orgId: string;
  chainBindingId: string;
  proposals: Awaited<ReturnType<typeof syncEvmGovernorProposals>>;
}): Promise<number> {
  if (options.proposals.length === 0) {
    return 0;
  }

  const payload = options.proposals.map((proposal) => ({
    dao_id: options.daoId,
    org_id: options.orgId,
    chain_binding_id: options.chainBindingId,
    external_proposal_id: proposal.externalProposalId,
    title: proposal.title,
    slug: proposal.slug,
    description: proposal.description,
    proposer_user_id: null,
    proposer_agent_id: null,
    status: proposal.status,
    start_at: proposal.startAt,
    end_at: proposal.endAt,
    quorum: proposal.quorum,
    threshold: null,
    for_votes: proposal.forVotes,
    against_votes: proposal.againstVotes,
    abstain_votes: proposal.abstainVotes,
    actions: proposal.actions,
    metadata: proposal.metadata,
  }));

  const { error } = await options.service.from("dao_proposals").upsert(payload, {
    onConflict: "chain_binding_id,external_proposal_id",
  });

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_EVM_PROPOSAL_SYNC_UPSERT_FAILED",
    });
  }

  return payload.length;
}

async function executeDaoSyncJob(options: {
  service: SupabaseServiceRoleClient;
  job: DaoSyncJob;
}): Promise<DaoSyncJob> {
  await options.service
    .from("dao_chain_bindings")
    .update({
      sync_status: "running",
    })
    .eq("dao_id", options.job.daoId)
    .eq("chain_family", "evm");

  try {
    const evmSafeSync = await syncEvmSafeBackedTreasuryActions({
      service: options.service,
      daoId: options.job.daoId,
      orgId: options.job.orgId,
    });
    const evmBinding = await loadPrimaryEvmChainBinding({
      service: options.service,
      daoId: options.job.daoId,
      orgId: options.job.orgId,
    });
    let evmGovernanceSync: { syncedProposalCount: number } | null = null;

    if (evmBinding?.governanceAddress) {
      const syncedProposals = await syncEvmGovernorProposals({
        chainRef: evmBinding.chainRef,
        governorAddress: evmBinding.governanceAddress,
      });
      const syncedProposalCount = await upsertSyncedEvmGovernorProposals({
        service: options.service,
        daoId: options.job.daoId,
        orgId: options.job.orgId,
        chainBindingId: evmBinding.id,
        proposals: syncedProposals,
      });
      evmGovernanceSync = {
        syncedProposalCount,
      };
    }

    const finishedAt = nowIso();
    const completedJobResult = await options.service
      .from("dao_sync_jobs")
      .update({
        status: "succeeded",
        finished_at: finishedAt,
        last_error: null,
        metadata: {
          ...(options.job.metadata ?? {}),
          evmSafeSync,
          evmGovernanceSync,
        },
      })
      .eq("id", options.job.id)
      .eq("dao_id", options.job.daoId)
      .select("*")
      .single();

    if (completedJobResult.error) {
      throw new DaoServiceError(completedJobResult.error.message, {
        status: 400,
        code: "DAO_SYNC_JOB_COMPLETE_FAILED",
      });
    }

    const chainBindingUpdate = await options.service
      .from("dao_chain_bindings")
      .update({
        sync_status: "succeeded",
        last_synced_at: finishedAt,
      })
      .eq("dao_id", options.job.daoId)
      .eq("chain_family", "evm");

    if (chainBindingUpdate.error) {
      throw new DaoServiceError(chainBindingUpdate.error.message, {
        status: 400,
        code: "DAO_CHAIN_BINDING_SYNC_UPDATE_FAILED",
      });
    }

    await insertDaoActivity({
      service: options.service,
      daoId: options.job.daoId,
      orgId: options.job.orgId,
      activityType: "dao.sync.completed",
      title: "Sync completed",
      body: `${options.job.jobType} finished successfully.`,
      metadata: {
        syncJobId: options.job.id,
        jobType: options.job.jobType,
        evmGovernanceSync,
        evmSafeSync,
      },
    });

    await refreshDaoDirectoryIndex({
      service: options.service,
      orgId: options.job.orgId,
      daoId: options.job.daoId,
    });

    return parseRow(daoSyncJobSchema, completedJobResult.data, "dao_sync_job");
  } catch (error) {
    const message = error instanceof Error ? error.message : "DAO sync failed";
    const finishedAt = nowIso();

    await options.service
      .from("dao_sync_jobs")
      .update({
        status: "failed",
        finished_at: finishedAt,
        last_error: message,
      })
      .eq("id", options.job.id)
      .eq("dao_id", options.job.daoId);

    await options.service
      .from("dao_chain_bindings")
      .update({
        sync_status: "failed",
      })
      .eq("dao_id", options.job.daoId)
      .eq("chain_family", "evm");

    await insertDaoActivity({
      service: options.service,
      daoId: options.job.daoId,
      orgId: options.job.orgId,
      activityType: "dao.sync.failed",
      title: "Sync failed",
      body: message,
      metadata: {
        syncJobId: options.job.id,
        jobType: options.job.jobType,
      },
    }).catch(() => {});

    throw new DaoServiceError(message, {
      status: 400,
      code: "DAO_SYNC_FAILED",
    });
  }
}

export async function createDaoSyncJob(options: {
  userId: string;
  orgId?: string | null;
  daoId: string;
  input: DaoSyncJobInput;
}): Promise<DaoSyncJob> {
  const access = await resolveAccess({
    userId: options.userId,
    orgId: options.orgId,
    requireManager: true,
  });
  await loadDaoOrganization({
    service: access.service,
    daoId: options.daoId,
    orgId: access.orgId,
  });
  const input = daoSyncJobInputSchema.parse(options.input);

  const { data, error } = await access.service
    .from("dao_sync_jobs")
    .insert({
      dao_id: options.daoId,
      org_id: access.orgId,
      chain_binding_id: input.chainBindingId ?? null,
      job_type: input.jobType,
      status: "pending",
      scheduled_for: input.scheduledFor ?? nowIso(),
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_SYNC_JOB_CREATE_FAILED",
    });
  }

  const job = parseRow(daoSyncJobSchema, data, "dao_sync_job");

  await insertDaoActivity({
    service: access.service,
    daoId: options.daoId,
    orgId: access.orgId,
    actorUserId: access.userId,
    activityType: "dao.sync.queued",
    title: "Sync queued",
    body: `${job.jobType} queued.`,
    metadata: {
      syncJobId: job.id,
      jobType: job.jobType,
    },
  });

  return job;
}

export async function syncDao(options: {
  userId: string;
  orgId?: string | null;
  daoId: string;
  jobType?: string;
}): Promise<DaoSyncJob> {
  const access = await resolveAccess({
    userId: options.userId,
    orgId: options.orgId,
    requireManager: true,
  });
  await loadDaoOrganization({
    service: access.service,
    daoId: options.daoId,
    orgId: access.orgId,
  });

  const job = await createDaoSyncJob({
    userId: options.userId,
    orgId: options.orgId,
    daoId: options.daoId,
    input: {
      jobType: options.jobType ?? "manual-sync",
      scheduledFor: nowIso(),
    },
  });

  const runningJob = await claimDaoSyncJob({
    service: access.service,
    jobId: job.id,
    daoId: options.daoId,
    now: nowIso(),
  });

  if (!runningJob) {
    throw new DaoServiceError("Failed to claim DAO sync job", {
      status: 409,
      code: "DAO_SYNC_JOB_CLAIM_FAILED",
    });
  }

  return executeDaoSyncJob({
    service: access.service,
    job: runningJob,
  });
}

export async function runDueDaoSyncJobs(options?: {
  limit?: number;
  now?: string;
  service?: SupabaseServiceRoleClient;
}): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}> {
  const service = options?.service ?? createServiceRoleClient();

  const limit =
    typeof options?.limit === "number" && Number.isFinite(options.limit) && options.limit > 0
      ? Math.floor(options.limit)
      : 10;
  const nowValue = options?.now ?? nowIso();

  const jobsResult = await service
    .from("dao_sync_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", nowValue)
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (jobsResult.error) {
    throw new DaoServiceError(jobsResult.error.message, {
      status: 400,
      code: "DAO_SYNC_JOB_LIST_FAILED",
    });
  }

  const jobs = parseRows(daoSyncJobSchema, jobsResult.data ?? [], "dao_sync_job");
  const summary = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  };

  for (const job of jobs) {
    const claimedJob = await claimDaoSyncJob({
      service,
      jobId: job.id,
      daoId: job.daoId,
      now: nowIso(),
    });

    if (!claimedJob) {
      summary.skipped += 1;
      continue;
    }

    try {
      await executeDaoSyncJob({
        service,
        job: claimedJob,
      });
      summary.processed += 1;
      summary.succeeded += 1;
    } catch {
      summary.processed += 1;
      summary.failed += 1;
    }
  }

  return summary;
}
