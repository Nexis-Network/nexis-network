import "server-only";

import { logger } from "@/lib/logger";
import {
  matchesSupabaseError,
  toSupabaseLogContext,
} from "@/lib/errors/supabase";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";

const DOMAIN = "coinbase_agentkit_repository";

const TABLE_NAMES = {
  transactions: "coinbase_agentkit_transactions",
  deployments: "coinbase_agentkit_deployments",
  positions: "coinbase_agentkit_positions",
  automationTasks: "coinbase_agentkit_automation_tasks",
} as const;

type TableName = (typeof TABLE_NAMES)[keyof typeof TABLE_NAMES];

function isMissingTableError(error: unknown, tableName: TableName): boolean {
  return matchesSupabaseError(error, {
    codes: ["42P01", "PGRST205"],
    messagePatterns: [
      new RegExp(`relation "public\\.${tableName}" does not exist`, "i"),
      new RegExp(`relation "${tableName}" does not exist`, "i"),
      new RegExp(`Could not find the table 'public\\.${tableName}'`, "i"),
    ],
  });
}

function logMissingTable(tableName: TableName, operation: string, error: unknown): void {
  logger.warn(
    {
      domain: DOMAIN,
      operation,
      tableName,
      ...toSupabaseLogContext(error),
    },
    "coinbase-agentkit persistence table unavailable; returning fallback data",
  );
}

export type CoinbaseAgentKitTransactionRecord = {
  id: string;
  user_id: string;
  wallet_address: string | null;
  chain_id: number | null;
  domain: string;
  action_name: string;
  protocol: string | null;
  status: string;
  tx_hash: string | null;
  args: UntypedJson;
  result: UntypedJson;
  estimated_cost_usd: string | null;
  created_at: string;
};

export type CoinbaseAgentKitDeploymentRecord = {
  id: string;
  user_id: string;
  wallet_address: string | null;
  chain_id: number | null;
  domain: string;
  action_name: string;
  protocol: string | null;
  deployment_type: string;
  contract_address: string | null;
  symbol: string | null;
  name: string | null;
  tx_hash: string | null;
  metadata: UntypedJson;
  created_at: string;
};

export type CoinbaseAgentKitPositionRecord = {
  id: string;
  user_id: string;
  wallet_address: string | null;
  chain_id: number | null;
  domain: string;
  action_name: string;
  protocol: string | null;
  position_kind: string;
  symbol: string | null;
  token_address: string | null;
  size: string | null;
  entry_price_usd: string | null;
  current_price_usd: string | null;
  pnl_usd: string | null;
  pnl_percent: string | null;
  status: string;
  metadata: UntypedJson;
  opened_at: string;
  updated_at: string;
};

export type CoinbaseAgentKitAutomationTaskRecord = {
  id: string;
  user_id: string;
  wallet_address: string | null;
  chain_id: number | null;
  name: string;
  action_name: string;
  domain: string;
  interval_seconds: number;
  enabled: boolean;
  parameters: UntypedJson;
  last_run_at: string | null;
  next_run_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

type TransactionInsert = Omit<CoinbaseAgentKitTransactionRecord, "id" | "created_at">;
type DeploymentInsert = Omit<CoinbaseAgentKitDeploymentRecord, "id" | "created_at">;
type PositionInsert = Omit<
  CoinbaseAgentKitPositionRecord,
  "id" | "opened_at" | "updated_at"
> & {
  opened_at?: string;
};
type AutomationTaskUpsert = Omit<
  CoinbaseAgentKitAutomationTaskRecord,
  "id" | "created_at" | "updated_at"
> & {
  id?: string;
};

export async function recordCoinbaseAgentKitTransaction(
  payload: TransactionInsert,
): Promise<void> {
  const client = createServiceRoleClient();
  const { error } = await client.from(TABLE_NAMES.transactions).insert(payload);
  if (!error) return;
  if (isMissingTableError(error, TABLE_NAMES.transactions)) {
    logMissingTable(TABLE_NAMES.transactions, "record_transaction", error);
    return;
  }
  throw new Error(`Failed to record Coinbase AgentKit transaction: ${error.message}`);
}

export async function recordCoinbaseAgentKitDeployment(
  payload: DeploymentInsert,
): Promise<void> {
  const client = createServiceRoleClient();
  const { error } = await client.from(TABLE_NAMES.deployments).insert(payload);
  if (!error) return;
  if (isMissingTableError(error, TABLE_NAMES.deployments)) {
    logMissingTable(TABLE_NAMES.deployments, "record_deployment", error);
    return;
  }
  throw new Error(`Failed to record Coinbase AgentKit deployment: ${error.message}`);
}

export async function recordCoinbaseAgentKitPosition(payload: PositionInsert): Promise<void> {
  const client = createServiceRoleClient();
  const { error } = await client.from(TABLE_NAMES.positions).insert({
    ...payload,
    opened_at: payload.opened_at ?? new Date().toISOString(),
  });
  if (!error) return;
  if (isMissingTableError(error, TABLE_NAMES.positions)) {
    logMissingTable(TABLE_NAMES.positions, "record_position", error);
    return;
  }
  throw new Error(`Failed to record Coinbase AgentKit position: ${error.message}`);
}

export async function upsertCoinbaseAgentKitAutomationTask(
  payload: AutomationTaskUpsert,
): Promise<void> {
  const client = createServiceRoleClient();
  const { error } = await client.from(TABLE_NAMES.automationTasks).upsert(payload);
  if (!error) return;
  if (isMissingTableError(error, TABLE_NAMES.automationTasks)) {
    logMissingTable(TABLE_NAMES.automationTasks, "upsert_automation_task", error);
    return;
  }
  throw new Error(`Failed to upsert Coinbase AgentKit automation task: ${error.message}`);
}

async function listTable<T>(tableName: TableName, userId: string): Promise<T[]> {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from(tableName)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!error) {
    return (data ?? []) as T[];
  }

  if (isMissingTableError(error, tableName)) {
    logMissingTable(tableName, "list_table", error);
    return [];
  }

  throw new Error(`Failed to query ${tableName}: ${error.message}`);
}

export async function listCoinbaseAgentKitTransactions(
  userId: string,
): Promise<CoinbaseAgentKitTransactionRecord[]> {
  return listTable<CoinbaseAgentKitTransactionRecord>(TABLE_NAMES.transactions, userId);
}

export async function listCoinbaseAgentKitDeployments(
  userId: string,
): Promise<CoinbaseAgentKitDeploymentRecord[]> {
  return listTable<CoinbaseAgentKitDeploymentRecord>(TABLE_NAMES.deployments, userId);
}

export async function listCoinbaseAgentKitPositions(
  userId: string,
): Promise<CoinbaseAgentKitPositionRecord[]> {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from(TABLE_NAMES.positions)
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (!error) {
    return (data ?? []) as CoinbaseAgentKitPositionRecord[];
  }

  if (isMissingTableError(error, TABLE_NAMES.positions)) {
    logMissingTable(TABLE_NAMES.positions, "list_positions", error);
    return [];
  }

  throw new Error(`Failed to query ${TABLE_NAMES.positions}: ${error.message}`);
}

export async function listCoinbaseAgentKitAutomationTasks(
  userId: string,
): Promise<CoinbaseAgentKitAutomationTaskRecord[]> {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from(TABLE_NAMES.automationTasks)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!error) {
    return (data ?? []) as CoinbaseAgentKitAutomationTaskRecord[];
  }

  if (isMissingTableError(error, TABLE_NAMES.automationTasks)) {
    logMissingTable(TABLE_NAMES.automationTasks, "list_automation_tasks", error);
    return [];
  }

  throw new Error(`Failed to query ${TABLE_NAMES.automationTasks}: ${error.message}`);
}

export async function getCoinbaseAgentKitAutomationTask(
  userId: string,
  taskId: string,
): Promise<CoinbaseAgentKitAutomationTaskRecord | null> {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from(TABLE_NAMES.automationTasks)
    .select("*")
    .eq("user_id", userId)
    .eq("id", taskId)
    .maybeSingle();

  if (!error) {
    return (data ?? null) as CoinbaseAgentKitAutomationTaskRecord | null;
  }

  if (isMissingTableError(error, TABLE_NAMES.automationTasks)) {
    logMissingTable(TABLE_NAMES.automationTasks, "get_automation_task", error);
    return null;
  }

  throw new Error(`Failed to query ${TABLE_NAMES.automationTasks}: ${error.message}`);
}

export async function deleteCoinbaseAgentKitAutomationTask(
  userId: string,
  taskId: string,
): Promise<void> {
  const client = createServiceRoleClient();
  const { error } = await client
    .from(TABLE_NAMES.automationTasks)
    .delete()
    .eq("user_id", userId)
    .eq("id", taskId);

  if (!error) return;

  if (isMissingTableError(error, TABLE_NAMES.automationTasks)) {
    logMissingTable(TABLE_NAMES.automationTasks, "delete_automation_task", error);
    return;
  }

  throw new Error(`Failed to delete Coinbase AgentKit automation task: ${error.message}`);
}

