import "server-only";

import {
  autoApproveRequest,
  createApprovalRequest,
  getUserAgentSettings,
  shouldAutoApprove,
  waitForApproval,
} from "@/lib/approvals/state-machine";

import { buildApprovalPayload, inferEstimatedCostUsd } from "./executor-preview";
import type { ExecuteSolanaAgentKitActionInput, SolanaAgentKitActionLike, SolanaAgentKitActionPolicy } from "./executor.types";

type ApprovalResolution = {
  approvalId?: string;
  estimatedCostUsd?: string;
  rejectionReason?: string;
};

function getInvocationSessionId(invocationSource?: string): string | undefined {
  return typeof invocationSource === "string" ? invocationSource : undefined;
}

export async function resolveActionApproval(args: {
  action: SolanaAgentKitActionLike;
  actionArgs: Record<string, UntypedJson>;
  input: ExecuteSolanaAgentKitActionInput;
  policy: SolanaAgentKitActionPolicy;
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
    actionName: args.input.actionName.trim().toUpperCase(),
    domain: args.input.domain,
    estimatedCostUsd,
    operationType: args.policy.autonomousAction,
    walletAddress: args.walletAddress,
  });

  const canAutoApprove =
    estimatedCostUsd !== undefined &&
    shouldAutoApprove(
      settings,
      estimatedCostUsd,
      "solana",
      args.policy.autonomousAction,
    );

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
        rejectionReason: decision.reason ?? "The Solana AgentKit action was not approved.",
      };
}
