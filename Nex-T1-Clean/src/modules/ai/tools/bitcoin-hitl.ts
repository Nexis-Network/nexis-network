/**
 * Bitcoin Network Tool with Human-in-the-Loop
 * 
 * Domain: AI Tools - Blockchain Operations
 * Responsibility: Execute Bitcoin and Lightning operations with approval flow
 * Notes: Modernized to use AI SDK 5.0 native tool pattern with JSON Schema.
 */

import { createTool, createToolSchema, enumProp, type ToolExecutionContext } from "./create-tool";
import { ArgsArraySchema, argsArrayToRecord } from "./shared-arg-schemas";
import { defaultBitcoinClient, type BitcoinToolName } from "@/server/services/mcp/bitcoin-client";
import {
  createApprovalRequest,
  waitForApproval,
  getUserAgentSettings,
  shouldAutoApprove,
  autoApproveRequest,
  type ApprovalPayload,
} from "@/lib/approvals/state-machine";
import { resolveHitlUser } from "./hitl-auth";


import { logger } from '@/lib/logger';
// ============================================================================
// CONSTANTS
// ============================================================================

const APPROVAL_REQUIRED_COMMANDS = [
  "send_bitcoin",
  "sign_transaction",
  "create_invoice",
  "pay_invoice",
] as const;

const BITCOIN_COMMANDS = [
  "create_wallet",
  "import_wallet",
  "get_balance",
  "get_address",
  "send_bitcoin",
  "sign_transaction",
  "decode_transaction",
  "create_invoice",
  "pay_invoice",
] as const satisfies readonly BitcoinToolName[];

type BitcoinCommand = (typeof BITCOIN_COMMANDS)[number];

// ============================================================================
// TYPES
// ============================================================================

interface BitcoinHitlInput {
  command: BitcoinCommand;
  args?: Array<{ key: string; value: UntypedJson }>;
}

interface BitcoinHitlOutput {
  command: string;
  text?: string;
  response?: UntypedJson;
  approved?: boolean;
  autoApproved?: boolean;
  error?: string;
  approvalRequired?: boolean;
  approvalId?: string;
  expiresAt?: string;
  preview?: ApprovalPayload["preview"];
  rejected?: boolean;
  reason?: string;
}

// ============================================================================
// SCHEMA
// ============================================================================

const bitcoinHitlSchema = createToolSchema(
  {
    command: enumProp("Bitcoin/Lightning command to execute", BITCOIN_COMMANDS),
    args: ArgsArraySchema,
  },
  ["command"],
);

// ============================================================================
// HELPERS
// ============================================================================

function generateBitcoinPreview(
  command: string,
  args: Record<string, UntypedJson>,
): ApprovalPayload["preview"] {
  switch (command) {
    case "send_bitcoin": {
      const to = (args.to as string) || (args.address as string) || "Unknown";
      const amount = (args.amount as string | number) || "0";
      const fee = args.fee as string | number | undefined;

      return {
        title: "Send Bitcoin",
        description: "Send BTC to another address.",
        items: [
          { label: "Recipient", value: to, highlight: true },
          { label: "Amount (BTC)", value: amount.toString(), highlight: true },
          ...(fee ? [{ label: "Fee (sats)", value: fee.toString() }] : []),
        ],
        warnings: [
          "Bitcoin transactions are irreversible once confirmed.",
          "Verify the recipient address carefully.",
          "Ensure you have sufficient balance to cover the amount and fee.",
        ],
      };
    }

    case "sign_transaction": {
      const transaction = args.transaction as string | undefined;
      const truncated = transaction ? `${transaction.slice(0, 20)}...` : "Unknown";

      return {
        title: "Sign Bitcoin Transaction",
        description: "Sign a Bitcoin transaction without broadcasting.",
        items: [{ label: "Transaction", value: truncated, highlight: true }],
        warnings: [
          "Signing gives authorization to broadcast this transaction.",
          "Only sign transactions you trust.",
        ],
      };
    }

    case "create_invoice": {
      const amount = (args.amount as string | number) || "0";
      const description = (args.description as string) || (args.memo as string) || "";

      return {
        title: "Create Lightning Invoice",
        description: "Generate a Lightning Network payment request.",
        items: [
          { label: "Amount (sats)", value: amount.toString(), highlight: true },
          ...(description ? [{ label: "Description", value: description }] : []),
        ],
        warnings: ["Invoice can be paid by anyone who has the payment request."],
      };
    }

    default:
      return {
        title: "Bitcoin Operation",
        description: `Execute Bitcoin operation: ${command}`,
        items: Object.entries(args)
          .slice(0, 5)
          .map(([key, value]) => ({
            label: key,
            value: String(value).slice(0, 50),
          })),
      };
  }
}

function sanitizeBitcoinInvocation(command: string, invocation: { text: string; response: UntypedJson }): { text: string; response: UntypedJson } {
  // Wallet creation/import can include seed phrases or other key material in plaintext.
  if (command === "create_wallet" || command === "import_wallet") {
    const addressMatch = invocation.text.match(/\b(bc1[0-9a-z]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/);
    const addressLine = addressMatch ? `Address: ${addressMatch[0]}` : "";
    const safeText = [
      command === "create_wallet" ? "Created Bitcoin wallet." : "Wallet imported.",
      addressLine,
      "Keys are stored securely and are not shown in chat. Use Settings → Wallets to manage import/export.",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      text: safeText,
      response: { content: [{ type: "text", text: safeText }] },
    };
  }

  // Defense-in-depth redaction for any accidental key material.
  const redactedText = invocation.text
    .replace(/(mnemonic|seed|private\\s*key|wif)\\s*[:=]\\s*.+/gi, "$1: [REDACTED]")
    .replace(/\b([a-z]{3,}\s+){11,23}[a-z]{3,}\b/gi, "[REDACTED_MNEMONIC]");

  if (redactedText === invocation.text) {
    return invocation;
  }

  return {
    text: redactedText,
    response: { content: [{ type: "text", text: redactedText }] },
  };
}

// ============================================================================
// TOOL
// ============================================================================

export const bitcoinToolWithHITL = createTool<BitcoinHitlInput, BitcoinHitlOutput>({
  description:
    "Execute Bitcoin and Lightning Network operations. Sending Bitcoin and creating invoices require user approval unless autonomous mode is enabled.",
  schema: bitcoinHitlSchema,
  execute: async (input: BitcoinHitlInput, context?: ToolExecutionContext): Promise<BitcoinHitlOutput> => {
    const { command, args } = input;
    const argsRecord = args ? argsArrayToRecord(args) : {};
    const invocationSource =
      typeof context?.metadata?.invocationSource === "string" && context.metadata.invocationSource.trim()
        ? context.metadata.invocationSource.trim()
        : "chat";
    const isInteractive = invocationSource === "chat";

    if (command === "import_wallet") {
      return {
        command,
        rejected: true,
        reason: "Wallet import is not available in chat. Use Settings → Wallets to import keys.",
      };
    }

    const requiresApproval = APPROVAL_REQUIRED_COMMANDS.includes(
      command as (typeof APPROVAL_REQUIRED_COMMANDS)[number],
    );

    if (requiresApproval) {
      const auth = await resolveHitlUser("Authentication required for Bitcoin operations");
      if ("error" in auth) {
        return { command, error: auth.error.errorText };
      }

      const userId = auth.userId;
      const settings = await getUserAgentSettings(userId);
      const preview = generateBitcoinPreview(command, argsRecord);

      // Estimate cost in USD (simplified - would need BTC/USD price feed)
      const estimatedCostUsd = command === "send_bitcoin" ? "50.00" : "1.00";

      const autoApprove = !isInteractive && shouldAutoApprove(settings, estimatedCostUsd);

      if (autoApprove) {
        const approvalId = await autoApproveRequest(userId, {
          toolId: "bitcoin_network",
          command,
          args: argsRecord,
          preview,
        });

        logger.debug(`[Bitcoin] Auto-approved: ${approvalId}`);

        const invocation = await defaultBitcoinClient.invokeRaw(command, argsRecord);

        if (!invocation.ok) {
          return { command, error: invocation.text };
        }

        const sanitized = sanitizeBitcoinInvocation(command, invocation);
        return {
          command,
          text: sanitized.text,
          response: sanitized.response,
          approved: true,
          autoApproved: true,
        };
      }

      // Create approval request
      const approvalRequest = await createApprovalRequest(userId, {
        toolId: "bitcoin_network",
        command,
        args: argsRecord,
        preview,
      });

      // Wait for approval
      const decision = await waitForApproval(approvalRequest.id, userId);

      if (!decision.approved) {
        return {
          command,
          rejected: true,
          reason: decision.reason || "User declined the Bitcoin operation",
        };
      }
    }

    // Execute command
    const invocation = await defaultBitcoinClient.invokeRaw(command, argsRecord);

    if (!invocation.ok) {
      return { command, error: invocation.text };
    }

    const sanitized = sanitizeBitcoinInvocation(command, invocation);
    return {
      command,
      text: sanitized.text,
      response: sanitized.response,
      approved: requiresApproval,
      autoApproved: false,
    };
  },
});

// Export schema for backward compatibility
export { bitcoinHitlSchema };
