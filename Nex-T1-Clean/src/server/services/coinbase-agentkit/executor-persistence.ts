import "server-only";

import { logger } from "@/lib/logger";

import { inferProtocol } from "./executor-preview";
import type { CoinbaseAgentKitDomain } from "./catalog";
import {
  recordCoinbaseAgentKitDeployment,
  recordCoinbaseAgentKitPosition,
  recordCoinbaseAgentKitTransaction,
} from "./repository";

type PersistSuccessfulExecutionArgs = {
  userId: string;
  chainId: number | null;
  domain: CoinbaseAgentKitDomain;
  actionArgs: Record<string, UntypedJson>;
  actionName: string;
  estimatedCostUsd?: string;
  result: Record<string, unknown>;
  walletAddress: string | null;
};

const POSITION_ACTIONS = /(CompoundActionProvider|MorphoActionProvider|WethActionProvider)/;
const DEPLOYMENT_ACTIONS = /(create_token|clank_token|flaunch|mint|register_basename)/i;

function extractTxHash(result: Record<string, unknown>): string | null {
  const candidates = [result.txHash, result.hash, result.transactionHash];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

function stringifyValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

function capturePersistence<T>(
  operation: string,
  actionName: string,
  promise: Promise<T>,
): Promise<void> {
  return promise.then(() => undefined).catch((error) => {
    logger.warn(
      {
        domain: "coinbase_agentkit_executor",
        operation,
        actionName,
        error: error instanceof Error ? error.message : String(error),
      },
      "failed to persist Coinbase AgentKit execution",
    );
  });
}

export async function persistSuccessfulCoinbaseAgentKitExecution(
  args: PersistSuccessfulExecutionArgs,
): Promise<void> {
  const protocol = inferProtocol(args.domain, args.actionName);
  const txHash = extractTxHash(args.result);
  const tasks: Promise<void>[] = [
    capturePersistence(
      "record_transaction",
      args.actionName,
      recordCoinbaseAgentKitTransaction({
        user_id: args.userId,
        wallet_address: args.walletAddress,
        chain_id: args.chainId,
        domain: args.domain,
        action_name: args.actionName,
        protocol,
        status: String(args.result.status ?? "success"),
        tx_hash: txHash,
        args: args.actionArgs,
        result: args.result,
        estimated_cost_usd: args.estimatedCostUsd ?? null,
      }),
    ),
  ];

  if (DEPLOYMENT_ACTIONS.test(args.actionName)) {
    tasks.push(
      capturePersistence(
        "record_deployment",
        args.actionName,
        recordCoinbaseAgentKitDeployment({
          user_id: args.userId,
          wallet_address: args.walletAddress,
          chain_id: args.chainId,
          domain: args.domain,
          action_name: args.actionName,
          protocol,
          deployment_type:
            args.actionName === "BasenameActionProvider_register_basename"
              ? "basename"
              : args.actionName.includes("mint")
                ? "nft"
                : "token",
          contract_address:
            stringifyValue(args.actionArgs.tokenAddress) ??
            stringifyValue(args.result.contractAddress) ??
            stringifyValue(args.result.address),
          symbol: stringifyValue(args.result.symbol) ?? stringifyValue(args.actionArgs.symbol),
          name:
            stringifyValue(args.result.name) ??
            stringifyValue(args.actionArgs.name) ??
            stringifyValue(args.actionArgs.basename),
          tx_hash: txHash,
          metadata: args.result,
        }),
      ),
    );
  }

  if (POSITION_ACTIONS.test(args.actionName)) {
    tasks.push(
      capturePersistence(
        "record_position",
        args.actionName,
        recordCoinbaseAgentKitPosition({
          user_id: args.userId,
          wallet_address: args.walletAddress,
          chain_id: args.chainId,
          domain: args.domain,
          action_name: args.actionName,
          protocol,
          position_kind:
            args.actionName.includes("WethActionProvider") ? "wrapped" : "lending",
          symbol:
            stringifyValue(args.actionArgs.assetId) ??
            stringifyValue(args.result.symbol) ??
            null,
          token_address:
            stringifyValue(args.actionArgs.tokenAddress) ??
            stringifyValue(args.result.tokenAddress) ??
            null,
          size:
            stringifyValue(args.actionArgs.amount) ??
            stringifyValue(args.actionArgs.assets) ??
            stringifyValue(args.actionArgs.amountToWrap) ??
            stringifyValue(args.actionArgs.amountToUnwrap),
          entry_price_usd: stringifyValue(args.actionArgs.estimatedCostUsd),
          current_price_usd: stringifyValue(args.result.currentPriceUsd),
          pnl_usd: stringifyValue(args.result.pnlUsd),
          pnl_percent: stringifyValue(args.result.pnlPercent),
          status: "open",
          metadata: args.result,
        }),
      ),
    );
  }

  await Promise.allSettled(tasks);
}

