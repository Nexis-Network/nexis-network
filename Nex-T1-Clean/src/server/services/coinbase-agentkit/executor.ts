import "server-only";

import { logger } from "@/lib/logger";

import { classifyCoinbaseAgentKitAction } from "./action-policy";
import { createUserScopedCoinbaseAgentKit } from "./agent";
import { resolveCoinbaseAgentKitApproval } from "./executor-approval";
import { persistSuccessfulCoinbaseAgentKitExecution } from "./executor-persistence";
import {
  parseCoinbaseAgentKitResult,
  sanitizeCoinbaseAgentKitError,
} from "./result-parser";
import type {
  CoinbaseAgentKitActionLike,
  ExecuteCoinbaseAgentKitActionInput,
  ExecuteCoinbaseAgentKitActionResult,
} from "./executor.types";

function findAction(
  actions: unknown[],
  actionName: string,
): CoinbaseAgentKitActionLike | undefined {
  return actions.find(
    (candidate) =>
      typeof candidate === "object" &&
      candidate !== null &&
      "name" in candidate &&
      typeof candidate.name === "string" &&
      candidate.name.toLowerCase() === actionName.toLowerCase(),
  ) as CoinbaseAgentKitActionLike | undefined;
}

export async function executeCoinbaseAgentKitAction(
  input: ExecuteCoinbaseAgentKitActionInput,
): Promise<ExecuteCoinbaseAgentKitActionResult> {
  const actionArgs = input.args ?? {};
  const policy = classifyCoinbaseAgentKitAction(input.domain, input.actionName);

  try {
    const { agent, allowedActions, walletAddress, chainId } =
      await createUserScopedCoinbaseAgentKit({
        userId: input.userId,
        domains: [input.domain],
        walletAddress: input.walletAddress,
        chainId: input.chainId,
      });

    const action = findAction(agent.getActions(), input.actionName);
    if (!action || !allowedActions.has(action.name)) {
      return {
        status: "error",
        domain: input.domain,
        actionName: input.actionName,
        walletAddress,
        chainId,
        approvalRequired: policy.requiresApproval,
        policy,
        error: `Coinbase AgentKit action "${input.actionName}" is not available in the ${input.domain} domain.`,
      };
    }

    const approval = await resolveCoinbaseAgentKitApproval({
      action,
      actionArgs,
      input: { ...input, chainId },
      policy,
      walletAddress,
    });

    if (approval.rejectionReason) {
      return {
        status: "rejected",
        domain: input.domain,
        actionName: action.name,
        walletAddress,
        chainId,
        approvalId: approval.approvalId,
        approvalRequired: true,
        policy,
        error: approval.rejectionReason,
      };
    }

    const parsedArgs = action.schema.parse(actionArgs);
    const rawResult = await action.invoke(parsedArgs);
    const parsedResult = parseCoinbaseAgentKitResult(rawResult, action.name);
    const result = {
      status: parsedResult.success ? "success" : "error",
      message: parsedResult.message,
      txHash: parsedResult.txHash ?? null,
      address: parsedResult.address ?? null,
      data: parsedResult.data ?? null,
      raw: rawResult,
    } satisfies Record<string, unknown>;

    if (parsedResult.success) {
      await persistSuccessfulCoinbaseAgentKitExecution({
        userId: input.userId,
        chainId,
        domain: input.domain,
        actionArgs,
        actionName: action.name,
        estimatedCostUsd: approval.estimatedCostUsd,
        result,
        walletAddress,
      });
    }

    return {
      status: parsedResult.success ? "success" : "error",
      domain: input.domain,
      actionName: action.name,
      walletAddress,
      chainId,
      approvalId: approval.approvalId,
      approvalRequired: policy.requiresApproval,
      policy,
      result,
      error: parsedResult.success ? undefined : parsedResult.message,
    };
  } catch (error) {
    logger.error(
      {
        domain: "coinbase_agentkit_executor",
        operation: "execute",
        actionName: input.actionName,
        evmDomain: input.domain,
        userId: input.userId,
        walletAddress: input.walletAddress,
        chainId: input.chainId,
        error: error instanceof Error ? error.message : String(error),
      },
      "Coinbase AgentKit execution failed",
    );

    return {
      status: "error",
      domain: input.domain,
      actionName: input.actionName,
      walletAddress: input.walletAddress ?? null,
      chainId: input.chainId ?? null,
      approvalRequired: policy.requiresApproval,
      policy,
      error: sanitizeCoinbaseAgentKitError(error),
    };
  }
}

