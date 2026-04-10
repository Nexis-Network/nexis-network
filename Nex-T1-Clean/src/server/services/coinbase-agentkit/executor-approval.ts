import "server-only";

import {
  autoApproveRequest,
  createApprovalRequest,
  getUserAgentSettings,
  shouldAutoApprove,
  waitForApproval,
} from "@/lib/approvals/state-machine";

import { buildApprovalPayload, inferEstimatedCostUsd } from "./executor-preview";
import type {
  CoinbaseAgentKitActionLike,
  CoinbaseAgentKitActionPolicy,
  ExecuteCoinbaseAgentKitActionInput,
} from "./executor.types";

type ApprovalResolution = {
  approvalId?: string;
  estimatedCostUsd?: string;
  rejectionReason?: string;
};

function getInvocationSessionId(invocationSource?: string): string | undefined {
  return typeof invocationSource === "string" ? invocationSource : undefined;
}

export async function resolveCoinbaseAgentKitApproval(args: {
  action: CoinbaseAgentKitActionLike;
  actionArgs: Record<string, UntypedJson>;
  input: ExecuteCoinbaseAgentKitActionInput;
  policy: CoinbaseAgentKitActionPolicy;
  walletAddress: string | null;
}): Promise<ApprovalResolution> {
  const estimatedCostUsd = inferEstimatedCostUsd(args.actionArgs);

  if (!args.policy.requiresApproval) {
    return { estimatedCostUsd };
  }

  const settings = await getUserAgentSettings(args.input.userId);
  const approvalPayload = buildApprovalPayload({
    actionArgs: args.actionArgs,
    actionDescription: args.action.description,
    actionName: args.input.actionName,
    chainId: args.input.chainId ?? null,
    domain: args.input.domain,
    estimatedCostUsd,
    operationType: args.policy.autonomousAction,
    walletAddress: args.walletAddress,
  });

  const canAutoApprove =
    args.policy.autonomousAllowed &&
    estimatedCostUsd !== undefined &&
    shouldAutoApprove(settings, estimatedCostUsd, "evm", args.policy.autonomousAction);

  if (canAutoApprove) {
    const approvalId = await autoApproveRequest(args.input.userId, approvalPayload, {
      sessionId: getInvocationSessionId(args.input.invocationSource),
    });

    return { approvalId, estimatedCostUsd };
  }

  const request = await createApprovalRequest(args.input.userId, approvalPayload, 60, {
    sessionId: getInvocationSessionId(args.input.invocationSource),
  });
  const decision = await waitForApproval(request.id, args.input.userId);

  return decision.approved
    ? { approvalId: request.id, estimatedCostUsd }
    : {
        approvalId: request.id,
        estimatedCostUsd,
        rejectionReason:
          decision.reason ?? "The Coinbase AgentKit action was not approved.",
      };
}

