import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { extractZeroExSwapInstructions } from "@/lib/agents/execution/interpreter";
import { executeZeroExSwapInstruction } from "@/lib/agents/execution/zeroex-executor";
import type { ExecutedTrade, StrategyExecutionContext, ZeroExSwapInstruction } from "@/lib/agents/execution/types";
import type { StrategySnapshot } from "@/lib/strategies/types";

export async function loadStrategyExecutionContext(agentId: string): Promise<{
  context: StrategyExecutionContext;
  instructions: ZeroExSwapInstruction[];
}> {
  const supabase = createServiceRoleClient();

  const { data: agentRow, error: agentError } = await supabase
    .from("agent")
    .select("id, org_id")
    .eq("id", agentId)
    .maybeSingle();
  if (agentError) throw agentError;
  if (!agentRow) {
    throw new Error(`Agent ${agentId} not found`);
  }

  const { data: versionRow, error: versionError } = await supabase
    .from("agent_version")
    .select("id")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (versionError) throw versionError;
  if (!versionRow) {
    throw new Error(`Agent ${agentId} has no versions`);
  }

  const { data: snapshotRow, error: snapshotError } = await supabase
    .from("agent_strategy_snapshot")
    .select("id, workflow, summary")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (snapshotError) throw snapshotError;
  if (!snapshotRow) {
    throw new Error(`Agent ${agentId} has no strategy snapshot`);
  }

  const snapshot: StrategySnapshot = {
    templateId: undefined,
    blocklyXml: "",
    workflow: snapshotRow.workflow as StrategySnapshot["workflow"],
    summary: snapshotRow.summary as StrategySnapshot["summary"],
  };

  const instructions = extractZeroExSwapInstructions(snapshot);

  const context: StrategyExecutionContext = {
    agentId,
    agentVersionId: versionRow.id,
    orgId: agentRow.org_id as string,
    strategySnapshotId: snapshotRow.id,
    snapshot,
  };

  return { context, instructions };
}

export async function executeLatestStrategy(agentId: string): Promise<ExecutedTrade[]> {
  const { context, instructions } = await loadStrategyExecutionContext(agentId);
  if (instructions.length === 0) {
    return [];
  }

  const results: ExecutedTrade[] = [];
  for (const instruction of instructions) {
    const trade = await executeZeroExSwapInstruction(context, instruction);
    results.push(trade);
  }

  return results;
}
