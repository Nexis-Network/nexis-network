// Domain: wallets (Safe)
// Responsibility: Create/approve/execute Safe tx requests (unsigned proposals -> MFA+signature -> relayed execution).
// Depends on: Supabase admin, Safe Protocol Kit, Safe API Kit, viem
// Notes:
// - Proposals can be created without signatures (agent/user).
// - Approval requires user MFA (AAL2) and an owner signature over safeTxHash.
// - Execution is relayed by a server signer (gas payer), but Safe enforces signatures.

import SafeApiKit from "@safe-global/api-kit";
import Safe from "@safe-global/protocol-kit";
import type { SafeTransactionData, TransactionResult } from "@safe-global/types-kit";
import { createPublicClient, hashMessage, hexToBytes, http, recoverAddress, type Address } from "viem";

import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { getSafeTargetChains, type SafeChainConfig } from "@/server/services/safe/chains";
import { getSafeRelayerPrivateKey } from "@/server/services/safe/relayer";
import { assertUserOwnsSafeWallet } from "@/server/services/safe/ownership";

export type MetaTransactionData = {
  to: string;
  value: string;
  data: string;
  operation?: number;
};

const OP_CALL = 0;
const OP_DELEGATECALL = 1;

const SAFE_OWNER_ABI = [
  {
    type: "function",
    name: "getOwners",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
] as const;

export type SafeTxRequestRow = {
  id: string;
  user_id: string;
  chain_id: number;
  safe_address: string;
  to_address: string;
  value_wei: string;
  data: string;
  operation: number;
  nonce: string | null;
  safe_tx_hash: string | null;
  owner_signature: string | null;
  created_by: "user" | "agent";
  status: "proposed" | "approved" | "rejected" | "executed" | "failed" | "expired";
  requires_mfa: boolean;
  safe_tx_data: UntypedJson;
  execution_tx_hash: string | null;
  last_error: string | null;
};

function resolveChain(chainId: number): SafeChainConfig {
  const chain = getSafeTargetChains().find((c) => c.chainId === chainId);
  if (!chain) {
    throw new Error(`Unsupported chainId for Safe: ${chainId}`);
  }
  return chain;
}

function ensureHexData(value: string, field: string): string {
  const trimmed = value.trim();
  if (!/^0x[0-9a-fA-F]*$/u.test(trimmed)) {
    throw new Error(`Invalid ${field}: must be 0x-prefixed hex`);
  }
  return trimmed;
}

function ensureAddress(value: string, field: string): Address {
  const trimmed = value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/u.test(trimmed)) {
    throw new Error(`Invalid ${field}: must be 20-byte hex address`);
  }
  return trimmed as Address;
}

function createSafeApiKit(chain: SafeChainConfig) {
  const apiKey = process.env.TX_SERVICE_API_KEY?.trim();
  if (!chain.txServiceUrl) {
    throw new Error(`safe_tx_service_unconfigured:${chain.chainId}`);
  }
  return new SafeApiKit({
    chainId: BigInt(chain.chainId),
    txServiceUrl: chain.txServiceUrl,
    apiKey: apiKey || undefined,
  });
}

async function assertOwnerOnChain(params: { rpcUrl: string; safeAddress: Address; owner: Address }): Promise<void> {
  const client = createPublicClient({ transport: http(params.rpcUrl) });
  const owners = await client.readContract({ address: params.safeAddress, abi: SAFE_OWNER_ABI, functionName: "getOwners" });
  const normalized = owners.map((o) => o.toLowerCase());
  if (!normalized.includes(params.owner.toLowerCase())) {
    throw new Error("owner_not_on_safe");
  }
}

export async function createSafeTxRequest(params: {
  userId: string;
  chainId: number;
  safeAddress: string;
  to: string;
  valueWei: string;
  data: string;
  operation?: number;
  createdBy: "user" | "agent";
  requiresMfa: boolean;
}): Promise<{ requestId: string; safeTxHash: string; safeTxData: UntypedJson; nonce: string }> {
  const chain = resolveChain(params.chainId);
  await assertUserOwnsSafeWallet({
    userId: params.userId,
    chainId: params.chainId,
    safeAddress: params.safeAddress,
    requireReady: true,
  });

  const safeAddress = ensureAddress(params.safeAddress, "safeAddress");
  const to = ensureAddress(params.to, "to");
  const data = ensureHexData(params.data, "data");
  const op = params.operation === OP_DELEGATECALL ? OP_DELEGATECALL : OP_CALL;

  const protocolKit = await Safe.init({
    provider: chain.rpcUrl,
    signer: getSafeRelayerPrivateKey(),
    safeAddress,
  });

  const tx: MetaTransactionData = {
    to,
    value: params.valueWei,
    data,
    operation: op,
  };

  // Let Protocol Kit resolve current Safe nonce (avoids JS number overflow pitfalls).
  const safeTransaction = await protocolKit.createTransaction({ transactions: [tx] });

  const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
  const txData = safeTransaction.data as SafeTransactionData;
  const nonce = txData.nonce;
  const nonceStr = typeof nonce === "number" || typeof nonce === "bigint" ? String(nonce) : "";
  if (!nonceStr) {
    throw new Error("safe_nonce_unavailable");
  }

  const supabase = getSupabaseAdminClient();
  const insert = await supabase
    .from("safe_tx_requests")
    .insert({
      user_id: params.userId,
      chain_id: chain.chainId,
      safe_address: safeAddress,
      to_address: to,
      value_wei: params.valueWei,
      data,
      operation: op,
      nonce: nonceStr,
      safe_tx_hash: safeTxHash,
      safe_tx_data: safeTransaction.data,
      created_by: params.createdBy,
      status: "proposed",
      requires_mfa: params.requiresMfa,
    })
    .select("id")
    .single();

  if (insert.error || !insert.data?.id) {
    throw new Error(insert.error?.message ?? "Failed to create safe tx request");
  }

  return { requestId: insert.data.id, safeTxHash, safeTxData: safeTransaction.data, nonce: nonceStr };
}

export async function createSafeTxRequestFromTransactions(params: {
  userId: string;
  chainId: number;
  safeAddress: string;
  transactions: MetaTransactionData[];
  createdBy: "user" | "agent";
  requiresMfa: boolean;
}): Promise<{ requestId: string; safeTxHash: string; safeTxData: UntypedJson; nonce: string }> {
  const chain = resolveChain(params.chainId);
  await assertUserOwnsSafeWallet({
    userId: params.userId,
    chainId: params.chainId,
    safeAddress: params.safeAddress,
    requireReady: true,
  });
  const safeAddress = ensureAddress(params.safeAddress, "safeAddress");

  const protocolKit = await Safe.init({
    provider: chain.rpcUrl,
    signer: getSafeRelayerPrivateKey(),
    safeAddress,
  });

  const safeTransaction = await protocolKit.createTransaction({ transactions: params.transactions });
  const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
  const txData = safeTransaction.data as SafeTransactionData;
  const nonce = txData.nonce;
  const nonceStr = typeof nonce === "number" || typeof nonce === "bigint" ? String(nonce) : "";
  if (!nonceStr) {
    throw new Error("safe_nonce_unavailable");
  }

  const safeTxData = safeTransaction.data as SafeTransactionData;
  const to = ensureAddress(String(safeTxData.to ?? ""), "to");
  const data = ensureHexData(String(safeTxData.data ?? "0x"), "data");
  const valueWei = String(safeTxData.value ?? "0");
  const operation = typeof safeTxData.operation === "number" ? safeTxData.operation : OP_CALL;

  const supabase = getSupabaseAdminClient();
  const insert = await supabase
    .from("safe_tx_requests")
    .insert({
      user_id: params.userId,
      chain_id: chain.chainId,
      safe_address: safeAddress,
      to_address: to,
      value_wei: valueWei,
      data,
      operation,
      nonce: nonceStr,
      safe_tx_hash: safeTxHash,
      safe_tx_data: safeTxData,
      created_by: params.createdBy,
      status: "proposed",
      requires_mfa: params.requiresMfa,
    })
    .select("id")
    .single();

  if (insert.error || !insert.data?.id) {
    throw new Error(insert.error?.message ?? "Failed to create safe tx request");
  }

  return { requestId: insert.data.id, safeTxHash, safeTxData, nonce: nonceStr };
}

export async function getSafeTxRequestForUser(params: { userId: string; requestId: string }): Promise<SafeTxRequestRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("safe_tx_requests")
    .select(
      "id,user_id,chain_id,safe_address,to_address,value_wei,data,operation,nonce,safe_tx_hash,owner_signature,created_by,status,requires_mfa,safe_tx_data,execution_tx_hash,last_error",
    )
    .eq("id", params.requestId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  return data as UntypedJson as SafeTxRequestRow;
}

export async function approveSafeTxRequest(params: {
  userId: string;
  requestId: string;
  userOwner: string;
  signature: string;
}): Promise<{ safeTxHash: string }> {
  const row = await getSafeTxRequestForUser({ userId: params.userId, requestId: params.requestId });
  if (!row) throw new Error("request_not_found");
  if (row.status !== "proposed") throw new Error(`invalid_status:${row.status}`);

  const safeTxHash = row.safe_tx_hash;
  if (!safeTxHash) throw new Error("missing_safe_tx_hash");

  // The client signs the Safe tx hash bytes using an "eth_sign"-style signature (EIP-191).
  // That means we must verify against hashMessage(rawBytes), not the raw safeTxHash digest.
  const digest = hashMessage({ raw: hexToBytes(safeTxHash as `0x${string}`) });
  const recovered = await recoverAddress({
    hash: digest,
    signature: params.signature as `0x${string}`,
  });
  const expectedOwner = ensureAddress(params.userOwner, "userOwner");
  if (recovered.toLowerCase() !== expectedOwner.toLowerCase()) {
    throw new Error("signature_mismatch");
  }

  const chain = resolveChain(row.chain_id);
  await assertUserOwnsSafeWallet({
    userId: params.userId,
    chainId: row.chain_id,
    safeAddress: row.safe_address,
    requireReady: true,
  });
  await assertOwnerOnChain({
    rpcUrl: chain.rpcUrl,
    safeAddress: ensureAddress(row.safe_address, "safeAddress"),
    owner: expectedOwner,
  });

  return approveSafeTxRequestWithSenderSignature({
    userId: params.userId,
    requestId: params.requestId,
    senderAddress: expectedOwner,
    senderSignature: params.signature,
  });
}

export async function approveSafeTxRequestWithSenderSignature(params: {
  userId: string;
  requestId: string;
  senderAddress: string;
  senderSignature: string;
}): Promise<{ safeTxHash: string }> {
  const row = await getSafeTxRequestForUser({ userId: params.userId, requestId: params.requestId });
  if (!row) throw new Error("request_not_found");
  if (row.status !== "proposed") throw new Error(`invalid_status:${row.status}`);

  const safeTxHash = row.safe_tx_hash;
  if (!safeTxHash) throw new Error("missing_safe_tx_hash");

  const senderAddress = ensureAddress(params.senderAddress, "senderAddress");

  // Propose to Safe Transaction Service (once signed).
  const chain = resolveChain(row.chain_id);
  await assertUserOwnsSafeWallet({
    userId: params.userId,
    chainId: row.chain_id,
    safeAddress: row.safe_address,
    requireReady: true,
  });
  const apiKit = createSafeApiKit(chain);

  if (!row.safe_tx_data || typeof row.safe_tx_data !== "object") {
    throw new Error("missing_safe_tx_data");
  }

  await apiKit.proposeTransaction({
    safeAddress: row.safe_address,
    safeTransactionData: row.safe_tx_data as UntypedJson as SafeTransactionData,
    safeTxHash,
    senderAddress,
    senderSignature: params.senderSignature,
  });

  const supabase = getSupabaseAdminClient();
  const update = await supabase
    .from("safe_tx_requests")
    .update({ owner_signature: params.senderSignature, status: "approved", last_error: null })
    .eq("id", row.id)
    .eq("user_id", params.userId);

  if (update.error) {
    throw new Error(update.error.message);
  }

  return { safeTxHash };
}

export async function executeApprovedSafeTxRequest(params: {
  userId: string;
  requestId: string;
}): Promise<{ txHash: string }> {
  const row = await getSafeTxRequestForUser({ userId: params.userId, requestId: params.requestId });
  if (!row) throw new Error("request_not_found");
  if (row.status !== "approved") throw new Error(`invalid_status:${row.status}`);

  const chain = resolveChain(row.chain_id);
  await assertUserOwnsSafeWallet({
    userId: params.userId,
    chainId: row.chain_id,
    safeAddress: row.safe_address,
    requireReady: true,
  });
  const safeTxHash = row.safe_tx_hash;
  if (!safeTxHash) throw new Error("missing_safe_tx_hash");

  const apiKit = createSafeApiKit(chain);
  const safeTransaction = await apiKit.getTransaction(safeTxHash);

  const protocolKit = await Safe.init({
    provider: chain.rpcUrl,
    signer: getSafeRelayerPrivateKey(),
    safeAddress: row.safe_address,
  });

  const executeTxResponse = await protocolKit.executeTransaction(safeTransaction as Parameters<typeof protocolKit.executeTransaction>[0]) as TransactionResult;

  const transactionResponse = executeTxResponse.transactionResponse as Record<string, UntypedJson> | undefined;
  const txHash = String(executeTxResponse.hash ?? transactionResponse?.hash ?? "");
  if (!txHash) {
    throw new Error("execute_missing_tx_hash");
  }

  const supabase = getSupabaseAdminClient();
  const update = await supabase
    .from("safe_tx_requests")
    .update({ status: "executed", execution_tx_hash: txHash, last_error: null })
    .eq("id", row.id)
    .eq("user_id", params.userId);

  if (update.error) {
    throw new Error(update.error.message);
  }

  return { txHash };
}
