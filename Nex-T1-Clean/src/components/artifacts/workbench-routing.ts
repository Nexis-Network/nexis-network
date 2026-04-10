import type { AIEvent } from "@/lib/schema";

const WORKBENCH_TOOL_NAMES = new Set([
  "emit_artifact",
  "e2b_code_interpreter",
  "openai_code_interpreter",
  "e2b_write_file",
  "e2b_read_file",
  "e2b_list_dir",
  "e2b_npm_install",
  "e2b_npm_run",
  "e2b_get_preview_url",
  "sandbox",
  "terminal",
  "execute_command",
  "run_terminal",
  "bash",
  "simulate_transaction",
  "evm_wallet",
  "helius_solana",
  "cdp_wallet_send",
  "cdp_wallet_swap",
  "cdp_batch_operations",
  "polymarket_markets",
  "polymarket_orderbook",
  "polymarket_positions",
  "polymarket_trade",
  "polymarket_bridge",
]);

const WORKBENCH_EVENT_TYPES = new Set([
  "sandbox_start",
  "sandbox_stream",
  "terminal_stream",
  "jsx_output",
  "web_preview_output",
  "test_result",
]);

export function isWorkbenchToolName(
  toolName: string | null | undefined,
): boolean {
  return Boolean(toolName && WORKBENCH_TOOL_NAMES.has(toolName));
}

export function shouldRenderSandboxWorkbench(
  activeTool: UntypedJson | null | undefined,
  activeEvent: AIEvent | null | undefined,
): boolean {
  const toolName =
    activeTool &&
    typeof activeTool === "object" &&
    typeof (activeTool as { toolName?: unknown }).toolName === "string"
      ? ((activeTool as { toolName: string }).toolName as string)
      : null;

  return Boolean(
    isWorkbenchToolName(toolName) ||
      (activeEvent && WORKBENCH_EVENT_TYPES.has(activeEvent.type)),
  );
}
