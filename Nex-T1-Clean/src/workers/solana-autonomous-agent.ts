import { config } from "dotenv";

config({ path: ".env.local" });

import { executeSolanaAgentKitAction } from "@/server/services/solana-agent-kit/executor";
import {
  listDueSolanaAgentKitAutomationTasks,
  upsertSolanaAgentKitAutomationTask,
} from "@/server/services/solana-agent-kit/repository";
import type { SolanaAgentKitDomain } from "@/server/services/solana-agent-kit/plugin-registry";

const POLL_INTERVAL_MS = Number(process.env.SOLANA_AGENTKIT_AUTOMATION_POLL_MS ?? 30_000);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeNextRun(intervalSeconds: number): string {
  return new Date(Date.now() + intervalSeconds * 1000).toISOString();
}

async function runAutomationPass(): Promise<void> {
  const tasks = await listDueSolanaAgentKitAutomationTasks();

  if (tasks.length === 0) {
    return;
  }

  console.log(`[solana-autonomous-agent] executing ${tasks.length} task(s)`);

  for (const task of tasks) {
    try {
      await executeSolanaAgentKitAction({
        userId: task.user_id,
        domain: task.domain as SolanaAgentKitDomain,
        actionName: task.action_name,
        walletAddress: task.wallet_address,
        args:
          task.parameters && typeof task.parameters === "object"
            ? (task.parameters as Record<string, UntypedJson>)
            : {},
        invocationSource: "solana-autonomous-agent",
      });

      await upsertSolanaAgentKitAutomationTask({
        id: task.id,
        user_id: task.user_id,
        wallet_address: task.wallet_address,
        name: task.name,
        action_name: task.action_name,
        domain: task.domain,
        interval_seconds: task.interval_seconds,
        enabled: task.enabled,
        parameters: task.parameters,
        last_run_at: new Date().toISOString(),
        next_run_at: computeNextRun(task.interval_seconds),
        last_error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[solana-autonomous-agent] task ${task.id} failed`, message);

      await upsertSolanaAgentKitAutomationTask({
        id: task.id,
        user_id: task.user_id,
        wallet_address: task.wallet_address,
        name: task.name,
        action_name: task.action_name,
        domain: task.domain,
        interval_seconds: task.interval_seconds,
        enabled: task.enabled,
        parameters: task.parameters,
        last_run_at: new Date().toISOString(),
        next_run_at: computeNextRun(task.interval_seconds),
        last_error: message,
      }).catch((persistError) => {
        console.error(
          `[solana-autonomous-agent] failed to persist task error for ${task.id}`,
          persistError,
        );
      });
    }
  }
}

async function main() {
  console.log(`[solana-autonomous-agent] starting poll=${POLL_INTERVAL_MS}ms`);

  const controller = new AbortController();
  const stop = () => controller.abort();

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  while (!controller.signal.aborted) {
    await runAutomationPass().catch((error) => {
      console.error("[solana-autonomous-agent] pass failed", error);
    });

    await sleep(POLL_INTERVAL_MS);
  }

  console.log("[solana-autonomous-agent] stopped");
}

main().catch((error) => {
  console.error("[solana-autonomous-agent] failed to start", error);
  process.exit(1);
});
