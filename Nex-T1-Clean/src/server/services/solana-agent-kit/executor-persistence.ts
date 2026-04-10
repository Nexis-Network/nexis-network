import "server-only";

import { logger } from "@/lib/logger";

import { inferProtocol } from "./executor-preview";
import type { SolanaAgentKitDomain } from "./plugin-registry";
import {
  recordSolanaAgentKitDeployment,
  recordSolanaAgentKitPosition,
  recordSolanaAgentKitTransaction,
} from "./repository";

type PersistSuccessfulExecutionArgs = {
  userId: string;
  domain: SolanaAgentKitDomain;
  actionName: string;
  walletAddress: string | null;
  actionArgs: Record<string, UntypedJson>;
  result: Record<string, unknown>;
  estimatedCostUsd?: string;
};

const POSITION_ACTION_PATTERN = /(STAKE|LEND|PERP|POOL|WHIRLPOOL|VAULT)/;

function extractTxSignature(result: Record<string, unknown>): string | null {
  const candidates = [
    result.signature,
    result.transactionSignature,
    result.txSignature,
    result.txHash,
    result.hash,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function extractText(result: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = result[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function stringifyValue(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

function resolvePositionKind(normalizedActionName: string): string {
  if (normalizedActionName.includes("PERP")) {
    return "perpetual";
  }

  if (normalizedActionName.includes("LEND")) {
    return "lending";
  }

  if (normalizedActionName.includes("STAKE")) {
    return "staking";
  }

  return "liquidity";
}

function logPersistenceFailure(operation: string, actionName: string, error: unknown): void {
  logger.warn(
    {
      domain: "solana_agentkit_executor",
      operation,
      actionName,
      error: error instanceof Error ? error.message : String(error),
    },
    `failed to ${operation.replaceAll("_", " ")} for Solana AgentKit execution`,
  );
}

function capturePersistence<T>(operation: string, actionName: string, promise: Promise<T>): Promise<void> {
  return promise
    .then(() => undefined)
    .catch((error) => {
      logPersistenceFailure(operation, actionName, error);
    });
}

export async function persistSuccessfulExecution(
  args: PersistSuccessfulExecutionArgs,
): Promise<void> {
  const normalizedActionName = args.actionName.toUpperCase();
  const protocol = inferProtocol(args.domain, args.actionName);
  const txSignature = extractTxSignature(args.result);
  const tasks: Promise<void>[] = [
    capturePersistence(
      "record_transaction",
      args.actionName,
      recordSolanaAgentKitTransaction({
        user_id: args.userId,
        wallet_address: args.walletAddress,
        domain: args.domain,
        action_name: args.actionName,
        protocol,
        status: String(args.result.status ?? "success"),
        tx_signature: txSignature,
        args: args.actionArgs,
        result: args.result,
        estimated_cost_usd: args.estimatedCostUsd ?? null,
      }),
    ),
  ];

  if (normalizedActionName.includes("DEPLOY") || normalizedActionName.includes("LAUNCH") || normalizedActionName.includes("MINT_NFT")) {
    tasks.push(
      capturePersistence(
        "record_deployment",
        args.actionName,
        recordSolanaAgentKitDeployment({
          user_id: args.userId,
          wallet_address: args.walletAddress,
          domain: args.domain,
          action_name: args.actionName,
          protocol,
          deployment_type: normalizedActionName.includes("NFT") ? "nft" : "token",
          mint: extractText(args.result, ["mint", "mintAddress", "tokenAddress"]),
          symbol: extractText(args.result, ["symbol", "ticker"]),
          name: extractText(args.result, ["name", "collectionName"]),
          metadata_uri: extractText(args.result, ["metadataUri", "uri"]),
          tx_signature: txSignature,
          metadata: args.result,
        }),
      ),
    );
  }

  if (POSITION_ACTION_PATTERN.test(normalizedActionName)) {
    tasks.push(
      capturePersistence(
        "record_position",
        args.actionName,
        recordSolanaAgentKitPosition({
          user_id: args.userId,
          wallet_address: args.walletAddress,
          domain: args.domain,
          action_name: args.actionName,
          protocol,
          position_kind: resolvePositionKind(normalizedActionName),
          symbol:
            extractText(args.result, ["symbol", "ticker"]) ??
            stringifyValue(args.actionArgs.symbol),
          token_mint:
            extractText(args.result, ["mint", "mintAddress", "tokenAddress"]) ??
            stringifyValue(args.actionArgs.tokenMint) ??
            stringifyValue(args.actionArgs.mint),
          size: stringifyValue(args.actionArgs.amount) ?? stringifyValue(args.actionArgs.size),
          entry_price_usd: stringifyValue(args.actionArgs.entryPriceUsd),
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
