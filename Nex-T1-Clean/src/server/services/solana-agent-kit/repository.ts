import "server-only";

import { logger } from "@/lib/logger";
import {
  matchesSupabaseError,
  toSupabaseLogContext,
} from "@/lib/errors/supabase";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";

const DOMAIN = "solana_agentkit_repository";

const TABLE_NAMES = {
  transactions: "solana_agentkit_transactions",
  deployments: "solana_agentkit_deployments",
  positions: "solana_agentkit_positions",
  automationTasks: "solana_agentkit_automation_tasks",
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
    "solana-agentkit persistence table unavailable; returning fallback data",
  );
}

export type SolanaAgentKitTransactionRecord = {
  id: string;
  user_id: string;
  wallet_address: string | null;
  domain: string;
  action_name: string;
  protocol: string | null;
  status: string;
  tx_signature: string | null;
  args: UntypedJson;
  result: UntypedJson;
  estimated_cost_usd: string | null;
  created_at: string;
};

export type SolanaAgentKitDeploymentRecord = {
  id: string;
  user_id: string;
  wallet_address: string | null;
  domain: string;
  action_name: string;
  protocol: string | null;
  deployment_type: string;
  mint: string | null;
  symbol: string | null;
  name: string | null;
  metadata_uri: string | null;
  tx_signature: string | null;
  metadata: UntypedJson;
  created_at: string;
};

export type SolanaAgentKitPositionRecord = {
  id: string;
  user_id: string;
  wallet_address: string | null;
  domain: string;
  action_name: string;
  protocol: string | null;
  position_kind: string;
  symbol: string | null;
  token_mint: string | null;
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

export type SolanaAgentKitAutomationTaskRecord = {
  id: string;
  user_id: string;
  wallet_address: string | null;
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

type TransactionInsert = Omit<SolanaAgentKitTransactionRecord, "id" | "created_at">;
type DeploymentInsert = Omit<SolanaAgentKitDeploymentRecord, "id" | "created_at">;
type PositionInsert = Omit<SolanaAgentKitPositionRecord, "id" | "opened_at" | "updated_at"> & {
  opened_at?: string;
};
type AutomationTaskUpsert = Omit<
  SolanaAgentKitAutomationTaskRecord,
  "id" | "created_at" | "updated_at" | "last_run_at" | "next_run_at" | "last_error"
> & {
  id?: string;
  last_run_at?: string | null;
  next_run_at?: string | null;
  last_error?: string | null;
};

export async function recordSolanaAgentKitTransaction(payload: TransactionInsert): Promise<void> {
  const client = createServiceRoleClient();
  const { error } = await client.from(TABLE_NAMES.transactions).insert(payload);

  if (!error) {
    return;
  }

  if (isMissingTableError(error, TABLE_NAMES.transactions)) {
    logMissingTable(TABLE_NAMES.transactions, "record_transaction", error);
    return;
  }

  throw new Error(`Failed to record Solana AgentKit transaction: ${error.message}`);
}

export async function recordSolanaAgentKitDeployment(payload: DeploymentInsert): Promise<void> {
  const client = createServiceRoleClient();
  const { error } = await client.from(TABLE_NAMES.deployments).insert(payload);

  if (!error) {
    return;
  }

  if (isMissingTableError(error, TABLE_NAMES.deployments)) {
    logMissingTable(TABLE_NAMES.deployments, "record_deployment", error);
    return;
  }

  throw new Error(`Failed to record Solana AgentKit deployment: ${error.message}`);
}

export async function recordSolanaAgentKitPosition(payload: PositionInsert): Promise<void> {
  const client = createServiceRoleClient();
  const { error } = await client.from(TABLE_NAMES.positions).insert({
    ...payload,
    opened_at: payload.opened_at ?? new Date().toISOString(),
  });

  if (!error) {
    return;
  }

  if (isMissingTableError(error, TABLE_NAMES.positions)) {
    logMissingTable(TABLE_NAMES.positions, "record_position", error);
    return;
  }

  throw new Error(`Failed to record Solana AgentKit position: ${error.message}`);
}

export async function upsertSolanaAgentKitAutomationTask(
  payload: AutomationTaskUpsert,
): Promise<void> {
  const client = createServiceRoleClient();
  const { error } = await client.from(TABLE_NAMES.automationTasks).upsert(payload);

  if (!error) {
    return;
  }

  if (isMissingTableError(error, TABLE_NAMES.automationTasks)) {
    logMissingTable(TABLE_NAMES.automationTasks, "upsert_automation_task", error);
    return;
  }

  throw new Error(`Failed to upsert Solana AgentKit automation task: ${error.message}`);
}

export async function getSolanaAgentKitAutomationTask(
  userId: string,
  taskId: string,
): Promise<SolanaAgentKitAutomationTaskRecord | null> {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from(TABLE_NAMES.automationTasks)
    .select("*")
    .eq("user_id", userId)
    .eq("id", taskId)
    .maybeSingle();

  if (!error) {
    return (data ?? null) as SolanaAgentKitAutomationTaskRecord | null;
  }

  if (isMissingTableError(error, TABLE_NAMES.automationTasks)) {
    logMissingTable(TABLE_NAMES.automationTasks, "get_automation_task", error);
    return null;
  }

  throw new Error(`Failed to query ${TABLE_NAMES.automationTasks}: ${error.message}`);
}

export async function deleteSolanaAgentKitAutomationTask(
  userId: string,
  taskId: string,
): Promise<void> {
  const client = createServiceRoleClient();
  const { error } = await client
    .from(TABLE_NAMES.automationTasks)
    .delete()
    .eq("user_id", userId)
    .eq("id", taskId);

  if (!error) {
    return;
  }

  if (isMissingTableError(error, TABLE_NAMES.automationTasks)) {
    logMissingTable(TABLE_NAMES.automationTasks, "delete_automation_task", error);
    return;
  }

  throw new Error(`Failed to delete Solana AgentKit automation task: ${error.message}`);
}

async function selectByUser<TRecord>(tableName: TableName, userId: string): Promise<TRecord[]> {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from(tableName)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!error) {
    return (data ?? []) as TRecord[];
  }

  if (isMissingTableError(error, tableName)) {
    logMissingTable(tableName, "select_by_user", error);
    return [];
  }

  throw new Error(`Failed to query ${tableName}: ${error.message}`);
}

export async function listSolanaAgentKitTransactions(
  userId: string,
): Promise<SolanaAgentKitTransactionRecord[]> {
  return selectByUser<SolanaAgentKitTransactionRecord>(TABLE_NAMES.transactions, userId);
}

export async function listSolanaAgentKitDeployments(
  userId: string,
): Promise<SolanaAgentKitDeploymentRecord[]> {
  return selectByUser<SolanaAgentKitDeploymentRecord>(TABLE_NAMES.deployments, userId);
}

export async function listSolanaAgentKitPositions(
  userId: string,
): Promise<SolanaAgentKitPositionRecord[]> {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from(TABLE_NAMES.positions)
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (!error) {
    return (data ?? []) as SolanaAgentKitPositionRecord[];
  }

  if (isMissingTableError(error, TABLE_NAMES.positions)) {
    logMissingTable(TABLE_NAMES.positions, "list_positions", error);
    return [];
  }

  throw new Error(`Failed to query ${TABLE_NAMES.positions}: ${error.message}`);
}

export async function listSolanaAgentKitAutomationTasks(
  userId: string,
): Promise<SolanaAgentKitAutomationTaskRecord[]> {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from(TABLE_NAMES.automationTasks)
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (!error) {
    return (data ?? []) as SolanaAgentKitAutomationTaskRecord[];
  }

  if (isMissingTableError(error, TABLE_NAMES.automationTasks)) {
    logMissingTable(TABLE_NAMES.automationTasks, "list_automation_tasks", error);
    return [];
  }

  throw new Error(`Failed to query ${TABLE_NAMES.automationTasks}: ${error.message}`);
}

export async function listDueSolanaAgentKitAutomationTasks(
  nowIso: string = new Date().toISOString(),
): Promise<SolanaAgentKitAutomationTaskRecord[]> {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from(TABLE_NAMES.automationTasks)
    .select("*")
    .eq("enabled", true)
    .or(`next_run_at.is.null,next_run_at.lte.${nowIso}`)
    .order("next_run_at", { ascending: true, nullsFirst: true })
    .limit(25);

  if (!error) {
    return (data ?? []) as SolanaAgentKitAutomationTaskRecord[];
  }

  if (isMissingTableError(error, TABLE_NAMES.automationTasks)) {
    logMissingTable(TABLE_NAMES.automationTasks, "list_due_automation_tasks", error);
    return [];
  }

  throw new Error(`Failed to query ${TABLE_NAMES.automationTasks}: ${error.message}`);
}
