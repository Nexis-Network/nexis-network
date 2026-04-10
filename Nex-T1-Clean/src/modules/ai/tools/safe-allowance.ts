import { createTool, createToolSchema, numberProp, stringProp } from "./create-tool";
import {
  createApprovalRequest,
  waitForApproval,
  type ApprovalPayload,
} from "@/lib/approvals/state-machine";
import { executeAllowanceTransfer } from "@/server/services/safe/allowance-executor";

type SafeAllowanceInput = {
  chainId: number;
  safeAddress: string;
  token?: string;
  to: string;
  amountWei: string;
};

const safeAllowanceSchema = createToolSchema(
  {
    chainId: numberProp("The chain ID where the Safe wallet is deployed."),
    safeAddress: stringProp("The address of the Safe wallet."),
    token: stringProp("The address of the token to transfer. Leave empty for native currency (ETH/MATIC/etc)."),
    to: stringProp("The recipient address."),
    amountWei: stringProp("The amount to transfer in Wei (base units)."),
  },
  ["chainId", "safeAddress", "to", "amountWei"]
);

export const safeAllowanceTool = createTool<SafeAllowanceInput>({
  description: "Execute a transaction from a Safe smart wallet using the Agent Allowance Module. Use this when the user asks to spend funds from their Safe wallet.",
  schema: safeAllowanceSchema,
  execute: async (input, context) => {
    const userId = context?.userId;
    if (!userId) {
      throw new Error("User ID is required to execute Safe transactions.");
    }

    const approvalPayload: ApprovalPayload = {
      toolId: "evm_wallet",
      command: "wallet_send_transaction",
      args: {
        chainId: Number(input.chainId),
        safeAddress: String(input.safeAddress),
        token: input.token ? String(input.token) : null,
        to: String(input.to),
        amountWei: String(input.amountWei),
        source: "safe_allowance",
        invocationSource:
          typeof context?.metadata?.invocationSource === "string"
            ? String(context.metadata.invocationSource)
            : "unknown",
      },
      preview: {
        title: "Safe allowance transfer",
        description:
          "Approve transfer from your Safe smart account allowance policy.",
        items: [
          {
            label: "Chain ID",
            value: String(input.chainId),
          },
          {
            label: "Safe",
            value: String(input.safeAddress),
            highlight: true,
          },
          {
            label: "Recipient",
            value: String(input.to),
            highlight: true,
          },
          {
            label: "Amount (wei)",
            value: String(input.amountWei),
            highlight: true,
          },
          {
            label: "Token",
            value: input.token ? String(input.token) : "native",
          },
        ],
        warnings: [
          "This action moves value on-chain and requires explicit approval.",
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
          "Transfer rejected: explicit user confirmation is required.",
      };
    }

    try {
      const result = await executeAllowanceTransfer({
        userId,
        chainId: Number(input.chainId),
        safeAddress: String(input.safeAddress),
        tokenAddress: input.token ? String(input.token) : null,
        to: String(input.to),
        amountWei: String(input.amountWei),
      });

      return {
        status: "success",
        txHash: result.txHash,
        approvalRequired: true,
        approvalId: approvalRequest.id,
        message: `Transaction executed successfully. Hash: ${result.txHash}`,
      };
    } catch (error: UntypedJson) {
      return {
        status: "error",
        approvalRequired: true,
        approvalId: approvalRequest.id,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during Safe execution",
      };
    }
  },
});
