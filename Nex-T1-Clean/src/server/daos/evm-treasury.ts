import { z } from "zod";

import { getNetworkCapabilityByKey } from "@/lib/networks/capabilities";
import {
  daoTreasuryActionSchema,
  type DaoChainBinding,
  type DaoTreasuryAction,
  type DaoTreasuryActionInput,
} from "@/modules/daos/contracts";
import type { SupabaseServiceRoleClient } from "@/server/services/supabase/service-role";
import {
  createSafeTxRequest,
  createSafeTxRequestFromTransactions,
  type MetaTransactionData,
} from "@/server/services/safe/tx-requests";

type JsonRecord = Record<string, UntypedJson>;

const safeRequestStatusSchema = z.enum([
  "proposed",
  "approved",
  "rejected",
  "executed",
  "failed",
  "expired",
]);

const safeRequestSyncRowSchema = z.object({
  id: z.string(),
  status: safeRequestStatusSchema,
  safe_tx_hash: z.string().nullable().optional(),
  execution_tx_hash: z.string().nullable().optional(),
  last_error: z.string().nullable().optional(),
});

export type DaoSafeRequestSyncRow = z.infer<typeof safeRequestSyncRowSchema>;

type DaoSafeRequestMetadata = {
  safeTxRequestId: string;
  safeTxHash: string;
  safeTxNonce: string;
  safeAddress: string;
  chainId: number;
  safeStatus: "proposed" | "approved" | "rejected" | "executed" | "failed" | "expired";
  executionTxHash?: string | null;
};

type DaoSingleSafeRequest = {
  chainId: number;
  safeAddress: string;
  to: string;
  valueWei: string;
  data: string;
  operation: number;
  transactions: null;
};

type DaoBatchSafeRequest = {
  chainId: number;
  safeAddress: string;
  to: null;
  valueWei: null;
  data: null;
  operation: null;
  transactions: MetaTransactionData[];
};

export type DaoEvmSafeRequest = DaoSingleSafeRequest | DaoBatchSafeRequest;

function asJsonRecord(value: UntypedJson | null | undefined): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as JsonRecord;
}

function firstString(
  record: JsonRecord,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function parseOperation(value: UntypedJson): number {
  if (value === 1 || value === "1") return 1;
  return 0;
}

function parseTransactions(
  payload: JsonRecord,
): MetaTransactionData[] | null {
  const raw = payload.transactions;
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }

  const transactions: MetaTransactionData[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return null;
    }

    const tx = asJsonRecord(item as UntypedJson);
    const to = firstString(tx, ["to", "targetAddress", "target"]);
    if (!to) {
      return null;
    }

    transactions.push({
      to,
      value: firstString(tx, ["valueWei", "valueBaseUnits", "value"]) ?? "0",
      data: firstString(tx, ["data", "calldata", "callData"]) ?? "0x",
      operation: parseOperation(tx.operation),
    });
  }

  return transactions;
}

export function resolveDaoEvmChainId(chainRef: string): number | null {
  const normalized = chainRef.trim();
  const caipMatch = /^eip155:(\d+)$/u.exec(normalized);
  if (caipMatch) {
    const chainId = Number.parseInt(caipMatch[1] ?? "", 10);
    return Number.isFinite(chainId) && chainId > 0 ? chainId : null;
  }

  const capability = getNetworkCapabilityByKey(normalized);
  return capability?.chainId ?? null;
}

export function buildDaoEvmSafeRequest(options: {
  binding: DaoChainBinding;
  action: Pick<
    DaoTreasuryActionInput | DaoTreasuryAction,
    "targetAddress" | "valueBaseUnits" | "payload"
  >;
}): DaoEvmSafeRequest | null {
  if (options.binding.chainFamily !== "evm") {
    return null;
  }

  const chainId = resolveDaoEvmChainId(options.binding.chainRef);
  const safeAddress = options.binding.safeAddress?.trim() ?? "";

  if (!chainId || safeAddress.length === 0) {
    return null;
  }

  const payload = asJsonRecord(options.action.payload);
  const transactions = parseTransactions(payload);
  if (transactions) {
    return {
      chainId,
      safeAddress,
      to: null,
      valueWei: null,
      data: null,
      operation: null,
      transactions,
    };
  }

  const to =
    options.action.targetAddress?.trim() ??
    firstString(payload, ["to", "targetAddress", "target", "recipient"]);

  if (!to) {
    return null;
  }

  return {
    chainId,
    safeAddress,
    to,
    valueWei:
      options.action.valueBaseUnits ??
      firstString(payload, ["valueWei", "valueBaseUnits", "value"]) ??
      "0",
    data: firstString(payload, ["data", "calldata", "callData"]) ?? "0x",
    operation: parseOperation(payload.operation),
    transactions: null,
  };
}

export async function createDaoSafeTxRequest(options: {
  userId: string;
  binding: DaoChainBinding;
  action: Pick<
    DaoTreasuryActionInput,
    "requestedByAgentId" | "targetAddress" | "valueBaseUnits" | "payload"
  >;
}): Promise<DaoSafeRequestMetadata | null> {
  const request = buildDaoEvmSafeRequest({
    binding: options.binding,
    action: options.action,
  });

  if (!request) {
    return null;
  }

  const createdBy = options.action.requestedByAgentId ? "agent" : "user";

  const result = request.transactions
    ? await createSafeTxRequestFromTransactions({
        userId: options.userId,
        chainId: request.chainId,
        safeAddress: request.safeAddress,
        transactions: request.transactions,
        createdBy,
        requiresMfa: true,
      })
    : await createSafeTxRequest({
        userId: options.userId,
        chainId: request.chainId,
        safeAddress: request.safeAddress,
        to: request.to,
        valueWei: request.valueWei,
        data: request.data,
        operation: request.operation ?? 0,
        createdBy,
        requiresMfa: true,
      });

  return {
    safeTxRequestId: result.requestId,
    safeTxHash: result.safeTxHash,
    safeTxNonce: result.nonce,
    safeAddress: request.safeAddress,
    chainId: request.chainId,
    safeStatus: "proposed",
  };
}

function mapSafeRequestStatusToDaoActionStatus(
  status: DaoSafeRequestSyncRow["status"],
): DaoTreasuryAction["status"] {
  switch (status) {
    case "approved":
      return "approved";
    case "executed":
      return "executed";
    case "failed":
      return "failed";
    case "rejected":
    case "expired":
      return "cancelled";
    case "proposed":
    default:
      return "pending_approval";
  }
}

export function buildDaoSafeSyncPatch(options: {
  action: DaoTreasuryAction;
  safeRequest: DaoSafeRequestSyncRow;
}): {
  status: DaoTreasuryAction["status"];
  txHash: string | null;
  lastError: string | null;
  metadata: JsonRecord;
} {
  const currentMetadata = asJsonRecord(options.action.metadata);
  const executionTxHash = options.safeRequest.execution_tx_hash ?? null;

  return {
    status: mapSafeRequestStatusToDaoActionStatus(options.safeRequest.status),
    txHash: executionTxHash ?? options.action.txHash ?? null,
    lastError: options.safeRequest.last_error ?? null,
    metadata: {
      ...currentMetadata,
      safeTxRequestId: options.safeRequest.id,
      safeTxHash:
        options.safeRequest.safe_tx_hash ??
        (typeof currentMetadata.safeTxHash === "string"
          ? currentMetadata.safeTxHash
          : null),
      executionTxHash:
        executionTxHash ??
        (typeof currentMetadata.executionTxHash === "string"
          ? currentMetadata.executionTxHash
          : null),
      safeStatus: options.safeRequest.status,
    },
  };
}

function metadataHasSafeRequestId(action: DaoTreasuryAction): string | null {
  const metadata = asJsonRecord(action.metadata);
  return typeof metadata.safeTxRequestId === "string" &&
    metadata.safeTxRequestId.trim().length > 0
    ? metadata.safeTxRequestId.trim()
    : null;
}

export async function syncEvmSafeBackedTreasuryActions(options: {
  service: SupabaseServiceRoleClient;
  daoId: string;
  orgId: string;
}): Promise<{
  inspectedCount: number;
  updatedActionIds: string[];
}> {
  const { data, error } = await options.service
    .from("dao_treasury_actions")
    .select("*")
    .eq("dao_id", options.daoId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const actions = (data ?? [])
    .map((row) => daoTreasuryActionSchema.parse(row))
    .filter((action) => metadataHasSafeRequestId(action));

  const updatedActionIds: string[] = [];

  for (const action of actions) {
    const safeTxRequestId = metadataHasSafeRequestId(action);
    if (!safeTxRequestId) {
      continue;
    }

    const safeRequestResult = await options.service
      .from("safe_tx_requests")
      .select("id,status,safe_tx_hash,execution_tx_hash,last_error")
      .eq("id", safeTxRequestId)
      .maybeSingle();

    if (safeRequestResult.error) {
      throw new Error(safeRequestResult.error.message);
    }

    if (!safeRequestResult.data) {
      continue;
    }

    const patch = buildDaoSafeSyncPatch({
      action,
      safeRequest: safeRequestSyncRowSchema.parse(safeRequestResult.data),
    });

    const metadataChanged =
      JSON.stringify(action.metadata ?? {}) !== JSON.stringify(patch.metadata);
    const statusChanged = action.status !== patch.status;
    const txHashChanged = (action.txHash ?? null) !== patch.txHash;
    const errorChanged = (action.lastError ?? null) !== patch.lastError;

    if (!metadataChanged && !statusChanged && !txHashChanged && !errorChanged) {
      continue;
    }

    const updated = await options.service
      .from("dao_treasury_actions")
      .update({
        status: patch.status,
        tx_hash: patch.txHash,
        last_error: patch.lastError,
        metadata: patch.metadata,
      })
      .eq("id", action.id)
      .eq("dao_id", options.daoId)
      .select("*")
      .single();

    if (updated.error) {
      throw new Error(updated.error.message);
    }

    updatedActionIds.push(action.id);

    await options.service.from("dao_activity").insert({
      dao_id: options.daoId,
      org_id: options.orgId,
      actor_user_id: action.requestedByUserId,
      actor_agent_id: action.requestedByAgentId,
      activity_type: "dao.treasury.action.synced",
      title: "Treasury action synced",
      body: `${action.title} synced from Safe status ${patch.metadata.safeStatus}.`,
      chain_family: "evm",
      chain_ref: null,
      tx_hash: patch.txHash,
      metadata: {
        treasuryActionId: action.id,
        safeTxRequestId,
        safeStatus: patch.metadata.safeStatus,
      },
    });
  }

  return {
    inspectedCount: actions.length,
    updatedActionIds,
  };
}
