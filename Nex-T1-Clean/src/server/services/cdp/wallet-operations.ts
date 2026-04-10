/**
 * Nex Wallet Operations Service
 *
 * Server-only module providing wallet operation functions for CDP embedded
 * wallets: send, swap execution, key export, and on-ramp URL generation.
 *
 * - Uses the CDP SDK singleton from `./client.ts`
 * - Verifies wallet ownership via `wallet_accounts` before executing operations
 * - All sensitive operations (key export) are audit-logged and rate-limited
 * - Inputs validated with Zod schemas
 *
 * CDP SDK v1.44 API surface used:
 * - `cdp.evm.sendTransaction(options)` — sign and send an EVM transaction
 * - `cdp.evm.createSwapQuote(options)` — get an executable swap quote
 * - `cdp.evm.exportAccount(options)` — export EVM account private key (hex)
 * - CDP embedded wallet `/solana/send/transaction` — sign and send a Solana transaction
 * - `cdp.solana.exportAccount(options)` — export Solana account private key (base58)
 */
import "server-only";

import { z } from "zod";
import { parseEther } from "viem";
import { getCdpClient } from "@/server/services/cdp/client";
import { sendCdpEmbeddedSolanaTransaction } from "@/server/services/cdp/embedded-solana-transactions";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { redis, isRedisConfigured } from "@/server/services/redis";
import { logger } from "@/lib/logger";
import { buildSolTransfer, buildSplTransfer } from "@/server/services/cdp/solana-tx-builder";
import { verifyCdpWalletOwnership } from "@/server/services/cdp/ownership";
import { createCdpSessionToken } from "@/server/services/cdp/session-token";
import {
  getNetworkCapabilities,
  resolveCdpSignAndSendNetwork,
  resolveCdpSwapNetwork,
} from "@/lib/networks/capabilities";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** CDP client instance type (non-null) */
type CdpClientNonNull = NonNullable<Awaited<ReturnType<typeof getCdpClient>>>;

export type SendResult = {
  txHash: string;
  status: string;
};

export type SwapResult = {
  txHash: string;
  fromAmount: string;
  toAmount: string;
};

export type ExportKeyResult = {
  privateKey: string;
  format: "hex" | "base58";
};

export type OnrampUrlResult = {
  url: string;
  expiresAt?: string;
};

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------

const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;

const sendParamsSchema = z.object({
  fromAddress: z.string().min(1, "fromAddress is required"),
  toAddress: z.string().min(1, "toAddress is required"),
  amount: z.string().regex(/^\d+(\.\d+)?$/, "Amount must be a numeric string"),
  tokenAddress: z.string().optional(),
  chainId: z.union([z.number(), z.string()]),
  platform: z.enum(["evm", "solana"]),
}).refine(
  (data) => {
    // Validate EVM addresses when platform is evm
    if (data.platform === "evm") {
      return evmAddressRegex.test(data.fromAddress) && evmAddressRegex.test(data.toAddress);
    }
    return true;
  },
  { message: "EVM addresses must be valid 0x-prefixed 40-hex-char strings" },
);

const swapParamsSchema = z.object({
  walletAddress: z.string().regex(evmAddressRegex, "Invalid EVM wallet address"),
  fromToken: z.string().regex(evmAddressRegex, "Invalid from token address"),
  toToken: z.string().regex(evmAddressRegex, "Invalid to token address"),
  amount: z.string().regex(/^\d+$/, "Amount must be an integer string (base units)"),
  slippageBps: z.number().int().min(0).max(10000).optional(),
  chainId: z.number().int().positive(),
});

const exportKeyParamsSchema = z.object({
  walletAddress: z.string().min(1, "walletAddress is required"),
  userId: z.string().uuid("userId must be a valid UUID"),
  agentId: z.string().uuid("agentId must be a valid UUID").optional(),
});

const onrampParamsSchema = z.object({
  address: z.string().min(1, "address is required"),
  amount: z.number().positive().optional(),
  currency: z.string().min(1).max(10).optional(),
  chainId: z.number().int().positive().optional(),
});

export type OnrampUrlParams = z.infer<typeof onrampParamsSchema> & {
  clientIp: string;
  redirectUrl?: string;
  partnerUserRef?: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type CdpEvmNetwork = NonNullable<ReturnType<typeof resolveCdpSignAndSendNetwork>>;
type CdpSwapNetwork = NonNullable<ReturnType<typeof resolveCdpSwapNetwork>>;

/** Rate limit key prefix for key exports */
const EXPORT_KEY_RATE_LIMIT_PREFIX = "cdp_export_key:";
/** Max key exports per user per hour */
const EXPORT_KEY_MAX_PER_HOUR = 3;
/** Rate limit window in seconds (1 hour) */
const EXPORT_KEY_WINDOW_SECONDS = 3600;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a chainId to the CDP network name for sendTransaction.
 */
function resolveEvmNetwork(chainId: number | string): CdpEvmNetwork | null {
  return resolveCdpSignAndSendNetwork(chainId);
}

/**
 * Check rate limit for key export operations.
 * Returns true if the operation is allowed, false if rate-limited.
 */
async function checkExportRateLimit(userId: string): Promise<boolean> {
  if (!isRedisConfigured) {
    // Without Redis, we cannot enforce rate limits -- fail open in dev, closed in prod
    return process.env.NODE_ENV !== "production";
  }

  const key = `${EXPORT_KEY_RATE_LIMIT_PREFIX}${userId}`;
  const current = await redis.incr(key);

  // Set TTL on first increment
  if (current === 1) {
    if (redis.expire) {
      await redis.expire(key, EXPORT_KEY_WINDOW_SECONDS);
    }
  }

  return current <= EXPORT_KEY_MAX_PER_HOUR;
}

// ---------------------------------------------------------------------------
// sendFromCdpWallet
// ---------------------------------------------------------------------------

/**
 * Send tokens from a Nex Wallet.
 *
 * For EVM: Builds an EIP-1559 transaction object and sends via `cdp.evm.sendTransaction`.
 *          Supports both native ETH and ERC-20 transfers (via encoded `transfer` calldata).
 * For Solana: Builds and sends a serialized Solana transaction via `cdp.solana.sendTransaction`.
 *
 * The caller must be verified as the owner of the `fromAddress` before invocation.
 *
 * @param params - Send parameters
 * @param callerUserId - The authenticated user's ID (for ownership verification)
 * @returns Transaction hash and status
 */
export async function sendFromCdpWallet(
  params: z.infer<typeof sendParamsSchema>,
  callerUserId: string,
  options?: { agentId?: string },
): Promise<SendResult> {
  const parsed = sendParamsSchema.parse(params);

  // 1. Verify ownership (agent wallets vs user wallets)
  const isOwner = await verifyCdpWalletOwnership(callerUserId, parsed.fromAddress, {
    agentId: options?.agentId,
  });
  if (!isOwner) {
    throw new Error("Wallet ownership verification failed. The address is not linked to your account.");
  }

  logger.info("cdp_ops_send_started", {
    userId: callerUserId,
    from: parsed.fromAddress,
    to: parsed.toAddress,
    amount: parsed.amount,
    platform: parsed.platform,
    chainId: String(parsed.chainId),
    hasToken: Boolean(parsed.tokenAddress),
  });

  try {
    if (parsed.platform === "evm") {
      const cdp = await getCdpClient();
      if (!cdp) {
        throw new Error("CDP server client not available. Check CDP_API_KEY_ID and CDP_API_KEY_SECRET.");
      }
      return await sendEvmTransfer(cdp, parsed);
    } else {
      return await sendSolanaTransfer(parsed, callerUserId);
    }
  } catch (err) {
    logger.error("cdp_ops_send_failed", {
      userId: callerUserId,
      from: parsed.fromAddress,
      to: parsed.toAddress,
      platform: parsed.platform,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Send an EVM transfer via CDP SDK `sendTransaction`.
 *
 * For native ETH: sends an EIP-1559 transaction with `value` and no data.
 * For ERC-20: encodes a `transfer(address,uint256)` call and sends to the token contract.
 */
async function sendEvmTransfer(
  cdp: CdpClientNonNull,
  params: z.infer<typeof sendParamsSchema>,
): Promise<SendResult> {
  const fromAddr = params.fromAddress as `0x${string}`;
  const toAddr = params.toAddress as `0x${string}`;
  const network = resolveEvmNetwork(params.chainId);
  const supportedEvmChainIds = getNetworkCapabilities()
    .filter((capability) => capability.cdpSignAndSend)
    .map((capability) => capability.chainId)
    .join(", ");

  if (!network) {
    throw new Error(
      `Unsupported EVM chain for CDP: ${params.chainId}. Supported: ${supportedEvmChainIds}`,
    );
  }

  if (params.tokenAddress) {
    // ERC-20 transfer: encode transfer(address,uint256) function call
    // Function selector for transfer(address,uint256) is 0xa9059cbb
    const tokenAddr = params.tokenAddress as `0x${string}`;
    const paddedTo = toAddr.slice(2).padStart(64, "0");
    const paddedAmount = BigInt(params.amount).toString(16).padStart(64, "0");
    const calldata = `0xa9059cbb${paddedTo}${paddedAmount}` as `0x${string}`;

    const result = await cdp.evm.sendTransaction({
      address: fromAddr,
      transaction: {
        to: tokenAddr,
        value: 0n,
        data: calldata,
      },
      network,
    });

    return {
      txHash: result.transactionHash,
      status: "submitted",
    };
  } else {
    // Native ETH transfer
    const result = await cdp.evm.sendTransaction({
      address: fromAddr,
      transaction: {
        to: toAddr,
        value: parseEther(params.amount),
      },
      network,
    });

    return {
      txHash: result.transactionHash,
      status: "submitted",
    };
  }
}

/**
 * Send a Solana transfer via the CDP embedded wallet Solana send endpoint.
 *
 * Builds the transaction using the solana-tx-builder module, then submits
 * the base64-encoded serialized transaction to CDP for user-scoped signing
 * and broadcast.
 *
 * Supports both native SOL transfers and SPL token transfers.
 *
 * @param params - Validated send parameters
 * @returns Transaction signature and status
 */
async function sendSolanaTransfer(
  params: z.infer<typeof sendParamsSchema>,
  userId: string,
): Promise<SendResult> {
  const fromAddress = params.fromAddress;
  const toAddress = params.toAddress;

  let serializedTx: string;

  if (params.tokenAddress) {
    // SPL token transfer
    // Amount is expected in base units (smallest denomination).
    // Decimals default to 9 (SOL-based tokens); callers should provide
    // the correct amount in base units regardless.
    const amount = BigInt(params.amount);
    serializedTx = await buildSplTransfer(
      fromAddress,
      toAddress,
      params.tokenAddress,
      amount,
      0, // decimals are for logging only; amount is already in base units
    );
  } else {
    // Native SOL transfer
    // Amount is in SOL (e.g. "0.5"). Convert to lamports (1 SOL = 1e9 lamports).
    const solAmount = parseFloat(params.amount);
    if (Number.isNaN(solAmount) || solAmount <= 0) {
      throw new Error(`Invalid SOL amount: ${params.amount}. Must be a positive number.`);
    }
    const lamports = BigInt(Math.round(solAmount * 1_000_000_000));
    serializedTx = await buildSolTransfer(fromAddress, toAddress, lamports);
  }

  logger.info("cdp_ops_solana_tx_built", {
    from: fromAddress,
    to: toAddress,
    hasToken: Boolean(params.tokenAddress),
    serializedLength: serializedTx.length,
  });

  const result = await sendCdpEmbeddedSolanaTransaction({
    userId,
    walletAddress: fromAddress,
    transaction: serializedTx,
    network: "solana",
  });

  return {
    txHash: result.transactionSignature,
    status: "submitted",
  };
}

// ---------------------------------------------------------------------------
// executeCdpSwap
// ---------------------------------------------------------------------------

/**
 * Execute a token swap on a Nex Wallet.
 *
 * Uses `createSwapQuote` to get an executable quote with transaction data,
 * then sends the transaction via `sendTransaction`.
 *
 * Only supports EVM chains with CDP swap liquidity (Base, Ethereum, Arbitrum, Optimism).
 *
 * @param params - Swap parameters
 * @param callerUserId - The authenticated user's ID (for ownership verification)
 * @returns Transaction hash and token amounts
 */
export async function executeCdpSwap(
  params: z.infer<typeof swapParamsSchema>,
  callerUserId: string,
  options?: { agentId?: string },
): Promise<SwapResult> {
  const parsed = swapParamsSchema.parse(params);

  // 1. Verify ownership (agent wallets vs user wallets)
  const isOwner = await verifyCdpWalletOwnership(callerUserId, parsed.walletAddress, {
    agentId: options?.agentId,
  });
  if (!isOwner) {
    throw new Error("Wallet ownership verification failed. The address is not linked to your account.");
  }

  // 2. Resolve swap network (subset of EVM networks that support swaps)
  const swapNetwork: CdpSwapNetwork | null = resolveCdpSwapNetwork(parsed.chainId);
  const supportedSwapChainIds = getNetworkCapabilities()
    .filter((capability) => capability.cdpSwap)
    .map((capability) => capability.chainId)
    .join(", ");
  if (!swapNetwork) {
    throw new Error(
      `Unsupported chain for CDP swap: ${parsed.chainId}. Supported: ${supportedSwapChainIds}`,
    );
  }

  // 3. Get CDP client
  const cdp = await getCdpClient();
  if (!cdp) {
    throw new Error("CDP server client not available. Check CDP_API_KEY_ID and CDP_API_KEY_SECRET.");
  }

  logger.info("cdp_ops_swap_started", {
    userId: callerUserId,
    wallet: parsed.walletAddress,
    fromToken: parsed.fromToken,
    toToken: parsed.toToken,
    amount: parsed.amount,
    chainId: parsed.chainId,
    network: swapNetwork,
    slippageBps: parsed.slippageBps,
  });

  try {
    // 4. Create an executable swap quote (includes transaction data)
    const quoteResult = await cdp.evm.createSwapQuote({
      network: swapNetwork,
      fromToken: parsed.fromToken as `0x${string}`,
      toToken: parsed.toToken as `0x${string}`,
      fromAmount: BigInt(parsed.amount),
      taker: parsed.walletAddress as `0x${string}`,
      slippageBps: parsed.slippageBps,
    });

    if (!quoteResult.liquidityAvailable) {
      throw new Error(
        `No liquidity available for swap ${parsed.fromToken} -> ${parsed.toToken} on ${swapNetwork}`,
      );
    }

    logger.info("cdp_ops_swap_quote_received", {
      userId: callerUserId,
      fromAmount: quoteResult.fromAmount.toString(),
      toAmount: quoteResult.toAmount.toString(),
      minToAmount: quoteResult.minToAmount.toString(),
    });

    // 5. Extract the transaction from the quote and send it
    if (!quoteResult.transaction) {
      throw new Error("Swap quote did not include a transaction. Cannot execute swap.");
    }

    const txResult = await cdp.evm.sendTransaction({
      address: parsed.walletAddress as `0x${string}`,
      transaction: {
        to: quoteResult.transaction.to,
        value: BigInt(quoteResult.transaction.value),
        data: quoteResult.transaction.data,
      },
      network: swapNetwork,
    });

    logger.info("cdp_ops_swap_executed", {
      userId: callerUserId,
      txHash: txResult.transactionHash,
      fromAmount: quoteResult.fromAmount.toString(),
      toAmount: quoteResult.toAmount.toString(),
    });

    return {
      txHash: txResult.transactionHash,
      fromAmount: quoteResult.fromAmount.toString(),
      toAmount: quoteResult.toAmount.toString(),
    };
  } catch (err) {
    logger.error("cdp_ops_swap_failed", {
      userId: callerUserId,
      wallet: parsed.walletAddress,
      fromToken: parsed.fromToken,
      toToken: parsed.toToken,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// exportCdpWalletKey
// ---------------------------------------------------------------------------

/**
 * Export the private key of a Nex Wallet.
 *
 * CRITICAL SECURITY OPERATION:
 * - All export events are audit-logged to Supabase
 * - Rate-limited to 3 exports per user per hour via Redis
 * - Requires verified wallet ownership
 *
 * CDP SDK methods:
 * - `cdp.evm.exportAccount({ address })` returns the 32-byte hex private key (no 0x prefix)
 * - `cdp.solana.exportAccount({ address })` returns the 64-byte base58 private key
 *
 * @param params - Export parameters
 * @returns Private key and format
 */
export async function exportCdpWalletKey(
  params: z.infer<typeof exportKeyParamsSchema>,
  options?: { ipAddress?: string },
): Promise<ExportKeyResult> {
  const parsed = exportKeyParamsSchema.parse(params);

  // 1. Rate limit check
  const allowed = await checkExportRateLimit(parsed.userId);
  if (!allowed) {
    logger.warn("cdp_ops_export_key_rate_limited", {
      userId: parsed.userId,
      walletAddress: parsed.walletAddress,
    });
    throw new Error("Key export rate limit exceeded. Maximum 3 exports per hour.");
  }

  // 2. Verify ownership (agent wallets vs user wallets)
  const isOwner = await verifyCdpWalletOwnership(parsed.userId, parsed.walletAddress, {
    agentId: parsed.agentId,
  });
  if (!isOwner) {
    logger.warn("cdp_ops_export_key_ownership_denied", {
      userId: parsed.userId,
      walletAddress: parsed.walletAddress,
      agentId: parsed.agentId ?? null,
    });
    throw new Error("Wallet ownership verification failed. The address is not linked to your account.");
  }

  // 3. Get CDP client
  const cdp = await getCdpClient();
  if (!cdp) {
    throw new Error("CDP server client not available. Check CDP_API_KEY_ID and CDP_API_KEY_SECRET.");
  }

  // 4. Determine platform from the appropriate table
  const supabase = getSupabaseAdminClient();
  let walletRow: { platform: string; wallet_type?: string } | null = null;
  let walletError: { message: string } | null = null;

  if (parsed.agentId) {
    // Agent wallet: look up in agent_wallets
    const result = await supabase
      .from("agent_wallets")
      .select("platform")
      .eq("agent_id", parsed.agentId)
      .ilike("address", parsed.walletAddress)
      .eq("status", "active")
      .single();
    walletRow = result.data as { platform: string } | null;
    walletError = result.error;
  } else {
    // User wallet: look up in wallet_accounts
    const result = await supabase
      .from("wallet_accounts")
      .select("platform,wallet_type")
      .eq("user_id", parsed.userId)
      .eq("address", parsed.walletAddress.toLowerCase())
      .eq("wallet_type", "cdp")
      .single();
    walletRow = result.data;
    walletError = result.error;
  }

  if (walletError || !walletRow) {
    throw new Error("Nex Wallet not found for the specified address.");
  }

  const platform = walletRow.platform as "evm" | "solana";

  logger.info("cdp_ops_export_key_started", {
    userId: parsed.userId,
    walletAddress: parsed.walletAddress,
    platform,
    agentId: parsed.agentId ?? null,
  });

  try {
    let privateKey: string;
    let format: "hex" | "base58";

    if (platform === "evm") {
      // exportAccount returns the raw hex private key string (no 0x prefix)
      privateKey = await cdp.evm.exportAccount({
        address: parsed.walletAddress as `0x${string}`,
      });
      format = "hex";
    } else {
      // exportAccount returns the base58-encoded private key string
      privateKey = await cdp.solana.exportAccount({
        address: parsed.walletAddress,
      });
      format = "base58";
    }

    // 5. Audit log the export event (include client IP when provided by API route)
    await auditLogKeyExport({
      userId: parsed.userId,
      walletAddress: parsed.walletAddress,
      platform,
      agentId: parsed.agentId,
      ipAddress: options?.ipAddress,
    });

    logger.info("cdp_ops_export_key_completed", {
      userId: parsed.userId,
      walletAddress: parsed.walletAddress,
      platform,
      format,
    });

    return { privateKey, format };
  } catch (err) {
    logger.error("cdp_ops_export_key_failed", {
      userId: parsed.userId,
      walletAddress: parsed.walletAddress,
      platform,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Insert an audit record into `wallet_key_exports` for compliance and security.
 */
async function auditLogKeyExport(params: {
  userId: string;
  walletAddress: string;
  platform: string;
  agentId?: string;
  ipAddress?: string;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.from("wallet_key_exports").insert({
    user_id: params.userId,
    wallet_address: params.walletAddress,
    platform: params.platform,
    agent_id: params.agentId ?? null,
    exported_at: new Date().toISOString(),
    ip_address: params.ipAddress ?? null,
  });

  if (error) {
    // Non-fatal: log but don't fail the export
    logger.error("cdp_ops_audit_log_insert_failed", {
      userId: params.userId,
      walletAddress: params.walletAddress,
      error: error.message,
    });
  }
}

// ---------------------------------------------------------------------------
// getCdpOnrampUrl
// ---------------------------------------------------------------------------

/**
 * Generate a Coinbase On-Ramp URL for depositing fiat into a Nex Wallet.
 *
 * Uses the Coinbase Pay SDK URL builder to create a pre-filled on-ramp link.
 *
 * @param params - On-ramp parameters
 * @returns URL and optional expiry
 */
export async function getCdpOnrampUrl(
  params: OnrampUrlParams,
): Promise<OnrampUrlResult> {
  const parsed = onrampParamsSchema.parse(params);
  const clientIp = params.clientIp?.trim();
  if (!clientIp) {
    throw new Error("clientIp is required for Coinbase secure initialization");
  }

  logger.info("cdp_ops_onramp_url_generated", {
    address: parsed.address,
    amount: parsed.amount ?? null,
    currency: parsed.currency ?? "USD",
    chainId: parsed.chainId ?? null,
  });

  // Determine the destination asset and network for the on-ramp URL
  const chainMapping: Record<number, { network: string; asset: string }> = {
    8453: { network: "base", asset: "ETH" },
    1: { network: "ethereum", asset: "ETH" },
    42161: { network: "arbitrum", asset: "ETH" },
    10: { network: "optimism", asset: "ETH" },
    137: { network: "polygon", asset: "MATIC" },
  };

  const chainInfo = parsed.chainId
    ? (chainMapping[parsed.chainId] ?? chainMapping[8453])
    : chainMapping[8453];

  const session = await createCdpSessionToken({
    addresses: [
      {
        address: parsed.address,
        blockchains: [chainInfo.network],
      },
    ],
    assets: [chainInfo.asset],
    clientIp,
  });

  // Build Coinbase On-Ramp URL
  // Reference: https://docs.cdp.coinbase.com/onramp/docs/api-initializing
  const baseUrl = "https://pay.coinbase.com/buy/select-asset";
  const urlParams = new URLSearchParams({
    sessionToken: session.token,
    defaultNetwork: chainInfo.network,
    defaultAsset: chainInfo.asset,
    defaultPaymentMethod: "CARD",
  });

  if (parsed.amount) {
    urlParams.set("presetFiatAmount", String(parsed.amount));
  }

  urlParams.set("fiatCurrency", parsed.currency?.toUpperCase() ?? "USD");

  if (params.redirectUrl) {
    urlParams.set("redirectUrl", params.redirectUrl);
  }

  if (params.partnerUserRef) {
    urlParams.set("partnerUserRef", params.partnerUserRef);
  }

  const url = `${baseUrl}?${urlParams.toString()}`;

  return { url };
}
