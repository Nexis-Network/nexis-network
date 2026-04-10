/**
 * Token Minter Tool with Human-in-the-Loop
 *
 * Domain: AI Tools - Token Operations
 * Responsibility: Deploy and manage ERC-20 tokens with HITL approval flow
 * Depends on: createTool, MCP token-minter client, approval state machine
 * Notes: Modernized to use AI SDK 5.0 native tool pattern with JSON Schema.
 *        Token deployments and transfers require user approval unless autonomous mode.
 */

import {
  createTool,
  createToolSchema,
  stringProp,
  arrayProp,
  objectProp,
  enumProp,
  type ToolExecutionContext,
} from "./create-tool";
import {
  defaultTokenMinterClient,
  type TokenMinterToolName,
} from "@/server/services/mcp/token-minter-client";
import {
  createApprovalRequest,
  waitForApproval,
  type ApprovalPayload,
} from "@/lib/approvals/state-machine";
import { resolveHitlUser } from "./hitl-auth";
import type { JSONSchema7 } from "json-schema";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import {
  assertWithinAllowancePolicy,
  executeAllowanceTransfer,
} from "@/server/services/safe/allowance-executor";
import { createSafeTxRequest } from "@/server/services/safe/tx-requests";
import { emitWalletEvent } from "@/server/notifications/emit";
import { getSafeTargetChains } from "@/server/services/safe/chains";
import {
  createPublicClient,
  encodeFunctionData,
  http,
  parseUnits,
  type Address,
} from "viem";

// ============================================================================
// CONSTANTS
// ============================================================================

const APPROVAL_REQUIRED_COMMANDS = ["deployToken", "transferToken"] as const;

const TOKEN_MINTER_COMMANDS = [
  "deployToken",
  "transferToken",
  "getTransactionInfo",
  "getTokenBalance",
  "getTokenInfo",
  "getBalance",
] as const satisfies readonly TokenMinterToolName[];

const INVOCATION_SOURCE_CHAT = "chat";

const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/u;

const ERC20_ABI = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// ============================================================================
// SCHEMA (JSON Schema)
// ============================================================================

const jsonPrimitiveSchema: JSONSchema7 = {
  oneOf: [
    { type: "string" },
    { type: "number" },
    { type: "boolean" },
    { type: "null" },
  ],
};

const argEntrySchema: JSONSchema7 = objectProp("Argument entry", {
  key: stringProp("Argument name"),
  value: {
    description: "Argument value",
    oneOf: [
      jsonPrimitiveSchema,
      { type: "array", items: jsonPrimitiveSchema },
      {
        type: "array",
        items: objectProp("Key-value pair", {
          key: stringProp("Property name"),
          value: jsonPrimitiveSchema,
        }),
        description: "Nested object as key-value pairs",
      },
    ],
  } as JSONSchema7,
});

const tokenMinterHitlSchema = createToolSchema(
  {
    command: enumProp("Token minter command to execute", TOKEN_MINTER_COMMANDS),
    args: arrayProp("Arguments as key-value pairs", argEntrySchema),
  },
  ["command"]
);

// ============================================================================
// TYPES
// ============================================================================

interface TokenMinterHitlInput {
  command: TokenMinterToolName;
  args?: Array<{ key: string; value: UntypedJson }>;
}

export interface TokenMinterHitlOutput {
  command: TokenMinterToolName;
  text: string;
  response?: UntypedJson;
  approved: boolean;
  autoApproved: boolean;
  rejected?: boolean;
  rejectionReason?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const argsArrayToRecord = (
  args: Array<{ key: string; value: UntypedJson }> | Record<string, UntypedJson>
): Record<string, UntypedJson> => {
  if (!Array.isArray(args)) {
    return args as Record<string, UntypedJson>;
  }

  return args.reduce((acc, { key, value }) => {
    if (
      Array.isArray(value) &&
      value.every(
        (item): item is { key: string; value: UntypedJson } =>
          typeof item === "object" &&
          item !== null &&
          "key" in item &&
          "value" in item
      )
    ) {
      acc[key] = argsArrayToRecord(value);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, UntypedJson>);
};

function ensureAddress(value: UntypedJson, field: string): Address {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!ADDRESS_REGEX.test(trimmed)) {
    throw new Error(`Invalid ${field}: must be 20-byte hex address`);
  }
  return trimmed as Address;
}

function parseChainId(value: UntypedJson): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim() && /^\d+$/u.test(value.trim())) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.trunc(parsed);
    }
  }
  return null;
}

function inferChainIdFromArgs(args: Record<string, UntypedJson>): number | null {
  const direct = parseChainId(args.chainId);
  if (direct) return direct;

  const chain = typeof args.chain === "string" ? args.chain.trim().toLowerCase() : "";
  if (!chain) return null;

  // Minimal slug mapping for common chains (Safe supports only a subset).
  if (chain === "base") return 8453;
  if (chain === "optimism" || chain === "op") return 10;
  if (chain === "bnb" || chain === "bsc" || chain === "bnbchain") return 56;
  return null;
}

function isSensitiveArgKey(key: string): boolean {
  return /private_key|mnemonic|seed_phrase|encrypted_json|(^|_)encrypt(_|$)/i.test(key);
}

function getInvocationSource(context?: ToolExecutionContext): string {
  const raw = context?.metadata?.invocationSource;
  return typeof raw === "string" && raw.trim() ? raw.trim() : INVOCATION_SOURCE_CHAT;
}

async function resolveSafeAddressForUser(params: {
  userId: string;
  chainId: number;
  explicitSafeAddress?: UntypedJson;
}): Promise<Address> {
  if (typeof params.explicitSafeAddress === "string" && params.explicitSafeAddress.trim()) {
    return ensureAddress(params.explicitSafeAddress, "safeAddress");
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("wallet_accounts")
    .select("safe_address,status")
    .eq("user_id", params.userId)
    .eq("wallet_type", "safe")
    .eq("chain_id", params.chainId)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const row = data?.[0] as { safe_address?: string | null; status?: string | null } | undefined;
  const safeAddress = typeof row?.safe_address === "string" ? row.safe_address : null;
  const status = typeof row?.status === "string" ? row.status : null;

  if (!safeAddress || !status || status !== "ready") {
    throw new Error("safe_wallet_not_ready");
  }

  return ensureAddress(safeAddress, "safeAddress");
}

function resolveSafeChainRpcUrl(chainId: number): string {
  const chain = getSafeTargetChains().find((c) => c.chainId === chainId);
  if (!chain) {
    throw new Error(`Unsupported chainId for Safe operations: ${chainId}`);
  }
  return chain.rpcUrl;
}

async function resolveErc20Decimals(params: { chainId: number; tokenAddress: Address }): Promise<number> {
  const rpcUrl = resolveSafeChainRpcUrl(params.chainId);
  const client = createPublicClient({ transport: http(rpcUrl) });

  const decimals = await client.readContract({
    address: params.tokenAddress,
    abi: ERC20_ABI,
    functionName: "decimals",
    args: [],
  });

  const normalized = typeof decimals === "number" ? decimals : Number(decimals);
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 255) {
    throw new Error("invalid_token_decimals");
  }
  return normalized;
}

async function resolveTokenAmountWei(params: {
  chainId: number;
  tokenAddress: Address;
  amount: UntypedJson;
  amountWei?: UntypedJson;
}): Promise<string> {
  const rawWei = typeof params.amountWei === "string" ? params.amountWei.trim() : "";
  if (rawWei && /^\d+$/u.test(rawWei)) {
    return rawWei;
  }

  const rawAmount =
    typeof params.amount === "string" ? params.amount.trim() : typeof params.amount === "number" ? String(params.amount) : "";
  if (!rawAmount) {
    throw new Error("missing_amount");
  }

  if (/^\d+$/u.test(rawAmount)) {
    // Back-compat: treat integer strings as wei.
    return rawAmount;
  }

  const decimals = await resolveErc20Decimals({ chainId: params.chainId, tokenAddress: params.tokenAddress });
  const wei = parseUnits(rawAmount, decimals);
  return wei.toString(10);
}

async function proposeSafeErc20Transfer(params: {
  userId: string;
  chainId: number;
  safeAddress: Address;
  tokenAddress: Address;
  to: Address;
  amountWei: string;
  createdBy: "user" | "agent";
  requiresMfa: boolean;
}): Promise<{ requestId: string; safeTxHash: string; nonce: string }> {
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [params.to, BigInt(params.amountWei)],
  });

  const out = await createSafeTxRequest({
    userId: params.userId,
    chainId: params.chainId,
    safeAddress: params.safeAddress,
    to: params.tokenAddress,
    valueWei: "0",
    data,
    createdBy: params.createdBy,
    requiresMfa: params.requiresMfa,
  });

  void emitWalletEvent({
    user_id: params.userId,
    chain_id: params.chainId,
    safe_address: params.safeAddress,
    event_type: "safe_tx_proposed",
    status: "info",
    title: "Safe transaction proposed",
    body: `Proposed token transfer to ${params.to} (${params.amountWei} wei).`,
    metadata: {
      requestId: out.requestId,
      safeTxHash: out.safeTxHash,
      safeAddress: params.safeAddress,
      tokenAddress: params.tokenAddress,
      to: params.to,
      amountWei: params.amountWei,
      createdBy: params.createdBy,
    },
  });

  void emitWalletEvent({
    user_id: params.userId,
    chain_id: params.chainId,
    safe_address: params.safeAddress,
    event_type: "safe_tx_approval_requested",
    status: "info",
    title: "Approval requested",
    body: "A Safe transaction requires your approval.",
    metadata: {
      requestId: out.requestId,
      safeTxHash: out.safeTxHash,
      safeAddress: params.safeAddress,
    },
  });

  return { requestId: out.requestId, safeTxHash: out.safeTxHash, nonce: out.nonce };
}

function generateTokenPreview(
  command: string,
  args: Record<string, UntypedJson>
): ApprovalPayload["preview"] {
  switch (command) {
    case "deployToken": {
      const name = (args.name as string) || "Unknown";
      const symbol = (args.symbol as string) || "???";
      const totalSupply =
        (args.totalSupply as string) || (args.initialSupply as string) || "0";
      const chain = (args.chain as string) || "ethereum";
      const decimals = (args.decimals as number) || 18;

      return {
        title: "Deploy ERC-20 Token",
        description: "Deploy a new ERC-20 token contract on-chain.",
        items: [
          { label: "Token Name", value: name, highlight: true },
          { label: "Symbol", value: symbol, highlight: true },
          { label: "Total Supply", value: totalSupply, highlight: true },
          { label: "Decimals", value: decimals.toString() },
          {
            label: "Chain",
            value: chain.charAt(0).toUpperCase() + chain.slice(1),
          },
        ],
        warnings: [
          "Deploying a token requires gas fees (typically $20-$200 depending on network).",
          "The token contract will be immutable once deployed.",
          "You will be the initial owner with full supply.",
        ],
        estimatedCost: {
          amount: "Variable",
          currency: "Gas",
          usd: "20-200",
        },
      };
    }

    case "transferToken": {
      const to = (args.to as string) || "Unknown";
      const rawAmount = args.amount ?? args.amountWei;
      const amount =
        typeof rawAmount === "string" || typeof rawAmount === "number" ? rawAmount : "0";
      const tokenAddress =
        (args.tokenAddress as string) || (args.token as string) || "Unknown";

      return {
        title: "Transfer ERC-20 Tokens",
        description: "Transfer tokens to another address.",
        items: [
          { label: "Token Contract", value: tokenAddress, highlight: true },
          { label: "Recipient", value: to, highlight: true },
          { label: "Amount", value: amount.toString(), highlight: true },
        ],
        warnings: [
          "Token transfers are irreversible.",
          "Verify the recipient address and amount carefully.",
          "Ensure the recipient can receive this token type.",
        ],
      };
    }

    case "getTokenBalance": {
      const wallet = (args.walletAddress as string) || "Unknown";
      const tokenAddress =
        (args.tokenAddress as string) || (args.token as string) || "Unknown";

      return {
        title: "Check Token Balance",
        description: "Retrieve the token balance for a given wallet address.",
        items: [
          { label: "Wallet Address", value: wallet, highlight: true },
          { label: "Token Contract", value: tokenAddress, highlight: true },
        ],
        warnings: ["Ensure the wallet and token contract are correct."],
      };
    }

    case "getTokenInfo": {
      const tokenAddress = (args.tokenAddress as string) || "Unknown";

      return {
        title: "Fetch Token Metadata",
        description: "Retrieve metadata for an ERC-20 token contract.",
        items: [
          { label: "Token Contract", value: tokenAddress, highlight: true },
        ],
        warnings: ["Only query verified contracts to ensure accurate metadata."],
      };
    }

    case "getTransactionInfo": {
      const hash = (args.transactionHash as string) || "Unknown";

      return {
        title: "Get Transaction Details",
        description: "Lookup on-chain transaction information.",
        items: [{ label: "Transaction Hash", value: hash, highlight: true }],
        warnings: [
          "Ensure the transaction hash belongs to the selected network.",
        ],
      };
    }

    case "getBalance": {
      const wallet = (args.walletAddress as string) || "Unknown";

      return {
        title: "Get Native Balance",
        description: "Retrieve the native token balance for a wallet address.",
        items: [{ label: "Wallet Address", value: wallet, highlight: true }],
        warnings: ["Make sure the wallet address is correct."],
      };
    }

    default:
      return {
        title: "Token Operation",
        description: `Execute token operation: ${command}`,
        items: Object.entries(args)
          .slice(0, 5)
          .map(([key, value]) => ({
            label: key,
            value: String(value).slice(0, 50),
          })),
      };
  }
}

// ============================================================================
// TOOL
// ============================================================================

export const tokenMinterToolWithHITL = createTool<
  TokenMinterHitlInput,
  TokenMinterHitlOutput
>({
  description:
    "Deploy and manage ERC-20 tokens across multiple chains. Token deployments and transfers require user approval unless autonomous mode is enabled.",
  schema: tokenMinterHitlSchema,
  execute: async (
    { command, args }: TokenMinterHitlInput,
    context?: ToolExecutionContext,
  ): Promise<TokenMinterHitlOutput> => {
    // Convert args array to record
    const argsRecord = args ? argsArrayToRecord(args) : {};

    // Hard block: never accept private keys or other secret-bearing args.
    for (const key of Object.keys(argsRecord)) {
      if (isSensitiveArgKey(key)) {
        throw new Error("Sensitive key material is not accepted by this tool.");
      }
    }

    const invocationSource = getInvocationSource(context);
    const isInteractive = invocationSource === INVOCATION_SOURCE_CHAT;

    // Check if approval required
    const requiresApproval = APPROVAL_REQUIRED_COMMANDS.includes(
      command as (typeof APPROVAL_REQUIRED_COMMANDS)[number]
    );

    // Special handling: token transfers should go through Safe Allowance Module (auto) or Safe tx request (HITL).
    if (command === "transferToken") {
      const chainId = inferChainIdFromArgs(argsRecord);
      if (!chainId) {
        throw new Error("chainId is required for transferToken");
      }

      const safeSupported = getSafeTargetChains().some((chain) => chain.chainId === chainId);

      // If Safe is configured for this chain, prefer the Allowance Module (auto) + Safe tx requests (HITL).
      if (safeSupported) {
        const userIdFromContext = typeof context?.userId === "string" ? context.userId.trim() : "";
        const userId = userIdFromContext
          ? userIdFromContext
          : await (async () => {
              const auth = await resolveHitlUser("Authentication required for token operations");
              if ("error" in auth) {
                throw new Error(auth.error.errorText ?? "Authentication required for token operations");
              }
              return auth.userId;
            })();

        const tokenAddress = ensureAddress(
          argsRecord.tokenAddress ?? argsRecord.token,
          "tokenAddress",
        );
        const to = ensureAddress(argsRecord.to ?? argsRecord.recipient, "to");

        const safeAddress = await resolveSafeAddressForUser({
          userId,
          chainId,
          explicitSafeAddress: argsRecord.safeAddress,
        });

        const amountWei = await resolveTokenAmountWei({
          chainId,
          tokenAddress,
          amount: argsRecord.amount,
          amountWei: argsRecord.amountWei,
        });

        // Decide if the transfer is within the configured allowance policy (defense-in-depth).
        let withinAllowance = false;
        let allowanceFailure: string | null = null;

        try {
          const supabase = getSupabaseAdminClient();
          const { data: policyRow, error } = await supabase
            .from("agent_policies")
            .select("enabled,policy")
            .eq("user_id", userId)
            .eq("chain_id", chainId)
            .maybeSingle();

          if (error) {
            throw new Error(error.message);
          }

          if (!policyRow?.enabled) {
            allowanceFailure = "policy_disabled";
          } else {
            const policy = (policyRow.policy ?? {}) as { allowances?: Array<{ token: string; maxAmountWei: string }> };
            assertWithinAllowancePolicy({ policy, token: tokenAddress, amountWei: BigInt(amountWei) });
            withinAllowance = true;
          }
        } catch (error) {
          allowanceFailure = error instanceof Error ? error.message : "allowance_check_failed";
        }

        // Outside allowance: propose a Safe tx request (HITL) instead of executing.
        if (!withinAllowance) {
          const out = await proposeSafeErc20Transfer({
            userId,
            chainId,
            safeAddress,
            tokenAddress,
            to,
            amountWei,
            createdBy: "agent",
            requiresMfa: true,
          });

          return {
            command,
            text: `Created a Safe transaction request for token transfer (HITL required). Reason: ${allowanceFailure ?? "allowance_not_available"}. Request ID: ${out.requestId}`,
            response: {
              ...out,
              chainId,
              safeAddress,
              tokenAddress,
              to,
              amountWei,
              invocationSource,
            },
            approved: false,
            autoApproved: false,
          };
        }

        // Within allowance: require HITL for interactive sessions; otherwise execute immediately.
        if (isInteractive) {
          const preview = generateTokenPreview(command, {
            ...argsRecord,
            safeAddress,
            chainId,
            tokenAddress,
            to,
            amountWei,
          });

          const approvalPayload: ApprovalPayload = {
            toolId: "token_minter",
            command,
            args: {
              ...argsRecord,
              chainId,
              safeAddress,
              tokenAddress,
              to,
              amountWei,
            },
            preview,
          };

          // Interactive sessions always require HITL (even if autonomous mode is enabled).
          const approvalRequest = await createApprovalRequest(userId, approvalPayload);
          const decision = await waitForApproval(approvalRequest.id, userId);

          if (!decision.approved) {
            return {
              command,
              text: `Operation rejected: ${decision.reason || "User declined the token transfer"}`,
              approved: false,
              autoApproved: false,
              rejected: true,
              rejectionReason: decision.reason || "User declined the token transfer",
            };
          }
        }

        let executed: { txHash: string } | null = null;
        let executionError: string | null = null;

        try {
          executed = await executeAllowanceTransfer({
            userId,
            chainId,
            safeAddress,
            tokenAddress,
            to,
            amountWei,
          });
        } catch (error) {
          executionError = error instanceof Error ? error.message : "allowance_transfer_failed";
        }

        if (!executed) {
          const fallback = await proposeSafeErc20Transfer({
            userId,
            chainId,
            safeAddress,
            tokenAddress,
            to,
            amountWei,
            createdBy: "agent",
            requiresMfa: true,
          });

          return {
            command,
            text: `Allowance execution failed (${executionError ?? "unknown_error"}). Created a Safe transaction request instead. Request ID: ${fallback.requestId}`,
            response: {
              ...fallback,
              chainId,
              safeAddress,
              tokenAddress,
              to,
              amountWei,
              invocationSource,
              allowanceExecutionError: executionError,
            },
            approved: false,
            autoApproved: false,
          };
        }

        return {
          command,
          text: `Executed allowance transfer. Tx hash: ${executed.txHash}`,
          response: { txHash: executed.txHash, chainId, safeAddress, tokenAddress, to, amountWei },
          approved: true,
          autoApproved: !isInteractive,
        };
      }

      // Safe is not configured for this chain: fall back to the legacy token-minter MCP flow (HITL only).
    }

    if (requiresApproval) {
      const auth = await resolveHitlUser(
        "Authentication required for token operations"
      );
      if ("error" in auth) {
        throw new Error(
          auth.error.errorText ?? "Authentication required for token operations"
        );
      }

      const userId = auth.userId;
      const preview = generateTokenPreview(command, argsRecord);

      const operationType =
        command === "deployToken" ? ("deploy" as const) : undefined;

      const approvalPayload: ApprovalPayload = {
        toolId: "token_minter",
        command,
        args: argsRecord,
        preview,
        ...(operationType ? { operationType } : {}),
      };

      // Create approval request
      const approvalRequest = await createApprovalRequest(userId, approvalPayload);

      // Wait for user decision
      const decision = await waitForApproval(approvalRequest.id, userId);

      if (!decision.approved) {
        return {
          command,
          text: `Operation rejected: ${decision.reason || "User declined the token operation"}`,
          approved: false,
          autoApproved: false,
          rejected: true,
          rejectionReason: decision.reason || "User declined the token operation",
        };
      }
    }

    // Execute command
    const invocation = await defaultTokenMinterClient.invokeRaw(
      command,
      argsRecord
    );

    if (!invocation.ok) {
      throw new Error(invocation.text);
    }

    return {
      command,
      text: invocation.text,
      response: invocation.response,
      approved: requiresApproval,
      autoApproved: false,
    };
  },
});
