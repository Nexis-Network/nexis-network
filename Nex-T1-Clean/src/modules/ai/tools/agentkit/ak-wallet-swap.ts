/**
 * AgentKit-backed Wallet Swap Tool
 *
 * Drop-in replacement for cdp-wallet-swap.ts.
 * Same tool ID, same HITL approval flow. Routes execution
 * through AgentKit's swap action with CDP fallback.
 */
import { createTool, createToolSchema, stringProp, numberProp } from "../create-tool";
import {
  createApprovalRequest,
  waitForApproval,
  type ApprovalPayload,
} from "@/lib/approvals/state-machine";
import { getAgentKitInstance } from "@/server/services/agentkit";
import { parseAgentKitResult, sanitizeToolError } from "@/server/services/agentkit/result-parser";
import { logger } from "@/lib/logger";

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

export const cdpWalletSwapTool = createTool<CdpWalletSwapInput>({
  description:
    "Execute a token swap on the user's Nex Wallet. Supports EVM chains with CDP swap liquidity (Base, Ethereum, Arbitrum, Optimism). Use this when the user wants to swap tokens.",
  schema: cdpWalletSwapSchema,
  execute: async (input, context) => {
    const userId = context?.userId;
    if (!userId) {
      throw new Error("User ID is required to execute a Nex Wallet swap.");
    }

    // Verify walletAddress belongs to the authenticated user
    try {
      const { getSupabaseAdminClient } = await import(
        "@/server/services/supabase/supabase-admin"
      );
      const supabase = getSupabaseAdminClient();
      const normalizedAddr = input.walletAddress.toLowerCase().replace(/[^a-f0-9x]/g, "");
      const { count } = await supabase
        .from("wallet_accounts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("address", normalizedAddr);

      if (!count || count === 0) {
        return {
          status: "error",
          error: "Wallet address does not belong to the authenticated user.",
          approvalRequired: false,
        };
      }
    } catch (err) {
      logger.error("ak_wallet_swap_ownership_check_failed", {
        error: err instanceof Error ? err.message : String(err),
        address: input.walletAddress,
        userId,
      });
      return {
        status: "error",
        error: "Failed to verify wallet ownership.",
        approvalRequired: false,
      };
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
        description: "Approve a token swap on your Nex Wallet.",
        items: [
          { label: "Wallet", value: String(input.walletAddress), highlight: true },
          { label: "From Token", value: String(input.fromToken), highlight: true },
          { label: "To Token", value: String(input.toToken), highlight: true },
          { label: "Amount (base units)", value: String(input.amount), highlight: true },
          { label: "Chain ID", value: String(input.chainId) },
          { label: "Slippage", value: slippageDisplay },
        ],
        warnings: ["This action executes a swap on-chain and requires explicit approval."],
      },
    };

    const approvalRequest = await createApprovalRequest(userId, approvalPayload);
    const decision = await waitForApproval(approvalRequest.id, userId);

    if (!decision.approved) {
      return {
        status: "rejected",
        approvalRequired: true,
        approvalId: approvalRequest.id,
        message: decision.reason ?? "Swap rejected: explicit user confirmation is required.",
      };
    }

    try {
      const instance = await getAgentKitInstance();
      if (!instance) {
        // Fallback to CDP direct
        const { executeCdpSwap } = await import("@/server/services/cdp/wallet-operations");
        const result = await executeCdpSwap(input, userId);
        return {
          status: "success",
          txHash: result.txHash,
          fromAmount: result.fromAmount,
          toAmount: result.toAmount,
          approvalRequired: true,
          approvalId: approvalRequest.id,
          message: `Swap executed successfully. Hash: ${result.txHash}`,
          backend: "cdp-direct",
        };
      }

      // Route through AgentKit
      const actions = instance.getActions() as Array<{ name: string; invoke: (i: unknown, a: unknown) => Promise<string> }>;
      const swapAction = actions.find((a) => a.name === "swap");

      if (!swapAction) {
        logger.warn("agentkit_swap_action_not_found", { available: actions.map((a) => a.name) });
        const { executeCdpSwap } = await import("@/server/services/cdp/wallet-operations");
        const result = await executeCdpSwap(input, userId);
        return {
          status: "success",
          txHash: result.txHash,
          fromAmount: result.fromAmount,
          toAmount: result.toAmount,
          approvalRequired: true,
          approvalId: approvalRequest.id,
          message: `Swap executed successfully. Hash: ${result.txHash}`,
          backend: "cdp-direct-fallback",
        };
      }

      const agentKitArgs = {
        fromToken: input.fromToken,
        toToken: input.toToken,
        amount: input.amount,
        ...(input.slippageBps != null ? { slippageBps: input.slippageBps } : {}),
      };

      const rawResult = await swapAction.invoke(instance, agentKitArgs);
      const parsed = parseAgentKitResult(rawResult, "swap");

      return {
        status: parsed.success ? "success" : "error",
        txHash: parsed.txHash,
        amount: parsed.amount,
        token: parsed.token,
        approvalRequired: true,
        approvalId: approvalRequest.id,
        message: parsed.message,
        backend: "agentkit",
      };
    } catch (error: unknown) {
      const rawErr = error instanceof Error ? error.message : "Unknown error during Nex Wallet swap";
      logger.error("ak_wallet_swap_failed", { error: rawErr, userId });
      return {
        status: "error",
        approvalRequired: true,
        approvalId: approvalRequest.id,
        error: sanitizeToolError(error),
      };
    }
  },
});
