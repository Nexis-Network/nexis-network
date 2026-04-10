import {
  createDaoSafeTxRequest,
} from "@/server/daos/evm-treasury";
import { executeApprovedSafeTxRequest } from "@/server/services/safe/tx-requests";
import {
  daoTreasuryActionInputSchema,
  daoTreasuryActionSchema,
  type DaoTreasuryAction,
  type DaoTreasuryActionInput,
} from "@/modules/daos/contracts";
import {
  DAO_ADMIN_ROLES,
  type JsonRecord,
  DaoServiceError,
  parseRow,
  parseRows,
} from "./internal/dao-service-utils";
import {
  loadDaoChainBinding,
  loadDaoOrganization,
  loadDaoTreasuryAction,
  resolveAccess,
  resolveDaoPermission,
} from "./internal/dao-service-access";
import { insertDaoActivity } from "./internal/dao-service-persistence";

export async function createDaoTreasuryAction(options: {
  userId: string;
  orgId?: string | null;
  daoId: string;
  input: DaoTreasuryActionInput;
}): Promise<DaoTreasuryAction> {
  const access = await resolveAccess({
    userId: options.userId,
    orgId: options.orgId,
  });
  const dao = await loadDaoOrganization({
    service: access.service,
    daoId: options.daoId,
    orgId: access.orgId,
  });
  const input = daoTreasuryActionInputSchema.parse(options.input);

  await resolveDaoPermission({
    service: access.service,
    daoId: dao.id,
    userId: access.userId,
    orgMembershipRole: access.membershipRole,
    allowedDaoRoles: DAO_ADMIN_ROLES,
  });

  const chainBinding = input.chainBindingId
    ? await loadDaoChainBinding({
        service: access.service,
        daoId: dao.id,
        orgId: access.orgId,
        chainBindingId: input.chainBindingId,
      })
    : null;

  const safeMetadata = chainBinding
    ? await createDaoSafeTxRequest({
        userId: access.userId,
        binding: chainBinding,
        action: {
          requestedByAgentId: input.requestedByAgentId ?? null,
          targetAddress: input.targetAddress ?? null,
          valueBaseUnits: input.valueBaseUnits,
          payload: input.payload,
        },
      })
    : null;

  const requestedStatus =
    safeMetadata
      ? "pending_approval"
      : input.approvalRequestId && input.status === "draft"
        ? "pending_approval"
        : input.status;

  const metadata = {
    ...(input.metadata ?? {}),
    ...(safeMetadata ?? {}),
  };

  const { data, error } = await access.service
    .from("dao_treasury_actions")
    .insert({
      dao_id: dao.id,
      org_id: access.orgId,
      chain_binding_id: input.chainBindingId ?? null,
      proposal_id: input.proposalId ?? null,
      requested_by_user_id: access.userId,
      requested_by_agent_id: input.requestedByAgentId ?? null,
      title: input.title,
      action_type: input.actionType,
      target_address: input.targetAddress ?? null,
      value_base_units: input.valueBaseUnits ?? null,
      payload: input.payload,
      status: requestedStatus,
      approval_request_id: input.approvalRequestId ?? null,
      tx_hash: input.txHash ?? null,
      metadata,
    })
    .select("*")
    .single();

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_TREASURY_ACTION_CREATE_FAILED",
    });
  }

  const action = parseRow(daoTreasuryActionSchema, data, "dao_treasury_action");

  await insertDaoActivity({
    service: access.service,
    daoId: dao.id,
    orgId: access.orgId,
    actorUserId: access.userId,
    actorAgentId: input.requestedByAgentId ?? null,
    activityType: "dao.treasury.action.created",
    title: "Treasury action created",
    body: action.title,
    metadata: {
      treasuryActionId: action.id,
      status: action.status,
      approvalRequestId: action.approvalRequestId,
      safeTxRequestId:
        typeof action.metadata.safeTxRequestId === "string"
          ? action.metadata.safeTxRequestId
          : null,
    },
  });

  return action;
}

export async function updateDaoTreasuryAction(options: {
  userId: string;
  orgId?: string | null;
  daoId: string;
  actionId: string;
  patch: {
    status?: DaoTreasuryAction["status"];
    txHash?: string | null;
    lastError?: string | null;
    approvalRequestId?: string | null;
    metadata?: JsonRecord;
  };
}): Promise<DaoTreasuryAction> {
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
    allowedDaoRoles: DAO_ADMIN_ROLES,
  });

  const { data, error } = await access.service
    .from("dao_treasury_actions")
    .update({
      ...(options.patch.status ? { status: options.patch.status } : {}),
      ...(options.patch.txHash !== undefined ? { tx_hash: options.patch.txHash } : {}),
      ...(options.patch.lastError !== undefined ? { last_error: options.patch.lastError } : {}),
      ...(options.patch.approvalRequestId !== undefined
        ? { approval_request_id: options.patch.approvalRequestId }
        : {}),
      ...(options.patch.metadata !== undefined ? { metadata: options.patch.metadata } : {}),
    })
    .eq("id", options.actionId)
    .eq("dao_id", dao.id)
    .select("*")
    .single();

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_TREASURY_ACTION_UPDATE_FAILED",
    });
  }

  const action = parseRow(daoTreasuryActionSchema, data, "dao_treasury_action");

  await insertDaoActivity({
    service: access.service,
    daoId: dao.id,
    orgId: access.orgId,
    actorUserId: access.userId,
    activityType: "dao.treasury.action.updated",
    title: "Treasury action updated",
    body: `${action.title} is now ${action.status}.`,
    txHash: action.txHash,
    metadata: {
      treasuryActionId: action.id,
      status: action.status,
    },
  });

  return action;
}

export async function executeDaoTreasuryAction(options: {
  userId: string;
  orgId?: string | null;
  daoId: string;
  actionId: string;
}): Promise<DaoTreasuryAction> {
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
    allowedDaoRoles: DAO_ADMIN_ROLES,
  });

  const action = await loadDaoTreasuryAction({
    service: access.service,
    daoId: dao.id,
    orgId: access.orgId,
    actionId: options.actionId,
  });

  const safeTxRequestId =
    typeof action.metadata.safeTxRequestId === "string" &&
    action.metadata.safeTxRequestId.trim().length > 0
      ? action.metadata.safeTxRequestId.trim()
      : null;

  if (!safeTxRequestId) {
    throw new DaoServiceError(
      "Treasury action is not linked to a Safe transaction request",
      {
        status: 400,
        code: "DAO_TREASURY_ACTION_NOT_SAFE_BACKED",
      },
    );
  }

  try {
    const execution = await executeApprovedSafeTxRequest({
      userId: access.userId,
      requestId: safeTxRequestId,
    });

    const metadata = {
      ...(action.metadata ?? {}),
      safeStatus: "executed",
      executionTxHash: execution.txHash,
    };

    const { data, error } = await access.service
      .from("dao_treasury_actions")
      .update({
        status: "executed",
        tx_hash: execution.txHash,
        last_error: null,
        metadata,
      })
      .eq("id", action.id)
      .eq("dao_id", dao.id)
      .select("*")
      .single();

    if (error) {
      throw new DaoServiceError(error.message, {
        status: 400,
        code: "DAO_TREASURY_ACTION_EXECUTE_UPDATE_FAILED",
      });
    }

    const executedAction = parseRow(daoTreasuryActionSchema, data, "dao_treasury_action");

    await insertDaoActivity({
      service: access.service,
      daoId: dao.id,
      orgId: access.orgId,
      actorUserId: access.userId,
      activityType: "dao.treasury.action.executed",
      title: "Treasury action executed",
      body: `${executedAction.title} executed on-chain.`,
      txHash: executedAction.txHash,
      metadata: {
        treasuryActionId: executedAction.id,
        safeTxRequestId,
      },
    });

    return executedAction;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to execute treasury action";

    await access.service
      .from("dao_treasury_actions")
      .update({
        last_error: message,
        metadata: {
          ...(action.metadata ?? {}),
          safeStatus:
            typeof action.metadata.safeStatus === "string"
              ? action.metadata.safeStatus
              : "proposed",
        },
      })
      .eq("id", action.id)
      .eq("dao_id", dao.id);

    throw new DaoServiceError(message, {
      status: 400,
      code: "DAO_TREASURY_ACTION_EXECUTE_FAILED",
    });
  }
}

export async function listDaoTreasuryActions(options: {
  userId: string;
  orgId?: string | null;
  daoId: string;
}): Promise<DaoTreasuryAction[]> {
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
    .from("dao_treasury_actions")
    .select("*")
    .eq("dao_id", options.daoId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_TREASURY_ACTION_LIST_FAILED",
    });
  }

  return parseRows(daoTreasuryActionSchema, data ?? [], "dao_treasury_action");
}
