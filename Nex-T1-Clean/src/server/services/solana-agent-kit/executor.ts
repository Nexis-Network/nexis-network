import "server-only";

import { executeAction } from "solana-agent-kit";

import { logger } from "@/lib/logger";

import { classifySolanaAgentKitAction } from "./action-policy";
import { createUserScopedSolanaAgentKit } from "./agent";
import { resolveActionApproval } from "./executor-approval";
import { persistSuccessfulExecution } from "./executor-persistence";
import type {
  ExecuteSolanaAgentKitActionInput,
  ExecuteSolanaAgentKitActionResult,
  SolanaAgentKitActionLike,
} from "./executor.types";

function isSuccessfulResult(result: Record<string, unknown>): boolean {
  return String(result.status ?? "").toLowerCase() === "success";
}

function findAction(
  actions: unknown[],
  normalizedActionName: string,
): SolanaAgentKitActionLike | undefined {
  return actions.find(
    (candidate) =>
      typeof candidate === "object" &&
      candidate !== null &&
      "name" in candidate &&
      typeof candidate.name === "string" &&
      candidate.name.toUpperCase() === normalizedActionName,
  ) as SolanaAgentKitActionLike | undefined;
}

export async function executeSolanaAgentKitAction(
  input: ExecuteSolanaAgentKitActionInput,
): Promise<ExecuteSolanaAgentKitActionResult> {
  const actionArgs = input.args ?? {};
  const normalizedActionName = input.actionName.trim().toUpperCase();
  const policy = classifySolanaAgentKitAction(input.domain, normalizedActionName);

  const { agent, walletAddress } = await createUserScopedSolanaAgentKit({
    userId: input.userId,
    walletAddress: input.walletAddress,
    domains: [input.domain],
  });

  if (policy.requiresWallet && !walletAddress) {
    return {
      status: "error",
      domain: input.domain,
      actionName: normalizedActionName,
      walletAddress: null,
      approvalRequired: policy.requiresApproval,
      policy,
      error: "Provision a Solana Nex Wallet before attempting Solana AgentKit write actions.",
    };
  }

  const action = findAction(agent.actions, normalizedActionName);

  if (!action) {
    return {
      status: "error",
      domain: input.domain,
      actionName: normalizedActionName,
      walletAddress,
      approvalRequired: policy.requiresApproval,
      policy,
      error: `Solana AgentKit action "${normalizedActionName}" is not available in the ${input.domain} domain.`,
    };
  }

  const approval = await resolveActionApproval({
    action,
    actionArgs,
    input: { ...input, actionName: normalizedActionName },
    policy,
    walletAddress,
  });

  if (approval.rejectionReason) {
    return {
      status: "rejected",
      domain: input.domain,
      actionName: normalizedActionName,
      walletAddress,
      approvalId: approval.approvalId,
      approvalRequired: true,
      policy,
      error: approval.rejectionReason,
    };
  }

  try {
    const result = (await executeAction(
      action as Parameters<typeof executeAction>[0],
      agent,
      actionArgs,
    )) as Record<string, unknown>;

    if (isSuccessfulResult(result)) {
      await persistSuccessfulExecution({
        userId: input.userId,
        domain: input.domain,
        actionName: normalizedActionName,
        walletAddress,
        actionArgs,
        result,
        estimatedCostUsd: approval.estimatedCostUsd,
      });
    }

    const status = isSuccessfulResult(result) ? "success" : "error";

    return {
      status,
      domain: input.domain,
      actionName: normalizedActionName,
      walletAddress,
      approvalId: approval.approvalId,
      approvalRequired: policy.requiresApproval,
      policy,
      result,
      error: status === "success"
        ? undefined
        : typeof result.message === "string"
          ? result.message
          : "Solana AgentKit execution failed.",
    };
  } catch (error) {
    logger.error(
      {
        domain: "solana_agentkit_executor",
        operation: "execute",
        actionName: normalizedActionName,
        solanaDomain: input.domain,
        userId: input.userId,
        walletAddress,
        error: error instanceof Error ? error.message : String(error),
      },
      "Solana AgentKit execution failed",
    );

    return {
      status: "error",
      domain: input.domain,
      actionName: normalizedActionName,
      walletAddress,
      approvalId: approval.approvalId,
      approvalRequired: policy.requiresApproval,
      policy,
      error:
        error instanceof Error ? error.message : "Solana AgentKit execution failed.",
    };
  }
}
