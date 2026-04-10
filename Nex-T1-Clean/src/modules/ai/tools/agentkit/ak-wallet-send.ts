/**
 * AgentKit-backed Wallet Send Tool
 *
 * Drop-in replacement for cdp-wallet-send.ts.
 * Same tool ID, same HITL approval flow, but routes execution
 * through AgentKit's native_transfer / erc20.transfer actions.
 */
import { createTool, createToolSchema, stringProp, numberProp, enumProp } from "../create-tool";
import {
  createApprovalRequest,
  waitForApproval,
  type ApprovalPayload,
} from "@/lib/approvals/state-machine";
import { getAgentKitInstance } from "@/server/services/agentkit";
import { parseAgentKitResult, sanitizeToolError } from "@/server/services/agentkit/result-parser";
import { logger } from "@/lib/logger";

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

export const cdpWalletSendTool = createTool<CdpWalletSendInput>({
  description:
    "Send tokens from the user's Nex Wallet. Supports native currency (ETH, SOL) and ERC-20/SPL tokens. Use this when the user wants to transfer funds from their Nex Wallet.",
  schema: cdpWalletSendSchema,
  execute: async (input, context) => {
    const userId = context?.userId;
    if (!userId) {
      throw new Error("User ID is required to send from a Nex Wallet.");
    }

    // Verify fromAddress belongs to the authenticated user
    try {
      const { getSupabaseAdminClient } = await import(
        "@/server/services/supabase/supabase-admin"
      );
      const supabase = getSupabaseAdminClient();
      const normalizedFrom = input.fromAddress.toLowerCase().replace(/[^a-f0-9x]/g, "");
      const { count } = await supabase
        .from("wallet_accounts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("address", normalizedFrom);

      if (!count || count === 0) {
        return {
          status: "error",
          error: "Wallet address does not belong to the authenticated user.",
          approvalRequired: false,
        };
      }
    } catch (err) {
      logger.error("ak_wallet_send_ownership_check_failed", {
        error: err instanceof Error ? err.message : String(err),
        address: input.fromAddress,
        userId,
      });
      return {
        status: "error",
        error: "Failed to verify wallet ownership.",
        approvalRequired: false,
      };
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
        description: "Approve a token transfer from your Nex Wallet.",
        items: [
          { label: "From", value: String(input.fromAddress), highlight: true },
          { label: "To", value: String(input.toAddress), highlight: true },
          { label: "Amount", value: String(input.amount), highlight: true },
          { label: "Token", value: input.tokenAddress ? String(input.tokenAddress) : "native" },
          { label: "Chain ID", value: String(input.chainId) },
          { label: "Platform", value: String(input.platform) },
        ],
        warnings: ["This action moves value on-chain and requires explicit approval."],
      },
    };

    const approvalRequest = await createApprovalRequest(userId, approvalPayload);
    const decision = await waitForApproval(approvalRequest.id, userId);

    if (!decision.approved) {
      return {
        status: "rejected",
        approvalRequired: true,
        approvalId: approvalRequest.id,
        message: decision.reason ?? "Transfer rejected: explicit user confirmation is required.",
      };
    }

    try {
      const instance = await getAgentKitInstance();
      if (!instance) {
        // Fallback: AgentKit not configured, delegate to CDP service directly
        const { sendFromCdpWallet } = await import("@/server/services/cdp/wallet-operations");
        const result = await sendFromCdpWallet(input, userId);
        return {
          status: "success",
          txHash: result.txHash,
          approvalRequired: true,
          approvalId: approvalRequest.id,
          message: `Transaction submitted successfully. Hash: ${result.txHash}`,
          backend: "cdp-direct",
        };
      }

      // Route through AgentKit
      const isNativeTransfer = !input.tokenAddress;
      const actionName = isNativeTransfer ? "native_transfer" : "transfer";
      const actions = instance.getActions() as Array<{ name: string; invoke: (i: unknown, a: unknown) => Promise<string> }>;
      const action = actions.find((a) => a.name === actionName);

      if (!action) {
        logger.warn("agentkit_action_not_found", { actionName, available: actions.map((a) => a.name) });
        // Fallback to CDP direct
        const { sendFromCdpWallet } = await import("@/server/services/cdp/wallet-operations");
        const result = await sendFromCdpWallet(input, userId);
        return {
          status: "success",
          txHash: result.txHash,
          approvalRequired: true,
          approvalId: approvalRequest.id,
          message: `Transaction submitted successfully. Hash: ${result.txHash}`,
          backend: "cdp-direct-fallback",
        };
      }

      const agentKitArgs = isNativeTransfer
        ? { to: input.toAddress, amount: input.amount }
        : { to: input.toAddress, amount: input.amount, tokenAddress: input.tokenAddress };

      const rawResult = await action.invoke(instance, agentKitArgs);
      const parsed = parseAgentKitResult(rawResult, actionName);

      return {
        status: parsed.success ? "success" : "error",
        txHash: parsed.txHash,
        approvalRequired: true,
        approvalId: approvalRequest.id,
        message: parsed.message,
        backend: "agentkit",
      };
    } catch (error: unknown) {
      const rawErr = error instanceof Error ? error.message : "Unknown error during Nex Wallet send";
      logger.error("ak_wallet_send_failed", { error: rawErr, userId });
      return {
        status: "error",
        approvalRequired: true,
        approvalId: approvalRequest.id,
        error: sanitizeToolError(error),
      };
    }
  },
});
