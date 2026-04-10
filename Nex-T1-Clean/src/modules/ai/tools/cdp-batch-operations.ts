/**
 * CDP Batch Operations AI Tool
 *
 * Exposes EVM Smart Account batched UserOperations to the AI chat system.
 * Enables multi-step on-chain operations (approve+swap, multi-send, etc.)
 * in a single atomic transaction.
 *
 * Requires HITL (Human-in-the-Loop) approval before execution.
 * Displays a preview of all calls with targets, values, and data payloads
 * for the user to review before confirming.
 */

import {
  createTool,
  createToolSchema,
  stringProp,
  numberProp,
  arrayProp,
  objectProp,
} from "./create-tool";
import {
  createApprovalRequest,
  waitForApproval,
  type ApprovalPayload,
} from "@/lib/approvals/state-machine";
import {
  executeBatchUserOperation,
  type BatchCall,
} from "@/server/services/cdp/batch-operations";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BatchOperationInput = {
  walletAddress: string;
  chainId: number;
  calls: Array<{
    to: string;
    value?: string;
    data?: string;
  }>;
};

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const cdpBatchSchema = createToolSchema(
  {
    walletAddress: stringProp(
      "The EVM Smart Account address (0x-prefixed) that will execute the batched operation.",
    ),
    chainId: numberProp(
      "The EVM chain ID (e.g. 8453 for Base, 1 for Ethereum, 42161 for Arbitrum, 10 for Optimism).",
    ),
    calls: arrayProp(
      "Array of calls to batch into a single UserOperation. Each call has a target address, optional ETH value (in wei), and optional calldata.",
      objectProp(
        "A single call within the batch.",
        {
          to: stringProp("Target contract or recipient address (0x-prefixed)."),
          value: stringProp(
            "ETH value in wei as a string. Defaults to '0' if omitted.",
          ),
          data: stringProp(
            "Hex-encoded calldata (0x-prefixed). Omit for simple ETH transfers.",
          ),
        },
        ["to"],
      ),
      { minItems: 1, maxItems: 20 },
    ),
  },
  ["walletAddress", "chainId", "calls"],
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a single call for display in the approval preview.
 */
function formatCallPreview(
  call: { to: string; value?: string; data?: string },
  index: number,
): Array<{ label: string; value: string; highlight?: boolean }> {
  const items: Array<{ label: string; value: string; highlight?: boolean }> = [
    {
      label: `Call ${index + 1} - To`,
      value: call.to,
      highlight: true,
    },
  ];

  if (call.value && call.value !== "0") {
    // Convert wei to ETH for display
    const weiAmount = BigInt(call.value);
    const ethWhole = weiAmount / 1_000_000_000_000_000_000n;
    const ethFraction = weiAmount % 1_000_000_000_000_000_000n;
    const ethDisplay =
      ethFraction > 0n
        ? `${ethWhole}.${ethFraction.toString().padStart(18, "0").replace(/0+$/, "")} ETH`
        : `${ethWhole} ETH`;

    items.push({
      label: `Call ${index + 1} - Value`,
      value: `${call.value} wei (${ethDisplay})`,
      highlight: true,
    });
  }

  if (call.data && call.data !== "0x") {
    // Show function selector (first 4 bytes) for readability
    const selector = call.data.slice(0, 10);
    const dataLength = Math.floor((call.data.length - 2) / 2);
    items.push({
      label: `Call ${index + 1} - Data`,
      value: `${selector}... (${dataLength} bytes)`,
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Tool Definition
// ---------------------------------------------------------------------------

export const cdpBatchOperationsTool = createTool<BatchOperationInput>({
  description:
    "Execute multiple EVM operations in a single atomic transaction using Smart Account batching (ERC-4337 UserOperation). " +
    "Use this for multi-step operations like approve+swap, multi-send to multiple recipients, approve+stake, or approve+bridge. " +
    "All calls succeed or all revert together. Requires user approval before execution.",
  schema: cdpBatchSchema,
  execute: async (input, context) => {
    const userId = context?.userId;
    if (!userId) {
      throw new Error("User ID is required to execute batch operations.");
    }

    // Validate calls have proper structure
    const calls: BatchCall[] = input.calls.map((call) => ({
      to: String(call.to),
      value: call.value ? String(call.value) : undefined,
      data: call.data ? String(call.data) : undefined,
    }));

    // Build approval preview items
    const previewItems: Array<{
      label: string;
      value: string;
      highlight?: boolean;
    }> = [
      {
        label: "Smart Account",
        value: String(input.walletAddress),
        highlight: true,
      },
      {
        label: "Chain ID",
        value: String(input.chainId),
      },
      {
        label: "Total Calls",
        value: String(calls.length),
        highlight: true,
      },
    ];

    // Add per-call preview details
    for (let i = 0; i < calls.length; i++) {
      const callItems = formatCallPreview(calls[i], i);
      previewItems.push(...callItems);
    }

    // Calculate total ETH value across all calls
    let totalValueWei = 0n;
    for (const call of calls) {
      if (call.value) {
        totalValueWei += BigInt(call.value);
      }
    }

    if (totalValueWei > 0n) {
      const ethWhole = totalValueWei / 1_000_000_000_000_000_000n;
      const ethFraction = totalValueWei % 1_000_000_000_000_000_000n;
      const totalEthDisplay =
        ethFraction > 0n
          ? `${ethWhole}.${ethFraction.toString().padStart(18, "0").replace(/0+$/, "")} ETH`
          : `${ethWhole} ETH`;

      previewItems.push({
        label: "Total ETH Value",
        value: `${totalValueWei.toString()} wei (${totalEthDisplay})`,
        highlight: true,
      });
    }

    // Create HITL approval request
    const approvalPayload: ApprovalPayload = {
      toolId: "cdp_wallet",
      command: "cdp_batch_user_operation",
      args: {
        walletAddress: String(input.walletAddress),
        chainId: Number(input.chainId),
        calls: calls.map((c) => ({
          to: c.to,
          value: c.value ?? "0",
          data: c.data ?? "0x",
        })),
      },
      preview: {
        title: "Batched Smart Account Operation",
        description: `Execute ${calls.length} operation${calls.length > 1 ? "s" : ""} in a single atomic transaction on your Nex Wallet (EVM).`,
        items: previewItems,
        warnings: [
          "This action executes multiple on-chain operations atomically. All calls succeed or all revert.",
          "Review each call carefully before approving.",
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
          "Batch operation rejected: explicit user confirmation is required.",
      };
    }

    // Execute the batch operation
    try {
      const result = await executeBatchUserOperation(
        {
          walletAddress: String(input.walletAddress),
          calls,
          chainId: Number(input.chainId),
        },
        userId,
      );

      return {
        status: "success",
        userOpHash: result.userOpHash,
        callCount: calls.length,
        callResults: result.callResults,
        approvalRequired: true,
        approvalId: approvalRequest.id,
        message: `Batched UserOperation submitted successfully with ${calls.length} call${calls.length > 1 ? "s" : ""}. UserOp Hash: ${result.userOpHash}`,
      };
    } catch (error: UntypedJson) {
      return {
        status: "error",
        approvalRequired: true,
        approvalId: approvalRequest.id,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during batch operation execution",
      };
    }
  },
});
