import { createTool, createToolSchema, numberProp, stringProp } from "./create-tool";
import {
  createApprovalRequest,
  waitForApproval,
  type ApprovalPayload,
} from "@/lib/approvals/state-machine";

/**
 * CDP Spend Permission Tool for AI Agents
 *
 * Creates a spend permission on the user's Nex Wallet (EVM) that allows
 * an agent spender address to spend a specific token up to a set allowance
 * within a time period.
 *
 * This is the CDP equivalent of the Safe allowance tool but uses
 * on-chain SpendPermission contracts (ERC-7715 style) instead of
 * Safe Modules.
 *
 * Flow:
 * 1. AI agent calls this tool with spender, token, allowance, period
 * 2. Tool creates HITL approval request
 * 3. User approves in UI
 * 4. Server creates the spend permission via CDP API
 * 5. Agent can then spend within the approved limits
 *
 * IMPORTANT: This tool only CREATES the permission. It does NOT execute
 * spends. The agent uses separate transaction tools to spend within limits.
 */

type CdpSpendPermissionInput = {
  spender: string;
  token: string;
  allowance: string;
  periodDays?: number;
  network?: string;
};

const cdpSpendPermissionSchema = createToolSchema(
  {
    spender: stringProp(
      "The address of the agent/spender that will be granted spending permission."
    ),
    token: stringProp(
      "The token to grant permission for. Use 'eth' for native ETH, 'usdc' for USDC, or a 0x-prefixed ERC-20 contract address."
    ),
    allowance: stringProp(
      "The maximum amount the spender can spend per period, in base units (wei for ETH, 6 decimals for USDC)."
    ),
    periodDays: numberProp(
      "The spending period in days. Default is 1 day. The allowance resets each period."
    ),
    network: stringProp(
      "The network for the spend permission. Default is 'base'. Options: 'base', 'base-sepolia'."
    ),
  },
  ["spender", "token", "allowance"]
);

export const cdpSpendPermissionTool = createTool<CdpSpendPermissionInput>({
  description:
    "Create a spend permission on the user's Nex Wallet (EVM) wallet. " +
    "This grants a spender address (e.g., an AI agent wallet) the ability to " +
    "spend a specific token up to a set allowance per time period. " +
    "Use this when the user asks to authorize an agent to spend from their wallet.",
  schema: cdpSpendPermissionSchema,
  execute: async (input, context) => {
    const userId = context?.userId;
    if (!userId) {
      throw new Error("User ID is required to create CDP spend permissions.");
    }

    const periodDays = input.periodDays ?? 1;
    const network = input.network ?? "base";

    const approvalPayload: ApprovalPayload = {
      toolId: "cdp_wallet",
      command: "create_spend_permission",
      args: {
        spender: String(input.spender),
        token: String(input.token),
        allowance: String(input.allowance),
        periodDays,
        network,
        source: "cdp_spend_permission",
        invocationSource:
          typeof context?.metadata?.invocationSource === "string"
            ? String(context.metadata.invocationSource)
            : "unknown",
      },
      preview: {
        title: "Nex Wallet Spend Permission",
        description:
          "Authorize a spender to use funds from your Nex Wallet (EVM) within specified limits.",
        items: [
          {
            label: "Spender",
            value: String(input.spender),
            highlight: true,
          },
          {
            label: "Token",
            value: String(input.token),
          },
          {
            label: "Allowance (base units)",
            value: String(input.allowance),
            highlight: true,
          },
          {
            label: "Period",
            value: `${periodDays} day${periodDays > 1 ? "s" : ""}`,
          },
          {
            label: "Network",
            value: network,
          },
        ],
        warnings: [
          "This creates an on-chain spend permission. The spender will be able to move funds within the specified limits.",
          "Review the spender address carefully before approving.",
        ],
      },
    };

    const approvalRequest = await createApprovalRequest(userId, approvalPayload);
    const decision = await waitForApproval(approvalRequest.id, userId);
    if (!decision.approved) {
      return {
        status: "rejected",
        approvalRequired: true,
        approvalId: approvalRequest.id,
        message:
          decision.reason ??
          "Spend permission rejected: explicit user confirmation is required.",
      };
    }

    // Spend permissions require the user's Smart Account to sign on-chain.
    // After HITL approval, return the permission parameters so the client
    // can execute via useCreateSpendPermission (CDP React SDK).
    return {
      status: "approved",
      approvalRequired: true,
      approvalId: approvalRequest.id,
      permissionParams: {
        spender: input.spender,
        token: input.token,
        allowance: input.allowance,
        periodDays,
        network,
      },
      message:
        "Spend permission approved by user. The client will execute the on-chain transaction via the CDP SDK.",
    };
  },
});
