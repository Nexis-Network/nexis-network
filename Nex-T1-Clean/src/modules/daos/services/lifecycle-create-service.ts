import {
  deployEvmDaoContracts,
} from "@/server/daos/evm-governance";
import { provisionDaoSafeWallet } from "@/server/daos/evm-dao-safe";
import {
  daoChainBindingSchema,
  daoCreateInputSchema,
  daoOrganizationSchema,
  normalizeDaoSlug,
  type CreateDaoInput,
} from "@/modules/daos/contracts";
import {
  assertLinkedAgentAccessible,
  resolveAccess,
} from "./internal/dao-service-access";
import {
  insertDaoActivity,
  maybeInsertPrimaryTreasury,
  upsertDaoCapabilitiesRecord,
} from "./internal/dao-service-persistence";
import {
  resolveAgentEvmExecutionWallet,
  resolveEvmExecutionWallet,
  resolveUserEvmExecutionWallet,
} from "./internal/dao-service-wallets";
import {
  defaultGovernanceModelForChain,
  defaultTreasuryModelForChain,
  DaoServiceError,
  nowIso,
  parseRow,
  resolveInitialLifecycleState,
} from "./internal/dao-service-utils";
import { getDaoOverview, refreshDaoDirectoryIndex } from "./directory-service";

export async function createDao(options: {
  userId: string;
  orgId?: string | null;
  input: CreateDaoInput;
}) {
  const access = await resolveAccess({
    userId: options.userId,
    orgId: options.orgId,
    requireManager: true,
  });
  const input = daoCreateInputSchema.parse(options.input);

  await assertLinkedAgentAccessible({
    service: access.service,
    linkedAgentId: input.linkedAgentId,
    orgId: access.orgId,
  });

  const slug = normalizeDaoSlug(input.slug ?? input.name);
  const chainId =
    input.primaryChainFamily === "evm"
      ? /^eip155:(\d+)$/u.exec(input.chainRef)?.[1]
      : null;
  const parsedEvmChainId = chainId ? Number.parseInt(chainId, 10) : null;
  let derivedBinding = input.binding ? { ...input.binding } : undefined;

  if (
    input.primaryChainFamily === "evm" &&
    !(derivedBinding?.governanceAddress && derivedBinding.governanceAddress.trim())
  ) {
    if (!parsedEvmChainId) {
      throw new DaoServiceError("EVM DAO creation requires a CAIP-2 EVM chainRef.", {
        status: 400,
        code: "DAO_EVM_CHAINREF_INVALID",
      });
    }

    const executionWallet = await resolveEvmExecutionWallet({
      service: access.service,
      userId: access.userId,
      chainId: parsedEvmChainId,
      ownershipMode: input.ownershipMode,
      linkedAgentId: input.linkedAgentId ?? null,
    });

    const deployment = await deployEvmDaoContracts({
      userId: access.userId,
      fromAddress: executionWallet.address,
      chainRef: input.chainRef,
      daoName: input.name,
      daoSymbol:
        typeof input.metadata?.daoSymbol === "string"
          ? input.metadata.daoSymbol
          : null,
      description: input.description ?? null,
      ownershipMode: input.ownershipMode,
      agentId: executionWallet.source === "agent" ? executionWallet.agentId : null,
    });

    derivedBinding = {
      governanceAddress: deployment.governorAddress,
      treasuryAddress: deployment.timelockAddress,
      safeAddress: derivedBinding?.safeAddress ?? null,
      timelockAddress: deployment.timelockAddress,
      tokenAddress: deployment.tokenAddress,
      realmAddress: null,
      squadsAddress: null,
      externalDaoId: deployment.governorAddress,
      externalUrl: null,
      metadata: {
        ...(input.binding?.metadata ?? {}),
        deploymentTxHashes: deployment.deploymentTxHashes,
        deployedByAddress: executionWallet.address,
        treasuryOwnerAddress: derivedBinding?.safeAddress ?? null,
      },
    };
  }

  const lifecycleState = resolveInitialLifecycleState({
    importSource: "app",
    chainFamily: input.primaryChainFamily,
    governanceAddress: derivedBinding?.governanceAddress ?? null,
    treasuryAddress: derivedBinding?.treasuryAddress ?? null,
    safeAddress: derivedBinding?.safeAddress ?? null,
    realmAddress: input.binding?.realmAddress ?? null,
    squadsAddress: input.binding?.squadsAddress ?? null,
  });

  const governanceModel =
    input.governanceModel ??
    defaultGovernanceModelForChain(input.primaryChainFamily);
  const treasuryModel =
    input.treasuryModel ??
    defaultTreasuryModelForChain(input.primaryChainFamily);

  const { data: daoData, error: daoError } = await access.service
    .from("dao_organizations")
    .insert({
      org_id: access.orgId,
      slug,
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      ownership_mode: input.ownershipMode,
      lifecycle_state: lifecycleState,
      primary_chain_family: input.primaryChainFamily,
      import_source: "app",
      governance_model: governanceModel,
      treasury_model: treasuryModel,
      created_by_user_id: access.userId,
      linked_agent_id: input.linkedAgentId ?? null,
      tags: input.tags ?? [],
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (daoError) {
    throw new DaoServiceError(daoError.message, {
      status: 400,
      code: "DAO_CREATE_FAILED",
    });
  }

  const dao = parseRow(daoOrganizationSchema, daoData, "dao_organization");

  if (
    input.primaryChainFamily === "evm" &&
    parsedEvmChainId &&
    !(derivedBinding?.safeAddress && derivedBinding.safeAddress.trim())
  ) {
    const daoSafeWallet = await provisionDaoSafeWallet({
      userId: access.userId,
      daoId: dao.id,
      chainId: parsedEvmChainId,
      label: `${dao.name} Treasury`,
    });

    derivedBinding = {
      ...derivedBinding,
      governanceAddress: derivedBinding?.governanceAddress ?? null,
      treasuryAddress: derivedBinding?.treasuryAddress ?? null,
      safeAddress: daoSafeWallet.safeAddress,
      timelockAddress: derivedBinding?.timelockAddress ?? null,
      tokenAddress: derivedBinding?.tokenAddress ?? null,
      realmAddress: derivedBinding?.realmAddress ?? null,
      squadsAddress: derivedBinding?.squadsAddress ?? null,
      externalDaoId: derivedBinding?.externalDaoId ?? null,
      externalUrl: derivedBinding?.externalUrl ?? null,
      metadata: {
        ...(derivedBinding?.metadata ?? {}),
        treasuryOwnerAddress: daoSafeWallet.safeAddress,
        daoSafeWalletId: daoSafeWallet.walletId,
      },
    };
  }

  const { data: bindingData, error: bindingError } = await access.service
    .from("dao_chain_bindings")
    .insert({
      dao_id: dao.id,
      org_id: access.orgId,
      chain_family: input.primaryChainFamily,
      chain_ref: input.chainRef,
      governance_address: derivedBinding?.governanceAddress ?? null,
      treasury_address: derivedBinding?.treasuryAddress ?? null,
      safe_address: derivedBinding?.safeAddress ?? null,
      timelock_address: derivedBinding?.timelockAddress ?? null,
      token_address: derivedBinding?.tokenAddress ?? null,
      realm_address: derivedBinding?.realmAddress ?? null,
      squads_address: derivedBinding?.squadsAddress ?? null,
      external_dao_id: derivedBinding?.externalDaoId ?? null,
      external_url: derivedBinding?.externalUrl ?? null,
      sync_status: lifecycleState === "active" ? "running" : "pending",
      import_source: "app",
      metadata: derivedBinding?.metadata ?? {},
      last_synced_at: lifecycleState === "active" ? nowIso() : null,
    })
    .select("*")
    .single();

  if (bindingError) {
    throw new DaoServiceError(bindingError.message, {
      status: 400,
      code: "DAO_BINDING_CREATE_FAILED",
    });
  }

  const binding = parseRow(daoChainBindingSchema, bindingData, "dao_chain_binding");

  await upsertDaoCapabilitiesRecord({
    service: access.service,
    daoId: dao.id,
    orgId: access.orgId,
    ownershipMode: input.ownershipMode,
    patch: input.capabilities,
  });

  const membershipRows: Record<string, UntypedJson>[] = [
    {
      dao_id: dao.id,
      org_id: access.orgId,
      user_id: access.userId,
      membership_type: "user",
      role: "owner",
      wallet_address:
        input.primaryChainFamily === "evm" && parsedEvmChainId
          ? await resolveUserEvmExecutionWallet({
              service: access.service,
              userId: access.userId,
              chainId: parsedEvmChainId,
            })
          : null,
      source: "app",
      is_active: true,
      added_by_user_id: access.userId,
      metadata: {},
    },
  ];

  if (input.linkedAgentId) {
    membershipRows.push({
      dao_id: dao.id,
      org_id: access.orgId,
      agent_id: input.linkedAgentId,
      membership_type: "agent",
      role: input.ownershipMode === "agent" ? "owner" : "admin",
      wallet_address:
        input.primaryChainFamily === "evm" && parsedEvmChainId
          ? await resolveAgentEvmExecutionWallet({
              service: access.service,
              userId: access.userId,
              chainId: parsedEvmChainId,
              agentId: input.linkedAgentId,
            })
          : null,
      source: "linked-agent",
      is_active: true,
      added_by_user_id: access.userId,
      metadata: {},
    });
  }

  const { error: membershipsError } = await access.service
    .from("dao_memberships")
    .insert(membershipRows);

  if (membershipsError) {
    throw new DaoServiceError(membershipsError.message, {
      status: 400,
      code: "DAO_MEMBERSHIPS_CREATE_FAILED",
    });
  }

  const primaryTreasuryAddress =
    input.primaryChainFamily === "evm"
      ? derivedBinding?.safeAddress ?? derivedBinding?.treasuryAddress ?? null
      : input.binding?.squadsAddress ?? input.binding?.treasuryAddress ?? null;

  await maybeInsertPrimaryTreasury({
    service: access.service,
    daoId: dao.id,
    orgId: access.orgId,
    chainBindingId: binding.id,
    chainFamily: input.primaryChainFamily,
    address: primaryTreasuryAddress,
    treasuryType: input.primaryChainFamily === "evm" ? "safe" : "squads",
    metadata: {
      createdFrom: "dao_create",
    },
  });

  await access.service.from("dao_sync_jobs").insert({
    dao_id: dao.id,
    org_id: access.orgId,
    chain_binding_id: binding.id,
    job_type:
      input.primaryChainFamily === "evm"
        ? "evm-governance-bootstrap"
        : "solana-governance-bootstrap",
    status: "pending",
    scheduled_for: nowIso(),
    metadata: {
      source: "dao_create",
    },
  });

  await insertDaoActivity({
    service: access.service,
    daoId: dao.id,
    orgId: access.orgId,
    actorUserId: access.userId,
    actorAgentId: input.linkedAgentId ?? null,
    activityType: "dao.created",
    title: "DAO created",
    body: `${dao.name} was created for ${input.primaryChainFamily.toUpperCase()} governance.`,
    chainFamily: input.primaryChainFamily,
    chainRef: input.chainRef,
    metadata: {
      ownershipMode: input.ownershipMode,
      governanceModel,
      treasuryModel,
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
