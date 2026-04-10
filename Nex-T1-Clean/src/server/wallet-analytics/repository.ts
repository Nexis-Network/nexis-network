import type { SupabaseServerClient } from "@/server/services/supabase/server";
import { getErrorMessage } from "@/lib/utils/error";
import {
  type WalletAccountUpsert,
  type WalletAccountRecord,
  type WalletPositionUpsert,
  type WalletPositionSnapshotInsert,
  type WalletTransactionInsert,
} from "./types";

type UpsertOptions = {
  returning?: "minimal" | "representation";
};

function ensureArray<T>(items: ReadonlyArray<T> | T[]): T[] {
  return Array.isArray(items) ? [...items] : [];
}

export async function upsertWalletAccounts(
  client: SupabaseServerClient,
  accounts: WalletAccountUpsert[],
  options: UpsertOptions = {},
): Promise<WalletAccountRecord[]> {
  const payload = ensureArray(accounts).map((account) => ({
    user_id: account.userId,
    wallet_id: account.walletId,
    address: account.address,
    chain_id: account.chainId ?? null,
    platform: account.platform ?? null,
    wallet_type: account.walletType ?? null,
    provider: account.provider ?? null,
    metadata: account.metadata ?? {},
    updated_at: new Date().toISOString(),
  }));

  if (payload.length === 0) {
    return [];
  }

  const upsertQuery = client.from("wallet_accounts").upsert(payload, {
    onConflict: "user_id,wallet_id",
  });

  const shouldReturn = (options.returning ?? "minimal") === "representation";
  const { data, error } = await (shouldReturn ? upsertQuery.select("*") : upsertQuery);

  if (error) {
    throw new Error(`Failed to upsert wallet accounts: ${error.message}`);
  }

  if (!shouldReturn || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    walletId: row.wallet_id as string,
    address: row.address as string,
    chainId: typeof row.chain_id === "number" ? row.chain_id : null,
    platform: row.platform ?? null,
    walletType: row.wallet_type ?? null,
    provider: row.provider ?? null,
    metadata: (row.metadata as Record<string, UntypedJson>) ?? {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function upsertWalletPositions(
  client: SupabaseServerClient,
  positions: WalletPositionUpsert[],
  _options: UpsertOptions = {},
): Promise<void> {
  const payload = ensureArray(positions).map((position) => ({
    account_id: position.accountId,
    asset_type: position.assetType,
    chain_id: position.chainId ?? null,
    contract_address: position.contractAddress ?? null,
    token_id: position.tokenId ?? null,
    symbol: position.symbol ?? null,
    name: position.name ?? null,
    decimals: position.decimals ?? null,
    quantity: position.quantity,
    quantity_usd: position.quantityUsd ?? null,
    cost_basis_usd: position.costBasisUsd ?? null,
    unrealized_pnl_usd: position.unrealizedPnlUsd ?? null,
    last_price_usd: position.lastPriceUsd ?? null,
    price_change_24h: position.priceChange24h ?? null,
    metadata: position.metadata ?? {},
    updated_at: new Date().toISOString(),
  }));

  if (payload.length === 0) {
    return;
  }

  const { error } = await client.from("wallet_positions").upsert(payload, {
    onConflict: "account_id,asset_type,contract_address,token_id",
  });

  if (error) {
    throw new Error(`Failed to upsert wallet positions: ${error.message}`);
  }
}

export async function insertWalletPositionSnapshots(
  client: SupabaseServerClient,
  snapshots: WalletPositionSnapshotInsert[],
): Promise<void> {
  const payload = ensureArray(snapshots).map((snapshot) => ({
    account_id: snapshot.accountId,
    asset_type: snapshot.assetType,
    chain_id: snapshot.chainId ?? null,
    contract_address: snapshot.contractAddress ?? null,
    token_id: snapshot.tokenId ?? null,
    symbol: snapshot.symbol ?? null,
    snapshot_at: snapshot.snapshotAt ?? new Date().toISOString(),
    quantity: snapshot.quantity,
    quantity_usd: snapshot.quantityUsd ?? null,
    cost_basis_usd: snapshot.costBasisUsd ?? null,
    unrealized_pnl_usd: snapshot.unrealizedPnlUsd ?? null,
    realized_pnl_usd: snapshot.realizedPnlUsd ?? null,
    metadata: snapshot.metadata ?? {},
  }));

  if (payload.length === 0) {
    return;
  }

  const { error } = await client.from("wallet_position_history").insert(payload);

  if (error) {
    throw new Error(`Failed to insert wallet position history: ${error.message}`);
  }
}

export async function insertWalletTransactions(
  client: SupabaseServerClient,
  transactions: WalletTransactionInsert[],
): Promise<void> {
  const payload = ensureArray(transactions).map((tx) => ({
    account_id: tx.accountId,
    chain_id: tx.chainId ?? null,
    hash: tx.hash ?? null,
    log_index: typeof tx.logIndex === "number" ? tx.logIndex : null,
    direction: tx.direction,
    asset_type: tx.assetType,
    contract_address: tx.contractAddress ?? null,
    token_id: tx.tokenId ?? null,
    quantity: tx.quantity ?? null,
    amount_usd: tx.amountUsd ?? null,
    fee_usd: tx.feeUsd ?? null,
    realized_pnl_usd: tx.realizedPnlUsd ?? null,
    counterparty: tx.counterparty ?? null,
    source: tx.source ?? null,
    metadata: tx.metadata ?? {},
    occurred_at: tx.occurredAt,
    imported_at: new Date().toISOString(),
  }));

  if (payload.length === 0) {
    return;
  }

  const { error } = await client.from("wallet_transactions").upsert(payload, {
    onConflict: "account_id,hash,log_index",
  });

  if (error) {
    throw new Error(`Failed to insert wallet transactions: ${error.message}`);
  }
}

export function createWalletAnalyticsError(message: string, error: UntypedJson) {
  return new Error(`${message}: ${getErrorMessage(error, "unknown error")}`, {
    cause: error instanceof Error ? error : undefined,
  });
}
