import {
  castEvmGovernorVote,
  executeEvmGovernorProposal,
  queueEvmGovernorProposal,
  submitEvmGovernorProposal,
} from "@/server/daos/evm-governance";
import {
  daoProposalInputSchema,
  daoProposalSchema,
  daoVoteInputSchema,
  daoVoteSchema,
  normalizeDaoSlug,
  type DaoProposal,
  type DaoProposalInput,
  type DaoVote,
  type DaoVoteInput,
} from "@/modules/daos/contracts";
import {
  loadDaoChainBinding,
  loadDaoOrganization,
  resolveAccess,
  resolveDaoPermission,
  verifyProofAddressOwnership,
} from "./internal/dao-service-access";
import {
  insertDaoActivity,
  refreshProposalVoteTotals,
} from "./internal/dao-service-persistence";
import {
  loadPrimaryEvmChainBinding,
  resolveEvmExecutionWallet,
} from "./internal/dao-service-wallets";
import {
  DAO_PROPOSAL_ROLES,
  DAO_VOTE_ROLES,
  type JsonRecord,
  DaoServiceError,
  formatDaoProposalDescription,
  isNonEmptyString,
  normalizeAddress,
  nowIso,
  parseRow,
  parseRows,
} from "./internal/dao-service-utils";
import { refreshDaoDirectoryIndex } from "./directory-service";

export async function createDaoProposal(options: {
  userId: string;
  orgId?: string | null;
  daoId: string;
  input: DaoProposalInput;
}): Promise<DaoProposal> {
  const access = await resolveAccess({
    userId: options.userId,
    orgId: options.orgId,
  });
  const dao = await loadDaoOrganization({
    service: access.service,
    daoId: options.daoId,
    orgId: access.orgId,
  });
  const input = daoProposalInputSchema.parse(options.input);

  await resolveDaoPermission({
    service: access.service,
    daoId: dao.id,
    userId: access.userId,
    orgMembershipRole: access.membershipRole,
    allowedDaoRoles: DAO_PROPOSAL_ROLES,
  });

  const slug = normalizeDaoSlug(input.slug ?? input.title);
  const chainBinding = input.chainBindingId
    ? await loadDaoChainBinding({
        service: access.service,
        daoId: dao.id,
        orgId: access.orgId,
        chainBindingId: input.chainBindingId,
      })
    : dao.primaryChainFamily === "evm"
      ? await loadPrimaryEvmChainBinding({
          service: access.service,
          daoId: dao.id,
          orgId: access.orgId,
        })
      : null;
  let externalProposalId = input.externalProposalId ?? null;
  let onchainMetadata: JsonRecord = {};
  let persistedStatus = input.status;

  if (
    dao.primaryChainFamily === "evm" &&
    chainBinding?.governanceAddress &&
    Array.isArray(input.actions) &&
    input.actions.length > 0
  ) {
    const chainIdMatch = /^eip155:(\d+)$/u.exec(chainBinding.chainRef);
    const chainId = chainIdMatch ? Number.parseInt(chainIdMatch[1] ?? "", 10) : null;
    if (!chainId) {
      throw new DaoServiceError("EVM proposal submission requires a valid chain binding.", {
        status: 400,
        code: "DAO_EVM_PROPOSAL_CHAIN_BINDING_INVALID",
      });
    }

    const executionWallet = await resolveEvmExecutionWallet({
      service: access.service,
      userId: access.userId,
      chainId,
      ownershipMode: dao.ownershipMode,
      linkedAgentId: dao.linkedAgentId,
      preferredAgentId: input.proposerAgentId ?? null,
    });
    const onchainProposal = await submitEvmGovernorProposal({
      userId: access.userId,
      fromAddress: executionWallet.address,
      chainRef: chainBinding.chainRef,
      governorAddress: chainBinding.governanceAddress,
      title: input.title,
      description: input.description ?? null,
      actions: input.actions as UntypedJson[],
      agentId: executionWallet.source === "agent" ? executionWallet.agentId : null,
    });
    externalProposalId = onchainProposal.proposalId;
    persistedStatus = "draft";
    onchainMetadata = {
      txHash: onchainProposal.txHash,
      description: onchainProposal.description,
      executionWalletAddress: executionWallet.address,
    };
  }

  const startedAt =
    persistedStatus === "active" ? input.startAt ?? nowIso() : input.startAt ?? null;

  const { data, error } = await access.service
    .from("dao_proposals")
    .insert({
      dao_id: dao.id,
      org_id: access.orgId,
      chain_binding_id: chainBinding?.id ?? null,
      external_proposal_id: externalProposalId,
      title: input.title,
      slug,
      description: input.description ?? null,
      proposer_user_id: access.userId,
      proposer_agent_id: input.proposerAgentId ?? null,
      status: persistedStatus,
      start_at: startedAt,
      end_at: input.endAt ?? null,
      quorum: input.quorum ?? null,
      threshold: input.threshold ?? null,
      actions: input.actions ?? [],
      metadata: {
        ...(input.metadata ?? {}),
        ...onchainMetadata,
      },
    })
    .select("*")
    .single();

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_PROPOSAL_CREATE_FAILED",
    });
  }

  const proposal = parseRow(daoProposalSchema, data, "dao_proposal");

  await insertDaoActivity({
    service: access.service,
    daoId: dao.id,
    orgId: access.orgId,
    actorUserId: access.userId,
    actorAgentId: input.proposerAgentId ?? null,
    activityType: "dao.proposal.created",
    title: "Proposal created",
    body: proposal.title,
    metadata: {
      proposalId: proposal.id,
      status: proposal.status,
    },
  });

  await refreshDaoDirectoryIndex({
    service: access.service,
    orgId: access.orgId,
    daoId: dao.id,
  });

  return proposal;
}

export async function updateDaoProposalStatus(options: {
  userId: string;
  orgId?: string | null;
  daoId: string;
  proposalId: string;
  status: DaoProposal["status"];
  metadata?: JsonRecord;
}): Promise<DaoProposal> {
  const access = await resolveAccess({
    userId: options.userId,
    orgId: options.orgId,
  });
  const dao = await loadDaoOrganization({
    service: access.service,
    daoId: options.daoId,
    orgId: access.orgId,
  });

  await resolveDaoPermission({
    service: access.service,
    daoId: dao.id,
    userId: access.userId,
    orgMembershipRole: access.membershipRole,
    allowedDaoRoles: DAO_PROPOSAL_ROLES,
  });

  const proposalLookup = await access.service
    .from("dao_proposals")
    .select("*")
    .eq("id", options.proposalId)
    .eq("dao_id", dao.id)
    .maybeSingle();

  if (proposalLookup.error) {
    throw new DaoServiceError(proposalLookup.error.message, {
      status: 400,
      code: "DAO_PROPOSAL_LOOKUP_FAILED",
    });
  }

  if (!proposalLookup.data) {
    throw new DaoServiceError("Proposal not found", {
      status: 404,
      code: "DAO_PROPOSAL_NOT_FOUND",
    });
  }

  const currentProposal = parseRow(daoProposalSchema, proposalLookup.data, "dao_proposal");
  const proposalBinding =
    dao.primaryChainFamily === "evm"
      ? currentProposal.chainBindingId
        ? await loadDaoChainBinding({
            service: access.service,
            daoId: dao.id,
            orgId: access.orgId,
            chainBindingId: currentProposal.chainBindingId,
          })
        : await loadPrimaryEvmChainBinding({
            service: access.service,
            daoId: dao.id,
            orgId: access.orgId,
          })
      : null;
  let onchainProposalMetadata: JsonRecord = options.metadata ?? {};

  if (
    dao.primaryChainFamily === "evm" &&
    proposalBinding?.governanceAddress &&
    isNonEmptyString(currentProposal.externalProposalId)
  ) {
    const chainMatch = /^eip155:(\d+)$/u.exec(proposalBinding.chainRef);
    const chainId = chainMatch ? Number.parseInt(chainMatch[1] ?? "", 10) : null;
    if (!chainId) {
      throw new DaoServiceError("Proposal transition requires a valid EVM chain binding.", {
        status: 400,
        code: "DAO_EVM_PROPOSAL_CHAIN_BINDING_INVALID",
      });
    }

    if (options.status === "queued" || options.status === "executed") {
      const executionWallet = await resolveEvmExecutionWallet({
        service: access.service,
        userId: access.userId,
        chainId,
        ownershipMode: dao.ownershipMode,
        linkedAgentId: dao.linkedAgentId,
      });

      if (options.status === "queued") {
        const queueResult = await queueEvmGovernorProposal({
          userId: access.userId,
          fromAddress: executionWallet.address,
          chainRef: proposalBinding.chainRef,
          governorAddress: proposalBinding.governanceAddress,
          proposal: {
            description:
              typeof currentProposal.metadata?.description === "string"
                ? currentProposal.metadata.description
                : formatDaoProposalDescription(currentProposal.title, currentProposal.description),
            actions: currentProposal.actions as UntypedJson[],
          },
          agentId: executionWallet.source === "agent" ? executionWallet.agentId : null,
        });
        onchainProposalMetadata = {
          ...onchainProposalMetadata,
          queueTxHash: queueResult.txHash,
          executionWalletAddress: executionWallet.address,
        };
      }

      if (options.status === "executed") {
        const executeResult = await executeEvmGovernorProposal({
          userId: access.userId,
          fromAddress: executionWallet.address,
          chainRef: proposalBinding.chainRef,
          governorAddress: proposalBinding.governanceAddress,
          proposal: {
            description:
              typeof currentProposal.metadata?.description === "string"
                ? currentProposal.metadata.description
                : formatDaoProposalDescription(currentProposal.title, currentProposal.description),
            actions: currentProposal.actions as UntypedJson[],
          },
          agentId: executionWallet.source === "agent" ? executionWallet.agentId : null,
        });
        onchainProposalMetadata = {
          ...onchainProposalMetadata,
          executeTxHash: executeResult.txHash,
          executionWalletAddress: executionWallet.address,
        };
      }
    }
  }

  const patch: JsonRecord = {
    status: options.status,
    metadata: onchainProposalMetadata,
  };

  if (options.status === "active") patch.start_at = nowIso();
  if (options.status === "queued") patch.queued_at = nowIso();
  if (options.status === "executed") patch.executed_at = nowIso();

  const { data, error } = await access.service
    .from("dao_proposals")
    .update(patch)
    .eq("id", options.proposalId)
    .eq("dao_id", dao.id)
    .select("*")
    .single();

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_PROPOSAL_UPDATE_FAILED",
    });
  }

  const proposal = parseRow(daoProposalSchema, data, "dao_proposal");

  await insertDaoActivity({
    service: access.service,
    daoId: dao.id,
    orgId: access.orgId,
    actorUserId: access.userId,
    activityType: "dao.proposal.status",
    title: "Proposal status changed",
    body: `${proposal.title} is now ${proposal.status}.`,
    metadata: {
      proposalId: proposal.id,
      status: proposal.status,
    },
  });

  await refreshDaoDirectoryIndex({
    service: access.service,
    orgId: access.orgId,
    daoId: dao.id,
  });

  return proposal;
}

export async function listDaoProposals(options: {
  userId: string;
  orgId?: string | null;
  daoId: string;
}): Promise<DaoProposal[]> {
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
    .from("dao_proposals")
    .select("*")
    .eq("dao_id", options.daoId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_PROPOSAL_LIST_FAILED",
    });
  }

  return parseRows(daoProposalSchema, data ?? [], "dao_proposal");
}

export async function castDaoVote(options: {
  userId: string;
  orgId?: string | null;
  daoId: string;
  input: DaoVoteInput;
}): Promise<DaoVote> {
  const access = await resolveAccess({
    userId: options.userId,
    orgId: options.orgId,
  });
  const dao = await loadDaoOrganization({
    service: access.service,
    daoId: options.daoId,
    orgId: access.orgId,
  });
  const input = daoVoteInputSchema.parse(options.input);

  await resolveDaoPermission({
    service: access.service,
    daoId: dao.id,
    userId: access.userId,
    orgMembershipRole: access.membershipRole,
    allowedDaoRoles: DAO_VOTE_ROLES,
  });

  const normalizedVoterAddress = normalizeAddress(
    input.voterAddress,
    dao.primaryChainFamily,
  );

  const ownership = await verifyProofAddressOwnership({
    service: access.service,
    userId: access.userId,
    chainFamily: dao.primaryChainFamily,
    proofAddress: normalizedVoterAddress,
    linkedAgentId: input.voterAgentId ?? null,
  });

  if (!ownership.ok) {
    const { count, error: membershipAddressError } = await access.service
      .from("dao_memberships")
      .select("id", { count: "exact", head: true })
      .eq("dao_id", dao.id)
      .eq("user_id", access.userId)
      .eq("wallet_address", normalizedVoterAddress)
      .eq("is_active", true);

    if (membershipAddressError) {
      throw new DaoServiceError(membershipAddressError.message, {
        status: 400,
        code: "DAO_VOTE_WALLET_LOOKUP_FAILED",
      });
    }

    if ((count ?? 0) === 0) {
      throw new DaoServiceError("Voter address is not controlled by this workspace", {
        status: 403,
        code: "DAO_VOTE_WALLET_FORBIDDEN",
      });
    }
  }

  const proposalLookup = await access.service
    .from("dao_proposals")
    .select("*")
    .eq("id", input.proposalId)
    .eq("dao_id", dao.id)
    .maybeSingle();

  if (proposalLookup.error) {
    throw new DaoServiceError(proposalLookup.error.message, {
      status: 400,
      code: "DAO_PROPOSAL_LOOKUP_FAILED",
    });
  }
  if (!proposalLookup.data) {
    throw new DaoServiceError("Proposal not found", {
      status: 404,
      code: "DAO_PROPOSAL_NOT_FOUND",
    });
  }

  const proposal = parseRow(daoProposalSchema, proposalLookup.data, "dao_proposal");
  const proposalBinding =
    dao.primaryChainFamily === "evm"
      ? proposal.chainBindingId
        ? await loadDaoChainBinding({
            service: access.service,
            daoId: dao.id,
            orgId: access.orgId,
            chainBindingId: proposal.chainBindingId,
          })
        : await loadPrimaryEvmChainBinding({
            service: access.service,
            daoId: dao.id,
            orgId: access.orgId,
          })
      : null;
  let onchainTxHash = input.txHash ?? null;
  let onchainVoteMetadata: JsonRecord = {};

  if (
    dao.primaryChainFamily === "evm" &&
    proposalBinding?.governanceAddress &&
    isNonEmptyString(proposal.externalProposalId)
  ) {
    const chainMatch = /^eip155:(\d+)$/u.exec(proposalBinding.chainRef);
    const chainId = chainMatch ? Number.parseInt(chainMatch[1] ?? "", 10) : null;
    if (!chainId) {
      throw new DaoServiceError("Vote submission requires a valid EVM chain binding.", {
        status: 400,
        code: "DAO_EVM_VOTE_CHAIN_BINDING_INVALID",
      });
    }

    const voteResult = await castEvmGovernorVote({
      userId: access.userId,
      fromAddress: normalizedVoterAddress,
      chainRef: proposalBinding.chainRef,
      governorAddress: proposalBinding.governanceAddress,
      proposalId: proposal.externalProposalId,
      choice: input.choice,
      reason: input.reason ?? null,
      agentId: input.voterAgentId ?? null,
    });
    onchainTxHash = voteResult.txHash;
    onchainVoteMetadata = {
      proposalExternalId: proposal.externalProposalId,
      governanceAddress: proposalBinding.governanceAddress,
    };
  }

  const { data: existingVote, error: existingVoteError } = await access.service
    .from("dao_votes")
    .select("*")
    .eq("proposal_id", input.proposalId)
    .eq("voter_address", normalizedVoterAddress)
    .maybeSingle();

  if (existingVoteError) {
    throw new DaoServiceError(existingVoteError.message, {
      status: 400,
      code: "DAO_VOTE_EXISTING_LOOKUP_FAILED",
    });
  }

  const payload = {
    dao_id: dao.id,
    org_id: access.orgId,
    proposal_id: input.proposalId,
    voter_user_id: access.userId,
    voter_agent_id: input.voterAgentId ?? null,
    voter_address: normalizedVoterAddress,
    choice: input.choice,
    weight: input.weight ?? null,
    reason: input.reason ?? null,
    tx_hash: onchainTxHash,
    cast_at: nowIso(),
    metadata: {
      ...(input.metadata ?? {}),
      ownershipType: ownership.ownershipType,
      ...onchainVoteMetadata,
    },
  };

  const { data, error } = existingVote
    ? await access.service
        .from("dao_votes")
        .update(payload)
        .eq("id", existingVote.id)
        .select("*")
        .single()
    : await access.service
        .from("dao_votes")
        .insert(payload)
        .select("*")
        .single();

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_VOTE_UPSERT_FAILED",
    });
  }

  await refreshProposalVoteTotals({
    service: access.service,
    proposalId: input.proposalId,
  });

  const vote = parseRow(daoVoteSchema, data, "dao_vote");

  await insertDaoActivity({
    service: access.service,
    daoId: dao.id,
    orgId: access.orgId,
    actorUserId: access.userId,
    actorAgentId: input.voterAgentId ?? null,
    activityType: "dao.vote.cast",
    title: "Vote cast",
    body: `${vote.choice.toUpperCase()} on proposal ${input.proposalId}.`,
    txHash: vote.txHash,
    metadata: {
      proposalId: input.proposalId,
      choice: vote.choice,
      weight: vote.weight,
    },
  });

  await refreshDaoDirectoryIndex({
    service: access.service,
    orgId: access.orgId,
    daoId: dao.id,
  });

  return vote;
}

export async function listDaoVotes(options: {
  userId: string;
  orgId?: string | null;
  daoId: string;
}): Promise<DaoVote[]> {
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
    .from("dao_votes")
    .select("*")
    .eq("dao_id", options.daoId)
    .order("cast_at", { ascending: false });

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_VOTE_LIST_FAILED",
    });
  }

  return parseRows(daoVoteSchema, data ?? [], "dao_vote");
}
