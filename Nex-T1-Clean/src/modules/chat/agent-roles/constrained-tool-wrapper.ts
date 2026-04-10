import type { Tool, ToolExecutionOptions } from "ai";
import { logger } from "@/lib/logger";
import type { AgentRole } from "./tool-access-map";

export type CommandRestriction = {
  toolName: string;
  role: AgentRole;
  allowedCommands: ReadonlySet<string>;
};

/**
 * Default command restrictions for multi-command tools per role.
 * The market_analyst role can only use read-only EVM wallet commands.
 */
export const DEFAULT_COMMAND_RESTRICTIONS: readonly CommandRestriction[] = [
  {
    toolName: "evm_wallet",
    role: "market_analyst",
    allowedCommands: new Set([
      "wallet_get_balance",
      "wallet_get_address",
      "wallet_list",
      "provider_get_block",
      "provider_get_transaction",
      "provider_get_balance",
    ]),
  },
  {
    toolName: "helius_solana",
    role: "market_analyst",
    allowedCommands: new Set([
      "helius_get_token_price",
      "helius_get_token_holders",
      "helius_get_token_metadata",
      "helius_get_wallet_balances",
      "helius_search_assets",
    ]),
  },
];

/**
 * Wraps a tool to restrict which commands can be executed based on role.
 * Only applies to tools that accept a `command` field in their input.
 */
export function wrapToolWithCommandRestriction(
  toolName: string,
  originalTool: Tool,
  role: AgentRole,
): Tool {
  const restriction = DEFAULT_COMMAND_RESTRICTIONS.find(
    (r) => r.toolName === toolName && r.role === role,
  );

  if (!restriction || !originalTool.execute) {
    return originalTool;
  }

  const wrappedExecute = async (
    input: unknown,
    options: ToolExecutionOptions,
  ) => {
    const inputObj = input as Record<string, unknown> | null;
    const command =
      typeof inputObj?.command === "string" ? inputObj.command : "";

    if (command && !restriction.allowedCommands.has(command)) {
      logger.warn("[constrained-tool] Blocked restricted command", {
        toolName,
        command,
        role,
      });
      return {
        error: `Command "${command}" is not available for the current agent role.`,
        allowedCommands: Array.from(restriction.allowedCommands),
      };
    }

    return originalTool.execute!(input, options);
  };

  return {
    ...originalTool,
    execute: wrappedExecute,
  };
}
