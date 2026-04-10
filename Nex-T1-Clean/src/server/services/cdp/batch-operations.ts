/**
 * CDP V2 Batched User Operations Service
 *
 * Server-only module providing EVM Smart Account batched operations via CDP SDK.
 * Smart Accounts (ERC-4337) support batching multiple calls into a single
 * UserOperation, enabling atomic multi-step workflows such as:
 *
 * - approve + swap
 * - multi-send (send tokens to multiple recipients)
 * - approve + stake
 * - approve + bridge
 *
 * CDP SDK v1.44 API surface used:
 * - `cdp.evm.getAccount({ address })` — retrieve the owner EOA server account
 * - `cdp.evm.getSmartAccount({ address, owner })` — retrieve the smart account
 * - `cdp.evm.sendUserOperation({ smartAccount, calls, network })` — batch EVM calls
 *
 * Ownership verification is performed before executing any batched operation.
 * The owner EOA address is stored in `wallet_accounts.metadata.ownerEoa`
 * during provisioning.
 */
import "server-only";

import { z } from "zod";
import { getCdpClient } from "@/server/services/cdp/client";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { logger } from "@/lib/logger";

/** CDP client instance type (non-null) */
type CdpClientNonNull = NonNullable<Awaited<ReturnType<typeof getCdpClient>>>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single call within a batched UserOperation */
export type BatchCall = {
  /** Target contract or recipient address (0x-prefixed) */
  to: string;
  /** ETH value in wei (optional, defaults to "0") */
  value?: string;
  /** Calldata hex string (optional, defaults to "0x") */
  data?: string;
};

/** Result of a batched UserOperation execution */
export type BatchResult = {
  /** ERC-4337 UserOperation hash */
  userOpHash: string;
  /** Status of the UserOperation submission */
  status: string;
  /** Per-call results (mapped 1:1 with input calls) */
  callResults: Array<{ success: boolean }>;
};

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------

const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
const hexDataRegex = /^0x[a-fA-F0-9]*$/;

const batchCallSchema = z.object({
  to: z.string().regex(evmAddressRegex, "Invalid EVM address for 'to' field"),
  value: z
    .string()
    .regex(/^\d+$/, "Value must be a non-negative integer string (wei)")
    .optional(),
  data: z
    .string()
    .regex(hexDataRegex, "Data must be a valid hex string (0x-prefixed)")
    .optional(),
});

const batchParamsSchema = z.object({
  walletAddress: z.string().regex(evmAddressRegex, "Invalid Smart Account address"),
  calls: z
    .array(batchCallSchema)
    .min(1, "At least one call is required")
    .max(20, "Maximum 20 calls per batch"),
  chainId: z.number().int().positive("Chain ID must be a positive integer"),
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** CDP-supported EVM network names by chainId */
const CDP_EVM_NETWORKS: Record<
  number,
  | "base"
  | "base-sepolia"
  | "bnb"
  | "ethereum"
  | "ethereum-sepolia"
  | "avalanche"
  | "polygon"
  | "optimism"
  | "arbitrum"
> = {
  8453: "base",
  84532: "base-sepolia",
  56: "bnb",
  1: "ethereum",
  11155111: "ethereum-sepolia",
  43114: "avalanche",
  137: "polygon",
  10: "optimism",
  42161: "arbitrum",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Verify that a given address belongs to the specified user in `wallet_accounts`
 * and return the wallet metadata (needed for ownerEoa resolution).
 */
async function verifyWalletOwnershipAndGetMetadata(
  userId: string,
  address: string,
): Promise<{ owned: boolean; ownerEoa: string | null }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("wallet_accounts")
    .select("metadata")
    .eq("user_id", userId)
    .eq("address", address.toLowerCase())
    .eq("wallet_type", "cdp")
    .maybeSingle();

  if (error) {
    logger.error("cdp_batch_ops_ownership_check_failed", {
      userId,
      address,
      error: error.message,
    });
    return { owned: false, ownerEoa: null };
  }

  if (!data) {
    return { owned: false, ownerEoa: null };
  }

  const metadata = data.metadata as Record<string, UntypedJson> | null;
  const ownerEoa =
    metadata && typeof metadata.ownerEoa === "string"
      ? metadata.ownerEoa
      : null;

  return { owned: true, ownerEoa };
}

/**
 * Resolve a chainId to the CDP network name.
 */
function resolveEvmNetwork(
  chainId: number,
): (typeof CDP_EVM_NETWORKS)[number] | null {
  return CDP_EVM_NETWORKS[chainId] ?? null;
}

/**
 * Resolve the CDP SmartAccount object for a given smart account address.
 *
 * The CDP SDK requires a SmartAccount object (not just an address) for
 * sendUserOperation. This function:
 * 1. Retrieves the owner server account using the stored ownerEoa address
 * 2. Gets the SmartAccount object bound to that owner
 */
async function resolveSmartAccount(
  cdp: CdpClientNonNull,
  smartAccountAddress: string,
  ownerEoaAddress: string,
): Promise<Awaited<ReturnType<CdpClientNonNull["evm"]["getSmartAccount"]>>> {
  // Get the owner's server account (needed as the SmartAccount's signer)
  const ownerAccount = await cdp.evm.getAccount({
    address: ownerEoaAddress as `0x${string}`,
  });

  // Get the SmartAccount object with the owner attached
  const smartAccount = await cdp.evm.getSmartAccount({
    address: smartAccountAddress as `0x${string}`,
    owner: ownerAccount,
  });

  return smartAccount;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute a batched UserOperation on an EVM Smart Account via CDP SDK.
 *
 * Combines multiple calls (approve, transfer, swap, etc.) into a single
 * atomic ERC-4337 UserOperation. All calls succeed or all revert.
 *
 * Flow:
 * 1. Validate input and verify wallet ownership
 * 2. Retrieve the owner EOA address from wallet_accounts metadata
 * 3. Resolve the CDP SmartAccount object
 * 4. Submit the batched UserOperation via CDP SDK
 *
 * @param params - Batch operation parameters
 * @param callerUserId - The authenticated user's ID (for ownership verification)
 * @returns UserOperation hash, status, and per-call results
 *
 * @throws Error if wallet ownership verification fails
 * @throws Error if CDP client is not available
 * @throws Error if the chainId is not supported
 * @throws Error if owner EOA address is not found in metadata
 */
export async function executeBatchUserOperation(
  params: {
    walletAddress: string;
    calls: BatchCall[];
    chainId: number;
  },
  callerUserId: string,
): Promise<BatchResult> {
  // 1. Validate input
  const parsed = batchParamsSchema.parse(params);

  // 2. Verify ownership and get metadata
  const { owned, ownerEoa } = await verifyWalletOwnershipAndGetMetadata(
    callerUserId,
    parsed.walletAddress,
  );
  if (!owned) {
    throw new Error(
      "Wallet ownership verification failed. The address is not linked to your account.",
    );
  }
  if (!ownerEoa) {
    throw new Error(
      "Owner EOA address not found for this Smart Account. " +
        "The wallet may not have been provisioned through CDP, or metadata is missing.",
    );
  }

  // 3. Get CDP client
  const cdp = await getCdpClient();
  if (!cdp) {
    throw new Error(
      "CDP server client not available. Check CDP_API_KEY_ID and CDP_API_KEY_SECRET.",
    );
  }

  // 4. Resolve network
  const network = resolveEvmNetwork(parsed.chainId);
  if (!network) {
    throw new Error(
      `Unsupported EVM chain for CDP: ${parsed.chainId}. ` +
        `Supported: ${Object.keys(CDP_EVM_NETWORKS).join(", ")}`,
    );
  }

  logger.info("cdp_batch_ops_started", {
    userId: callerUserId,
    walletAddress: parsed.walletAddress,
    ownerEoa,
    chainId: parsed.chainId,
    network,
    callCount: parsed.calls.length,
    callTargets: parsed.calls.map((c) => c.to),
  });

  try {
    // 5. Resolve the SmartAccount object from CDP
    const smartAccount = await resolveSmartAccount(
      cdp,
      parsed.walletAddress,
      ownerEoa,
    );

    // 6. Map calls to CDP SDK format
    const cdpCalls = parsed.calls.map((call) => ({
      to: call.to as `0x${string}`,
      value: call.value ? BigInt(call.value) : 0n,
      data: (call.data ?? "0x") as `0x${string}`,
    }));

    // 7. Execute batched UserOperation
    const result = await cdp.evm.sendUserOperation({
      smartAccount,
      calls: cdpCalls,
      network,
    });

    logger.info("cdp_batch_ops_completed", {
      userId: callerUserId,
      walletAddress: parsed.walletAddress,
      chainId: parsed.chainId,
      userOpHash: result.userOpHash,
      callCount: parsed.calls.length,
    });

    // ERC-4337 UserOperations are atomic: all calls succeed or all revert.
    // The CDP SDK does not return per-call outcomes. The `status: "submitted"`
    // indicates the UserOp was accepted by the bundler — final confirmation
    // requires polling the UserOp receipt. We reflect the atomic guarantee
    // by reporting `success: true` only when the overall submission succeeded.
    const callResults = parsed.calls.map(() => ({ success: true }));

    return {
      userOpHash: result.userOpHash,
      status: "submitted",
      callResults,
    };
  } catch (err) {
    logger.error("cdp_batch_ops_failed", {
      userId: callerUserId,
      walletAddress: parsed.walletAddress,
      chainId: parsed.chainId,
      callCount: parsed.calls.length,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
