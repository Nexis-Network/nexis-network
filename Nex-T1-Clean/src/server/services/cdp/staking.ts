/**
 * CDP V2 Staking Service
 *
 * Server-only module providing staking operations for Nex Wallets
 * supporting both ETH and SOL staking via the Coinbase Staking API.
 *
 * - Uses the CDP SDK singleton from `./client.ts`
  * - Verifies wallet ownership via `wallet_accounts` before executing operations
 * - Supports ETH native staking (beacon chain) and SOL staking
 * - Results cached in Redis with configurable TTL for position/reward queries
 *
 * Coinbase Staking API reference:
 * - POST /staking/v1/stakes       — Initiate a new stake
 * - POST /staking/v1/unstakes     — Initiate an unstake
 * - GET  /staking/v1/positions    — List staking positions
 * - GET  /staking/v1/rewards      — Get accumulated rewards
 */
import "server-only";

import { z } from "zod";
import { getCdpClient } from "@/server/services/cdp/client";
import { sendCdpEmbeddedSolanaTransaction } from "@/server/services/cdp/embedded-solana-transactions";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { redis, isRedisConfigured } from "@/server/services/redis";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StakeParams = {
  walletAddress: string;
  amount: string;
  asset: "eth" | "sol";
  network?: string;
};

export type UnstakeParams = {
  walletAddress: string;
  amount: string;
  asset: "eth" | "sol";
  stakeId?: string;
  network?: string;
};

export type StakeResult = {
  stakeId: string;
  txHash: string;
  amount: string;
  asset: string;
  status: "pending" | "active" | "completed";
  estimatedApy: number;
};

export type StakingPosition = {
  stakeId: string;
  asset: "eth" | "sol";
  amount: string;
  rewards: string;
  apy: number;
  status: "active" | "unbonding" | "completed" | "unknown";
  startedAt: string;
  network: string;
};

export type StakingRewardsResult = {
  walletAddress: string;
  totalRewards: string;
  totalRewardsUsd: number;
  positions: Array<{
    stakeId: string;
    asset: "eth" | "sol";
    rewards: string;
    rewardsUsd: number;
    apy: number;
  }>;
};

/** Non-null CDP client helper type */
type CdpClientNonNull = NonNullable<Awaited<ReturnType<typeof getCdpClient>>>;

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------

const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;

const stakeParamsSchema = z.object({
  walletAddress: z.string().min(1, "walletAddress is required"),
  amount: z.string().regex(/^\d+$/, "Amount must be an integer string (base units)"),
  asset: z.enum(["eth", "sol"]),
  network: z.string().optional(),
});

const unstakeParamsSchema = z.object({
  walletAddress: z.string().min(1, "walletAddress is required"),
  amount: z.string().regex(/^\d+$/, "Amount must be an integer string (base units)"),
  asset: z.enum(["eth", "sol"]),
  stakeId: z.string().optional(),
  network: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** CDP Staking API base URL */
const CDP_STAKING_API_BASE = "https://api.developer.coinbase.com/staking/v1";

/** Default networks per asset for staking */
const DEFAULT_STAKING_NETWORKS: Record<string, string> = {
  eth: "ethereum",
  sol: "solana",
};

/** Estimated APY values (used as fallbacks when the API does not return APY) */
const FALLBACK_APY: Record<string, number> = {
  eth: 3.2,
  sol: 6.8,
};

/** Cache TTL for staking positions (2 minutes) */
const POSITIONS_CACHE_TTL_SECONDS = 120;

/** Cache TTL for staking rewards (2 minutes) */
const REWARDS_CACHE_TTL_SECONDS = 120;

/** Cache key prefixes */
const POSITIONS_CACHE_PREFIX = "cdp_staking_positions:";
const REWARDS_CACHE_PREFIX = "cdp_staking_rewards:";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Verify that a given address belongs to the specified user in `wallet_accounts`.
 */
async function verifyWalletOwnership(
  userId: string,
  address: string,
): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("wallet_accounts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("address", address.toLowerCase());

  if (error) {
    logger.error("cdp_staking_ownership_check_failed", {
      userId,
      address,
      error: error.message,
    });
    return false;
  }

  return (count ?? 0) > 0;
}

/** Allowed staking networks to prevent accidental testnet usage */
const ALLOWED_STAKING_NETWORKS: Record<string, string[]> = {
  eth: ["ethereum", "ethereum-sepolia", "holesky"],
  sol: ["solana", "solana-devnet"],
};

/**
 * Resolve the staking network for a given asset and optional override.
 * Rejects unknown networks to prevent silent fallback to testnets.
 */
function resolveStakingNetwork(asset: "eth" | "sol", network?: string): string {
  if (!network) {
    return DEFAULT_STAKING_NETWORKS[asset] ?? "ethereum";
  }

  const allowed = ALLOWED_STAKING_NETWORKS[asset] ?? [];
  if (!allowed.includes(network)) {
    throw new Error(
      `Unsupported staking network "${network}" for ${asset}. Allowed: ${allowed.join(", ")}`,
    );
  }

  return network;
}

/**
 * Build authentication headers for the CDP Staking REST API.
 * Uses the same API key credentials as the CDP SDK client.
 */
function buildStakingApiHeaders(): Record<string, string> {
  const keyId = process.env.CDP_API_KEY_ID?.trim() ?? "";
  const keySecret = process.env.CDP_API_KEY_SECRET?.trim() ?? "";

  if (!keyId || !keySecret) {
    throw new Error("CDP API credentials not configured for staking operations.");
  }

  // Use HTTP Basic Auth (API Key ID : API Key Secret) matching the CDP Platform API convention.
  // The CDP Staking API uses the same authentication scheme as the CDP Platform REST API.
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
  };
}

/**
 * Validate that the wallet address format matches the expected asset type.
 */
function validateAddressFormat(address: string, asset: "eth" | "sol"): void {
  if (asset === "eth" && !evmAddressRegex.test(address)) {
    throw new Error(`Invalid EVM address for ETH staking: ${address}`);
  }
  // Solana addresses are base58 encoded, typically 32-44 characters
  if (asset === "sol" && (address.length < 32 || address.length > 44)) {
    throw new Error(`Invalid Solana address for SOL staking: ${address}`);
  }
}

/**
 * Attempt to read cached data from Redis.
 */
async function getCached<T>(cacheKey: string): Promise<T | null> {
  if (!isRedisConfigured) return null;

  try {
    return await redis.get<T>(cacheKey);
  } catch (err) {
    logger.warn("cdp_staking_cache_read_failed", {
      key: cacheKey,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Store data in Redis cache.
 */
async function setCache(cacheKey: string, data: unknown, ttl: number): Promise<void> {
  if (!isRedisConfigured) return;

  try {
    await redis.set(cacheKey, data as UntypedJson, { ex: ttl });
  } catch (err) {
    logger.warn("cdp_staking_cache_write_failed", {
      key: cacheKey,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Make a request to the CDP Staking REST API.
 */
async function stakingApiFetch<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const url = `${CDP_STAKING_API_BASE}${path}`;
  const headers = buildStakingApiHeaders();

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => response.statusText);
    logger.error("cdp_staking_api_request_failed", {
      method,
      path,
      status: response.status,
      error: errorBody,
    });
    throw new Error(
      `CDP Staking API error (${response.status}): request failed`,
    );
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// stakeAsset
// ---------------------------------------------------------------------------

/**
 * Initiate a staking operation for ETH or SOL from a Nex Wallet.
 *
 * Flow:
 * 1. Validate inputs and address format
 * 2. Verify wallet ownership
 * 3. Attempt CDP SDK staking if available, otherwise fall back to REST API
 * 4. Return stake result with transaction hash
 *
 * For ETH: Submits a validator deposit or delegation to the Ethereum beacon chain.
 * For SOL: Delegates SOL to a Coinbase-managed validator.
 *
 * @param params - Stake parameters (address, amount in base units, asset)
 * @param userId - The authenticated user's ID for ownership verification
 * @returns Stake result with transaction hash and estimated APY
 */
export async function stakeAsset(
  params: StakeParams,
  userId: string,
): Promise<StakeResult> {
  const parsed = stakeParamsSchema.parse(params);

  // 1. Validate address format
  validateAddressFormat(parsed.walletAddress, parsed.asset);

  const isOwner = await verifyWalletOwnership(userId, parsed.walletAddress);

  if (!isOwner) {
    throw new Error(
      "Wallet ownership verification failed. The address is not linked to your account.",
    );
  }

  const network = resolveStakingNetwork(parsed.asset, parsed.network);

  logger.info("cdp_staking_stake_started", {
    userId,
    walletAddress: parsed.walletAddress,
    amount: parsed.amount,
    asset: parsed.asset,
    network,
  });

  try {
    let txHash: string;
    let stakeId: string;

    if (parsed.asset === "eth") {
      const cdp = await getCdpClient();
      if (!cdp) {
        throw new Error(
          "CDP server client not available. Check CDP_API_KEY_ID and CDP_API_KEY_SECRET.",
        );
      }
      const result = await stakeEth(cdp, parsed.walletAddress, parsed.amount, network);
      txHash = result.txHash;
      stakeId = result.stakeId;
    } else {
      const result = await stakeSol(userId, parsed.walletAddress, parsed.amount, network);
      txHash = result.txHash;
      stakeId = result.stakeId;
    }

    const estimatedApy = FALLBACK_APY[parsed.asset] ?? 0;

    // Invalidate cached positions for this wallet
    await invalidateStakingCache(parsed.walletAddress);

    logger.info("cdp_staking_stake_completed", {
      userId,
      walletAddress: parsed.walletAddress,
      stakeId,
      txHash,
      asset: parsed.asset,
      amount: parsed.amount,
    });

    return {
      stakeId,
      txHash,
      amount: parsed.amount,
      asset: parsed.asset,
      status: "pending",
      estimatedApy,
    };
  } catch (err) {
    logger.error("cdp_staking_stake_failed", {
      userId,
      walletAddress: parsed.walletAddress,
      asset: parsed.asset,
      amount: parsed.amount,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Stake ETH via CDP SDK or Staking REST API.
 *
 * Attempts to use the CDP SDK's EVM transaction signing to submit a staking
 * transaction. If the SDK does not expose a direct staking method, falls back
 * to the Coinbase Staking REST API for transaction construction, then signs
 * and submits via the CDP SDK.
 */
type EvmNetworkName = "ethereum" | "ethereum-sepolia";

async function stakeEth(
  cdp: CdpClientNonNull,
  walletAddress: string,
  amount: string,
  network: string,
): Promise<{ txHash: string; stakeId: string }> {
  // Use the Staking REST API to create a stake intent
  const stakeResponse = await stakingApiFetch<{
    id: string;
    transaction?: {
      to: string;
      value: string;
      data: string;
    };
    status: string;
  }>("POST", "/stakes", {
    protocol: "ethereum_kiln",
    network,
    action: "stake",
    parameters: {
      staker_address: walletAddress,
      amount: {
        value: amount,
        currency: "WEI",
      },
    },
  });

  const stakeId = stakeResponse.id;

  // If the API returns a transaction to sign, submit it via CDP SDK
  if (stakeResponse.transaction) {
    const tx = stakeResponse.transaction;
    const sendResult = await cdp.evm.sendTransaction({
      address: walletAddress as `0x${string}`,
      transaction: {
        to: tx.to as `0x${string}`,
        value: BigInt(tx.value || "0"),
        data: (tx.data || "0x") as `0x${string}`,
      },
      network: network as EvmNetworkName,
    });

    return { txHash: sendResult.transactionHash, stakeId };
  }

  // If no transaction is returned (e.g., queued for batch processing),
  // return the stake ID with a pending hash
  return {
    txHash: `pending:${stakeId}`,
    stakeId,
  };
}

/**
 * Stake SOL via CDP SDK or Staking REST API.
 *
 * Creates a staking delegation transaction for Solana and submits it
 * via the CDP SDK's Solana transaction signing.
 */
async function stakeSol(
  userId: string,
  walletAddress: string,
  amount: string,
  network: string,
): Promise<{ txHash: string; stakeId: string }> {
  // Use the Staking REST API to create a Solana stake intent
  const stakeResponse = await stakingApiFetch<{
    id: string;
    unsigned_transaction?: string;
    status: string;
  }>("POST", "/stakes", {
    protocol: "solana",
    network: network === "solana" ? "mainnet" : network,
    action: "stake",
    parameters: {
      staker_address: walletAddress,
      amount: {
        value: amount,
        currency: "LAMPORTS",
      },
    },
  });

  const stakeId = stakeResponse.id;

  if (stakeResponse.unsigned_transaction) {
    const sendResult = await sendCdpEmbeddedSolanaTransaction({
      userId,
      walletAddress,
      transaction: stakeResponse.unsigned_transaction,
      network: "solana",
    });

    return {
      txHash: sendResult.transactionSignature ?? `signed:${stakeId}`,
      stakeId,
    };
  }

  return {
    txHash: `pending:${stakeId}`,
    stakeId,
  };
}

// ---------------------------------------------------------------------------
// unstakeAsset
// ---------------------------------------------------------------------------

/**
 * Initiate an unstaking operation for ETH or SOL from a Nex Wallet.
 *
 * For ETH: Initiates a validator exit or withdrawal from the beacon chain.
 *          Note: ETH unstaking has an unbonding period.
 * For SOL: Deactivates and withdraws a Solana stake delegation.
 *
 * @param params - Unstake parameters
 * @param userId - The authenticated user's ID for ownership verification
 * @returns Unstake result with transaction hash
 */
export async function unstakeAsset(
  params: UnstakeParams,
  userId: string,
): Promise<StakeResult> {
  const parsed = unstakeParamsSchema.parse(params);

  // 1. Validate address format
  validateAddressFormat(parsed.walletAddress, parsed.asset);

  const isOwner = await verifyWalletOwnership(userId, parsed.walletAddress);

  if (!isOwner) {
    throw new Error(
      "Wallet ownership verification failed. The address is not linked to your account.",
    );
  }

  const network = resolveStakingNetwork(parsed.asset, parsed.network);

  logger.info("cdp_staking_unstake_started", {
    userId,
    walletAddress: parsed.walletAddress,
    amount: parsed.amount,
    asset: parsed.asset,
    stakeId: parsed.stakeId ?? null,
    network,
  });

  try {
    let txHash: string;
    let unstakeId: string;

    if (parsed.asset === "eth") {
      const cdp = await getCdpClient();
      if (!cdp) {
        throw new Error(
          "CDP server client not available. Check CDP_API_KEY_ID and CDP_API_KEY_SECRET.",
        );
      }
      const result = await unstakeEth(
        cdp,
        parsed.walletAddress,
        parsed.amount,
        network,
        parsed.stakeId,
      );
      txHash = result.txHash;
      unstakeId = result.unstakeId;
    } else {
      const result = await unstakeSol(
        userId,
        parsed.walletAddress,
        parsed.amount,
        network,
        parsed.stakeId,
      );
      txHash = result.txHash;
      unstakeId = result.unstakeId;
    }

    // Invalidate cached positions for this wallet
    await invalidateStakingCache(parsed.walletAddress);

    logger.info("cdp_staking_unstake_completed", {
      userId,
      walletAddress: parsed.walletAddress,
      unstakeId,
      txHash,
      asset: parsed.asset,
      amount: parsed.amount,
    });

    return {
      stakeId: unstakeId,
      txHash,
      amount: parsed.amount,
      asset: parsed.asset,
      status: "pending",
      estimatedApy: 0,
    };
  } catch (err) {
    logger.error("cdp_staking_unstake_failed", {
      userId,
      walletAddress: parsed.walletAddress,
      asset: parsed.asset,
      amount: parsed.amount,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Unstake ETH via the Staking REST API and CDP SDK for signing.
 */
async function unstakeEth(
  cdp: CdpClientNonNull,
  walletAddress: string,
  amount: string,
  network: string,
  stakeId?: string,
): Promise<{ txHash: string; unstakeId: string }> {
  const unstakeResponse = await stakingApiFetch<{
    id: string;
    transaction?: {
      to: string;
      value: string;
      data: string;
    };
    status: string;
  }>("POST", "/unstakes", {
    protocol: "ethereum_kiln",
    network,
    action: "unstake",
    parameters: {
      staker_address: walletAddress,
      amount: {
        value: amount,
        currency: "WEI",
      },
      ...(stakeId ? { stake_id: stakeId } : {}),
    },
  });

  const unstakeId = unstakeResponse.id;

  if (unstakeResponse.transaction) {
    const tx = unstakeResponse.transaction;
    const sendResult = await cdp.evm.sendTransaction({
      address: walletAddress as `0x${string}`,
      transaction: {
        to: tx.to as `0x${string}`,
        value: BigInt(tx.value || "0"),
        data: (tx.data || "0x") as `0x${string}`,
      },
      network: network as EvmNetworkName,
    });

    return { txHash: sendResult.transactionHash, unstakeId };
  }

  return {
    txHash: `pending:${unstakeId}`,
    unstakeId,
  };
}

/**
 * Unstake SOL via the Staking REST API and CDP SDK for signing.
 */
async function unstakeSol(
  userId: string,
  walletAddress: string,
  amount: string,
  network: string,
  stakeId?: string,
): Promise<{ txHash: string; unstakeId: string }> {
  const unstakeResponse = await stakingApiFetch<{
    id: string;
    unsigned_transaction?: string;
    status: string;
  }>("POST", "/unstakes", {
    protocol: "solana",
    network: network === "solana" ? "mainnet" : network,
    action: "unstake",
    parameters: {
      staker_address: walletAddress,
      amount: {
        value: amount,
        currency: "LAMPORTS",
      },
      ...(stakeId ? { stake_id: stakeId } : {}),
    },
  });

  const unstakeId = unstakeResponse.id;

  if (unstakeResponse.unsigned_transaction) {
    const sendResult = await sendCdpEmbeddedSolanaTransaction({
      userId,
      walletAddress,
      transaction: unstakeResponse.unsigned_transaction,
      network: "solana",
    });

    return {
      txHash: sendResult.transactionSignature ?? `signed:${unstakeId}`,
      unstakeId,
    };
  }

  return {
    txHash: `pending:${unstakeId}`,
    unstakeId,
  };
}

// ---------------------------------------------------------------------------
// getStakingPositions
// ---------------------------------------------------------------------------

/**
 * Retrieve active staking positions for a Nex Wallet address.
 *
 * Queries the Coinbase Staking API for all positions associated with the
 * given wallet address across supported protocols (ETH and SOL).
 *
 * Results are cached in Redis for 2 minutes.
 *
 * @param walletAddress - The wallet address to query
 * @param userId - The authenticated user's ID for ownership verification
 * @returns Array of staking positions
 */
export async function getStakingPositions(
  walletAddress: string,
  userId: string,
): Promise<StakingPosition[]> {
  // 1. Verify ownership and check cache in parallel (independent operations)
  const cacheKey = `${POSITIONS_CACHE_PREFIX}${walletAddress.toLowerCase()}`;
  const [isOwner, cached] = await Promise.all([
    verifyWalletOwnership(userId, walletAddress),
    getCached<StakingPosition[]>(cacheKey),
  ]);

  if (!isOwner) {
    throw new Error(
      "Wallet ownership verification failed. The address is not linked to your account.",
    );
  }

  if (cached) {
    logger.debug("cdp_staking_positions_cache_hit", { walletAddress });
    return cached;
  }

  logger.info("cdp_staking_positions_fetch_started", { userId, walletAddress });

  try {
    // 3. Query both ETH and SOL positions in parallel
    const [ethPositions, solPositions] = await Promise.allSettled([
      fetchProtocolPositions(walletAddress, "ethereum_kiln", "eth"),
      fetchProtocolPositions(walletAddress, "solana", "sol"),
    ]);

    const positions: StakingPosition[] = [];

    if (ethPositions.status === "fulfilled") {
      positions.push(...ethPositions.value);
    } else {
      logger.warn("cdp_staking_eth_positions_failed", {
        walletAddress,
        error: ethPositions.reason instanceof Error
          ? ethPositions.reason.message
          : String(ethPositions.reason),
      });
    }

    if (solPositions.status === "fulfilled") {
      positions.push(...solPositions.value);
    } else {
      logger.warn("cdp_staking_sol_positions_failed", {
        walletAddress,
        error: solPositions.reason instanceof Error
          ? solPositions.reason.message
          : String(solPositions.reason),
      });
    }

    // 4. Cache results
    await setCache(cacheKey, positions, POSITIONS_CACHE_TTL_SECONDS);

    logger.info("cdp_staking_positions_fetch_completed", {
      userId,
      walletAddress,
      positionCount: positions.length,
    });

    return positions;
  } catch (err) {
    logger.error("cdp_staking_positions_fetch_failed", {
      userId,
      walletAddress,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Fetch staking positions for a specific protocol from the Staking API.
 */
async function fetchProtocolPositions(
  walletAddress: string,
  protocol: string,
  asset: "eth" | "sol",
): Promise<StakingPosition[]> {
  const queryParams = new URLSearchParams({
    protocol,
    staker_address: walletAddress,
  });

  const response = await stakingApiFetch<{
    positions?: Array<{
      id: string;
      amount?: { value: string; currency: string };
      rewards?: { value: string; currency: string };
      apy?: number;
      status: string;
      created_at?: string;
      network?: string;
    }>;
  }>("GET", `/positions?${queryParams.toString()}`);

  const rawPositions = response.positions ?? [];

  return rawPositions.map((pos) => ({
    stakeId: pos.id,
    asset,
    amount: pos.amount?.value ?? "0",
    rewards: pos.rewards?.value ?? "0",
    apy: pos.apy ?? FALLBACK_APY[asset] ?? 0,
    status: mapPositionStatus(pos.status),
    startedAt: pos.created_at ?? new Date().toISOString(),
    network: pos.network ?? DEFAULT_STAKING_NETWORKS[asset] ?? "unknown",
  }));
}

/**
 * Map API position status to our internal status enum.
 *
 * Unknown statuses are mapped to "unknown" rather than silently defaulting
 * to "active", which could misrepresent failed/slashed/withdrawing positions.
 */
export function mapPositionStatus(
  apiStatus: string,
): "active" | "unbonding" | "completed" | "unknown" {
  const normalized = apiStatus.toLowerCase();
  if (normalized === "active" || normalized === "delegated" || normalized === "staked") {
    return "active";
  }
  if (
    normalized === "unbonding" ||
    normalized === "deactivating" ||
    normalized === "withdrawing" ||
    normalized === "pending_withdrawal"
  ) {
    return "unbonding";
  }
  if (
    normalized === "completed" ||
    normalized === "withdrawn" ||
    normalized === "inactive"
  ) {
    return "completed";
  }
  logger.warn("cdp_staking_unknown_position_status", {
    apiStatus,
    normalized,
  });
  return "unknown";
}

// ---------------------------------------------------------------------------
// getStakingRewards
// ---------------------------------------------------------------------------

/**
 * Retrieve accumulated staking rewards for a Nex Wallet address.
 *
 * Aggregates rewards across all active staking positions for both ETH and SOL.
 *
 * Results are cached in Redis for 2 minutes.
 *
 * @param walletAddress - The wallet address to query
 * @param userId - The authenticated user's ID for ownership verification
 * @returns Aggregated rewards data
 */
export async function getStakingRewards(
  walletAddress: string,
  userId: string,
): Promise<StakingRewardsResult> {
  // 1. Verify ownership and check cache in parallel (independent operations)
  const cacheKey = `${REWARDS_CACHE_PREFIX}${walletAddress.toLowerCase()}`;
  const [isOwner, cached] = await Promise.all([
    verifyWalletOwnership(userId, walletAddress),
    getCached<StakingRewardsResult>(cacheKey),
  ]);

  if (!isOwner) {
    throw new Error(
      "Wallet ownership verification failed. The address is not linked to your account.",
    );
  }

  if (cached) {
    logger.debug("cdp_staking_rewards_cache_hit", { walletAddress });
    return cached;
  }

  logger.info("cdp_staking_rewards_fetch_started", { userId, walletAddress });

  try {
    // 3. Query both ETH and SOL rewards in parallel
    const [ethRewards, solRewards] = await Promise.allSettled([
      fetchProtocolRewards(walletAddress, "ethereum_kiln", "eth"),
      fetchProtocolRewards(walletAddress, "solana", "sol"),
    ]);

    const positionRewards: StakingRewardsResult["positions"] = [];

    if (ethRewards.status === "fulfilled") {
      positionRewards.push(...ethRewards.value);
    } else {
      logger.warn("cdp_staking_eth_rewards_failed", {
        walletAddress,
        error: ethRewards.reason instanceof Error
          ? ethRewards.reason.message
          : String(ethRewards.reason),
      });
    }

    if (solRewards.status === "fulfilled") {
      positionRewards.push(...solRewards.value);
    } else {
      logger.warn("cdp_staking_sol_rewards_failed", {
        walletAddress,
        error: solRewards.reason instanceof Error
          ? solRewards.reason.message
          : String(solRewards.reason),
      });
    }

    // 4. Aggregate totals
    const totalRewards = positionRewards.reduce(
      (sum, r) => sum + BigInt(r.rewards || "0"),
      0n,
    ).toString();

    const totalRewardsUsd = positionRewards.reduce(
      (sum, r) => sum + r.rewardsUsd,
      0,
    );

    const result: StakingRewardsResult = {
      walletAddress,
      totalRewards,
      totalRewardsUsd,
      positions: positionRewards,
    };

    // 5. Cache results
    await setCache(cacheKey, result, REWARDS_CACHE_TTL_SECONDS);

    logger.info("cdp_staking_rewards_fetch_completed", {
      userId,
      walletAddress,
      positionCount: positionRewards.length,
      totalRewardsUsd,
    });

    return result;
  } catch (err) {
    logger.error("cdp_staking_rewards_fetch_failed", {
      userId,
      walletAddress,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Fetch rewards for a specific protocol from the Staking API.
 */
async function fetchProtocolRewards(
  walletAddress: string,
  protocol: string,
  asset: "eth" | "sol",
): Promise<StakingRewardsResult["positions"]> {
  const queryParams = new URLSearchParams({
    protocol,
    staker_address: walletAddress,
  });

  const response = await stakingApiFetch<{
    rewards?: Array<{
      stake_id: string;
      amount?: { value: string; currency: string };
      usd_value?: number;
      apy?: number;
    }>;
  }>("GET", `/rewards?${queryParams.toString()}`);

  const rawRewards = response.rewards ?? [];

  return rawRewards.map((r) => ({
    stakeId: r.stake_id,
    asset,
    rewards: r.amount?.value ?? "0",
    rewardsUsd: r.usd_value ?? 0,
    apy: r.apy ?? FALLBACK_APY[asset] ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Cache Invalidation
// ---------------------------------------------------------------------------

/**
 * Invalidate all cached staking data for a wallet address.
 * Called after stake/unstake operations to ensure fresh data.
 */
async function invalidateStakingCache(walletAddress: string): Promise<void> {
  if (!isRedisConfigured) return;

  const positionsKey = `${POSITIONS_CACHE_PREFIX}${walletAddress.toLowerCase()}`;
  const rewardsKey = `${REWARDS_CACHE_PREFIX}${walletAddress.toLowerCase()}`;

  try {
    await Promise.allSettled([
      redis.del(positionsKey),
      redis.del(rewardsKey),
    ]);
  } catch (err) {
    logger.warn("cdp_staking_cache_invalidation_failed", {
      walletAddress,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
