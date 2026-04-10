import { createTool, createToolSchema, stringProp, numberProp, enumProp } from "./create-tool";
import {
  createApprovalRequest,
  waitForApproval,
  type ApprovalPayload,
} from "@/lib/approvals/state-machine";
import { sendFromCdpWallet } from "@/server/services/cdp/wallet-operations";
import { executeCoinbaseAgentKitAction } from "@/server/services/coinbase-agentkit/executor";
import { formatErc20BaseUnitsForAgentKit } from "@/server/services/coinbase-agentkit/token-units";

type CdpWalletSendInput = {
  fromAddress: string;
  toAddress: string;
  amount: string;
  tokenAddress?: string;
  chainId: number;
  platform: "evm" | "solana";
};

const cdpWalletSendSchema = createToolSchema(
  {
    fromAddress: stringProp("The sender's Nex Wallet address."),
    toAddress: stringProp("The recipient address."),
    amount: stringProp("The amount to send as a numeric string (e.g. '0.01' for native, or base units for ERC-20)."),
    tokenAddress: stringProp("The token contract address for ERC-20/SPL transfers. Omit for native currency (ETH, SOL)."),
    chainId: numberProp("The chain ID (e.g. 8453 for Base, 1 for Ethereum)."),
    platform: enumProp("The blockchain platform.", ["evm", "solana"]),
  },
  ["fromAddress", "toAddress", "amount", "chainId", "platform"],
);

function mapCoinbaseAgentKitSendResult(args: {
  approvalId: string;
  agentResult: Awaited<ReturnType<typeof executeCoinbaseAgentKitAction>>;
}) {
  if (args.agentResult.status === "rejected") {
    return {
      status: "rejected" as const,
      approvalRequired: true,
      approvalId: args.approvalId,
      message:
        args.agentResult.error ??
        "Transfer rejected: explicit user confirmation is required.",
    };
  }

  if (args.agentResult.status === "error") {
    return {
      status: "error" as const,
      approvalRequired: true,
      approvalId: args.approvalId,
      error: args.agentResult.error ?? "Unknown error during Nex Wallet send",
    };
  }

  return {
    status: "success" as const,
    txHash:
      typeof args.agentResult.result?.txHash === "string"
        ? args.agentResult.result.txHash
        : null,
    approvalRequired: true,
    approvalId: args.approvalId,
    message:
      typeof args.agentResult.result?.message === "string"
        ? args.agentResult.result.message
        : "Transaction submitted successfully.",
  };
}

export const cdpWalletSendTool = createTool<CdpWalletSendInput>({
  description:
    "Send tokens from the user's Nex Wallet. Supports native currency (ETH, SOL) and ERC-20/SPL tokens. Use this when the user wants to transfer funds from their Nex Wallet.",
  schema: cdpWalletSendSchema,
  execute: async (input, context) => {
    const userId = context?.userId;
    if (!userId) {
      throw new Error("User ID is required to send from a Nex Wallet.");
    }

    const approvalPayload: ApprovalPayload = {
      toolId: "cdp_wallet",
      command: "cdp_wallet_send",
      args: {
        fromAddress: String(input.fromAddress),
        toAddress: String(input.toAddress),
        amount: String(input.amount),
        tokenAddress: input.tokenAddress ? String(input.tokenAddress) : null,
        chainId: Number(input.chainId),
        platform: String(input.platform),
      },
      preview: {
        title: "Nex Wallet transfer",
        description:
          "Approve a token transfer from your Nex Wallet.",
        items: [
          {
            label: "From",
            value: String(input.fromAddress),
            highlight: true,
          },
          {
            label: "To",
            value: String(input.toAddress),
            highlight: true,
          },
          {
            label: "Amount",
            value: String(input.amount),
            highlight: true,
          },
          {
            label: "Token",
            value: input.tokenAddress ? String(input.tokenAddress) : "native",
          },
          {
            label: "Chain ID",
            value: String(input.chainId),
          },
          {
            label: "Platform",
            value: String(input.platform),
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
      if (input.platform === "evm") {
        const mappedAction = input.tokenAddress
          ? "ERC20ActionProvider_transfer"
          : "WalletActionProvider_native_transfer";
        const normalizedAmount = input.tokenAddress
          ? await formatErc20BaseUnitsForAgentKit({
              chainId: input.chainId,
              tokenAddress: input.tokenAddress,
              amount: input.amount,
            })
          : input.amount;
        const mappedArgs = input.tokenAddress
          ? {
              amount: normalizedAmount,
              tokenAddress: input.tokenAddress,
              destinationAddress: input.toAddress,
            }
          : {
              to: input.toAddress,
              value: normalizedAmount,
            };

        const agentResult = await executeCoinbaseAgentKitAction({
          userId,
          domain: "wallet",
          actionName: mappedAction,
          args: mappedArgs,
          walletAddress: input.fromAddress,
          chainId: input.chainId,
          invocationSource:
            typeof context?.metadata?.invocationSource === "string"
              ? context.metadata.invocationSource
              : undefined,
        });

        return mapCoinbaseAgentKitSendResult({
          approvalId: approvalRequest.id,
          agentResult,
        });
      }

      const result = await sendFromCdpWallet(input, userId);

      return {
        status: "success",
        txHash: result.txHash,
        approvalRequired: true,
        approvalId: approvalRequest.id,
        message: `Transaction submitted successfully. Hash: ${result.txHash}`,
      };
    } catch (error: UntypedJson) {
      return {
        status: "error",
        approvalRequired: true,
        approvalId: approvalRequest.id,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during Nex Wallet send",
      };
    }
  },
});
