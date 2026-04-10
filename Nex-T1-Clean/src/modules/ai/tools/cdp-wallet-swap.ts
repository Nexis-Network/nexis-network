import { createTool, createToolSchema, stringProp, numberProp } from "./create-tool";
import {
  createApprovalRequest,
  waitForApproval,
  type ApprovalPayload,
} from "@/lib/approvals/state-machine";
import { executeCdpSwap } from "@/server/services/cdp/wallet-operations";
import { executeCoinbaseAgentKitAction } from "@/server/services/coinbase-agentkit/executor";
import { formatErc20BaseUnitsForAgentKit } from "@/server/services/coinbase-agentkit/token-units";

type CdpWalletSwapInput = {
  walletAddress: string;
  fromToken: string;
  toToken: string;
  amount: string;
  chainId: number;
  slippageBps?: number;
};

const cdpWalletSwapSchema = createToolSchema(
  {
    walletAddress: stringProp("The Nex Wallet address executing the swap."),
    fromToken: stringProp("The contract address of the token to swap from."),
    toToken: stringProp("The contract address of the token to swap to."),
    amount: stringProp("The amount to swap in base units (wei)."),
    chainId: numberProp("The chain ID (e.g. 8453 for Base, 1 for Ethereum, 42161 for Arbitrum, 10 for Optimism)."),
    slippageBps: numberProp("Slippage tolerance in basis points (e.g. 50 = 0.5%). Optional."),
  },
  ["walletAddress", "fromToken", "toToken", "amount", "chainId"],
);

function mapCoinbaseAgentKitSwapResult(args: {
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
        "Swap rejected: explicit user confirmation is required.",
    };
  }

  if (args.agentResult.status === "error") {
    return {
      status: "error" as const,
      approvalRequired: true,
      approvalId: args.approvalId,
      error: args.agentResult.error ?? "Unknown error during Nex Wallet swap",
    };
  }

  const rawData =
    typeof args.agentResult.result?.data === "object" && args.agentResult.result?.data !== null
      ? (args.agentResult.result.data as Record<string, unknown>)
      : null;

  return {
    status: "success" as const,
    txHash:
      typeof args.agentResult.result?.txHash === "string"
        ? args.agentResult.result.txHash
        : rawData && typeof rawData.transactionHash === "string"
          ? rawData.transactionHash
          : null,
    fromAmount:
      rawData && typeof rawData.fromAmount === "string" ? rawData.fromAmount : undefined,
    toAmount:
      rawData && typeof rawData.toAmount === "string" ? rawData.toAmount : undefined,
    approvalRequired: true,
    approvalId: args.approvalId,
    message:
      typeof args.agentResult.result?.message === "string"
        ? args.agentResult.result.message
        : "Swap executed successfully.",
  };
}

export const cdpWalletSwapTool = createTool<CdpWalletSwapInput>({
  description:
    "Execute a token swap on the user's Nex Wallet. Supports EVM chains with CDP swap liquidity (Base, Ethereum, Arbitrum, Optimism). Use this when the user wants to swap tokens.",
  schema: cdpWalletSwapSchema,
  execute: async (input, context) => {
    const userId = context?.userId;
    if (!userId) {
      throw new Error("User ID is required to execute a Nex Wallet swap.");
    }

    const slippageDisplay = input.slippageBps != null
      ? `${(input.slippageBps / 100).toFixed(2)}%`
      : "default";

    const approvalPayload: ApprovalPayload = {
      toolId: "cdp_wallet",
      command: "cdp_wallet_swap",
      args: {
        walletAddress: String(input.walletAddress),
        fromToken: String(input.fromToken),
        toToken: String(input.toToken),
        amount: String(input.amount),
        chainId: Number(input.chainId),
        slippageBps: input.slippageBps ?? null,
      },
      preview: {
        title: "Nex Wallet swap",
        description:
          "Approve a token swap on your Nex Wallet.",
        items: [
          {
            label: "Wallet",
            value: String(input.walletAddress),
            highlight: true,
          },
          {
            label: "From Token",
            value: String(input.fromToken),
            highlight: true,
          },
          {
            label: "To Token",
            value: String(input.toToken),
            highlight: true,
          },
          {
            label: "Amount (base units)",
            value: String(input.amount),
            highlight: true,
          },
          {
            label: "Chain ID",
            value: String(input.chainId),
          },
          {
            label: "Slippage",
            value: slippageDisplay,
          },
        ],
        warnings: [
          "This action executes a swap on-chain and requires explicit approval.",
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
          "Swap rejected: explicit user confirmation is required.",
      };
    }

    try {
      if (input.chainId && [1, 10, 8453, 42161].includes(input.chainId)) {
        const mappedAmount = await formatErc20BaseUnitsForAgentKit({
          chainId: input.chainId,
          tokenAddress: input.fromToken,
          amount: input.amount,
        });

        const agentResult = await executeCoinbaseAgentKitAction({
          userId,
          domain: "wallet",
          actionName: "CdpEvmWalletActionProvider_swap",
          args: {
            fromToken: input.fromToken,
            toToken: input.toToken,
            fromAmount: mappedAmount,
            ...(input.slippageBps != null ? { slippageBps: input.slippageBps } : {}),
          },
          walletAddress: input.walletAddress,
          chainId: input.chainId,
          invocationSource:
            typeof context?.metadata?.invocationSource === "string"
              ? context.metadata.invocationSource
              : undefined,
        });

        return mapCoinbaseAgentKitSwapResult({
          approvalId: approvalRequest.id,
          agentResult,
        });
      }

      const result = await executeCdpSwap(input, userId);

      return {
        status: "success",
        txHash: result.txHash,
        fromAmount: result.fromAmount,
        toAmount: result.toAmount,
        approvalRequired: true,
        approvalId: approvalRequest.id,
        message: `Swap executed successfully. Hash: ${result.txHash}`,
      };
    } catch (error: UntypedJson) {
      return {
        status: "error",
        approvalRequired: true,
        approvalId: approvalRequest.id,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during Nex Wallet swap",
      };
    }
  },
});
