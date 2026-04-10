import {
  inspectEvmGovernorDao,
  verifyEvmDaoImportAccess,
} from "@/server/daos/evm-governance";
import {
  daoChainBindingSchema,
  daoImportInputSchema,
  daoOrganizationSchema,
  normalizeDaoSlug,
  type ImportDaoInput,
} from "@/modules/daos/contracts";
import {
  assertLinkedAgentAccessible,
  resolveAccess,
  verifyProofAddressOwnership,
} from "./internal/dao-service-access";
import {
  insertDaoActivity,
  maybeInsertPrimaryTreasury,
  upsertDaoCapabilitiesRecord,
} from "./internal/dao-service-persistence";
import {
  DaoServiceError,
  defaultGovernanceModelForChain,
  defaultTreasuryModelForChain,
  normalizeAddress,
  nowIso,
  parseRow,
} from "./internal/dao-service-utils";
import { getDaoOverview, refreshDaoDirectoryIndex } from "./directory-service";

export async function importDao(options: {
  userId: string;
  orgId?: string | null;
  input: ImportDaoInput;
}) {
  const access = await resolveAccess({
    userId: options.userId,
    orgId: options.orgId,
    requireManager: true,
  });
  const input = daoImportInputSchema.parse(options.input);

  await assertLinkedAgentAccessible({
    service: access.service,
    linkedAgentId: input.linkedAgentId,
    orgId: access.orgId,
  });

  const ownership = await verifyProofAddressOwnership({
    service: access.service,
    userId: access.userId,
    chainFamily: input.chainFamily,
    proofAddress: input.proofAddress,
    linkedAgentId: input.linkedAgentId ?? null,
  });

  if (!ownership.ok) {
    throw new DaoServiceError("Proof address is not controlled by this workspace", {
      status: 403,
      code: "DAO_IMPORT_PROOF_FAILED",
    });
  }

  const normalizedProofAddress = normalizeAddress(
    input.proofAddress,
    input.chainFamily,
  );

  let inspectedEvmDao:
    | Awaited<ReturnType<typeof inspectEvmGovernorDao>>
    | null = null;

  if (input.chainFamily === "evm" && input.governanceAddress?.trim()) {
    inspectedEvmDao = await inspectEvmGovernorDao({
      chainRef: input.chainRef,
      governanceAddress: input.governanceAddress,
    });
  }

  let evmImportAccess:
    | Awaited<ReturnType<typeof verifyEvmDaoImportAccess>>
    | null = null;

  if (input.chainFamily === "evm") {
    evmImportAccess = await verifyEvmDaoImportAccess({
      chainRef: input.chainRef,
      governanceAddress:
        input.governanceAddress ?? inspectedEvmDao?.governanceAddress ?? null,
      safeAddress: input.safeAddress ?? null,
      proofAddress: normalizedProofAddress,
    });

    if (!evmImportAccess.hasAccess) {
      throw new DaoServiceError(
        "Proof address does not hold a recognized on-chain governance or treasury role for this DAO",
        {
          status: 403,
          code: "DAO_IMPORT_ROLE_REQUIRED",
          details: {
            proofAddress: normalizedProofAddress,
            governanceAddress:
              input.governanceAddress ??
              inspectedEvmDao?.governanceAddress ??
              null,
            safeAddress: input.safeAddress ?? null,
            tokenVotes: evmImportAccess.tokenVotes,
          },
        },
      );
    }
  }

  const resolvedName =
    input.name ??
    inspectedEvmDao?.name ??
    `Imported ${input.chainFamily === "evm" ? "Governor" : "Realm"} DAO`;
  const slug = normalizeDaoSlug(input.slug ?? resolvedName);

  const { data: importRow, error: importError } = await access.service
    .from("dao_imports")
    .insert({
      org_id: access.orgId,
      requested_by_user_id: access.userId,
      chain_family: input.chainFamily,
      import_source: "imported",
      status: "pending",
      request_payload: input,
      resolved_payload: {},
    })
    .select("*")
    .single();

  if (importError) {
    throw new DaoServiceError(importError.message, {
      status: 400,
      code: "DAO_IMPORT_REQUEST_FAILED",
    });
  }

  const governanceModel = defaultGovernanceModelForChain(input.chainFamily);
  const treasuryModel = defaultTreasuryModelForChain(input.chainFamily);

  const { data: daoData, error: daoError } = await access.service
    .from("dao_organizations")
    .insert({
      org_id: access.orgId,
      slug,
      name: resolvedName,
      description: input.description ?? null,
      category: input.category ?? null,
      ownership_mode: input.ownershipMode,
      lifecycle_state: "active",
      primary_chain_family: input.chainFamily,
      import_source: "imported",
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
      code: "DAO_IMPORT_CREATE_FAILED",
    });
  }

  const dao = parseRow(daoOrganizationSchema, daoData, "dao_organization");

  const { data: bindingData, error: bindingError } = await access.service
    .from("dao_chain_bindings")
    .insert({
      dao_id: dao.id,
      org_id: access.orgId,
      chain_family: input.chainFamily,
      chain_ref: input.chainRef,
      governance_address:
        input.governanceAddress ?? inspectedEvmDao?.governanceAddress ?? null,
      treasury_address:
        input.treasuryAddress ??
        input.safeAddress ??
        inspectedEvmDao?.timelockAddress ??
        null,
      safe_address: input.safeAddress ?? null,
      timelock_address:
        input.timelockAddress ?? inspectedEvmDao?.timelockAddress ?? null,
      token_address: input.tokenAddress ?? inspectedEvmDao?.tokenAddress ?? null,
      realm_address: input.realmAddress ?? null,
      squads_address: input.squadsAddress ?? null,
      external_dao_id:
        input.governanceAddress ??
        input.realmAddress ??
        input.squadsAddress ??
        null,
      external_url: null,
      sync_status: "pending",
      import_source: "imported",
      metadata: {
        proofAddress: normalizedProofAddress,
        proofOwnershipType: ownership.ownershipType,
        importAccessType: evmImportAccess?.accessType ?? null,
        tokenVotes: evmImportAccess?.tokenVotes ?? null,
        ...(inspectedEvmDao
          ? {
              inspectedDao: {
                name: inspectedEvmDao.name,
                token: inspectedEvmDao.token,
                timelockDelaySeconds: inspectedEvmDao.timelockDelaySeconds,
              },
            }
          : {}),
      },
    })
    .select("*")
    .single();

  if (bindingError) {
    throw new DaoServiceError(bindingError.message, {
      status: 400,
      code: "DAO_IMPORT_BINDING_FAILED",
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
      wallet_address: normalizedProofAddress,
      source: "imported-proof",
      is_active: true,
      added_by_user_id: access.userId,
      metadata: {
        ownershipType: ownership.ownershipType,
      },
    },
  ];

  if (input.linkedAgentId) {
    membershipRows.push({
      dao_id: dao.id,
      org_id: access.orgId,
      agent_id: input.linkedAgentId,
      membership_type: "agent",
      role: ownership.ownershipType === "agent" ? "owner" : "admin",
      wallet_address:
        ownership.ownershipType === "agent" ? normalizedProofAddress : null,
      source: "imported-agent-proof",
      is_active: true,
      added_by_user_id: access.userId,
      metadata: {},
    });
  }

  const { error: membershipError } = await access.service
    .from("dao_memberships")
    .insert(membershipRows);

  if (membershipError) {
    throw new DaoServiceError(membershipError.message, {
      status: 400,
      code: "DAO_IMPORT_MEMBERSHIP_FAILED",
    });
  }

  const primaryTreasuryAddress =
    input.chainFamily === "evm"
      ? input.safeAddress ?? input.treasuryAddress ?? null
      : input.squadsAddress ?? input.treasuryAddress ?? null;

  await maybeInsertPrimaryTreasury({
    service: access.service,
    daoId: dao.id,
    orgId: access.orgId,
    chainBindingId: binding.id,
    chainFamily: input.chainFamily,
    address: primaryTreasuryAddress,
    treasuryType: input.chainFamily === "evm" ? "safe" : "squads",
    metadata: {
      createdFrom: "dao_import",
    },
  });

  await access.service
    .from("dao_imports")
    .update({
      dao_id: dao.id,
      status: "succeeded",
      resolved_payload: {
        daoId: dao.id,
        slug: dao.slug,
        proofOwnershipType: ownership.ownershipType,
      },
      updated_at: nowIso(),
    })
    .eq("id", importRow.id);

  await access.service.from("dao_sync_jobs").insert({
    dao_id: dao.id,
    org_id: access.orgId,
    chain_binding_id: binding.id,
    job_type:
      input.chainFamily === "evm"
        ? "evm-governance-import-sync"
        : "solana-governance-import-sync",
    status: "pending",
    scheduled_for: nowIso(),
    metadata: {
      source: "dao_import",
    },
  });

  await insertDaoActivity({
    service: access.service,
    daoId: dao.id,
    orgId: access.orgId,
    actorUserId: access.userId,
    actorAgentId: input.linkedAgentId ?? null,
    activityType: "dao.imported",
    title: "DAO imported",
    body: `${dao.name} was imported from on-chain governance.`,
    chainFamily: input.chainFamily,
    chainRef: input.chainRef,
    metadata: {
      proofAddress: normalizedProofAddress,
      proofOwnershipType: ownership.ownershipType,
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
