/**
 * CDP USDC Rewards Service
 *
 * Server-only module for fetching USDC rewards information for Nex Wallet
 * addresses. Computes yield estimates based on current USDC balance and
 * the prevailing Coinbase USDC rewards APY.
 *
 * Strategy:
 * 1. Fetch USDC balances across supported networks via CDP balance API
 * 2. Apply the current rewards APY to compute estimated earnings
 * 3. Cache results in Redis with a 5-minute TTL
 */
import "server-only";

import { getCdpClient } from "@/server/services/cdp/client";
import { redis, isRedisConfigured } from "@/server/services/redis";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UsdcRewardsNetworkBreakdown = {
  network: string;
  balance: string;
  earned: string;
};

export type UsdcRewardsInfo = {
  /** Total USDC earned across all networks */
  totalEarned: string;
  /** Current APY percentage (e.g., 4.1) */
  currentApy: number;
  /** Current USDC balance eligible for rewards */
  balance: string;
  /** ISO date of last rewards accrual estimate */
  lastAccrual: string | null;
  /** Per-network breakdown */
  networks: UsdcRewardsNetworkBreakdown[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Current Coinbase USDC rewards APY.
 *
 * As of early 2026, Coinbase offers ~4.1% APY on USDC.
 * This should be periodically updated or fetched from a live API
 * when one becomes available in the CDP SDK.
 */
const USDC_REWARDS_APY = 4.1;

/** USDC contract addresses on supported networks */
const USDC_CONTRACTS: Record<string, string> = {
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
};

/** Networks to check for USDC balance */
const REWARD_ELIGIBLE_NETWORKS = ["base", "ethereum"] as const;

/** Cache TTL for rewards data (5 minutes) */
const REWARDS_CACHE_TTL_SECONDS = 300;

/** Cache key prefix */
const REWARDS_CACHE_PREFIX = "cdp_usdc_rewards:";

// ---------------------------------------------------------------------------
// Cache Helpers
// ---------------------------------------------------------------------------

async function getCachedRewards(cacheKey: string): Promise<UsdcRewardsInfo | null> {
  if (!isRedisConfigured) return null;

  try {
    return await redis.get<UsdcRewardsInfo>(cacheKey);
  } catch (err) {
    logger.warn("usdc_rewards_cache_read_failed", {
      key: cacheKey,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function setCachedRewards(cacheKey: string, data: UsdcRewardsInfo): Promise<void> {
  if (!isRedisConfigured) return;

  try {
    await redis.set(cacheKey, data as unknown as UntypedJson, { ex: REWARDS_CACHE_TTL_SECONDS });
  } catch (err) {
    logger.warn("usdc_rewards_cache_write_failed", {
      key: cacheKey,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Balance Fetching
// ---------------------------------------------------------------------------

/**
 * Fetch the USDC token balance for a given address on a specific network.
 * Returns the balance as a human-readable string (6 decimals for USDC).
 */
async function fetchUsdcBalance(
  cdp: NonNullable<Awaited<ReturnType<typeof getCdpClient>>>,
  address: string,
  network: string,
): Promise<string> {
  try {
    const result = await cdp.evm.listTokenBalances({
      address: address as `0x${string}`,
      network: network as "base" | "base-sepolia" | "ethereum",
    });

    const balances = result.balances ?? [];
    const usdcContract = USDC_CONTRACTS[network]?.toLowerCase();

    if (!usdcContract) return "0";

    for (const tb of balances) {
      const tokenInfo = tb as {
        token: {
          contractAddress?: string;
          symbol?: string;
        };
        amount: {
          amount: bigint;
          decimals: number;
        };
      };

      const contractAddr = tokenInfo.token?.contractAddress?.toLowerCase() ?? "";
      if (contractAddr === usdcContract || tokenInfo.token?.symbol === "USDC") {
        const rawAmount = BigInt(String(tokenInfo.amount?.amount ?? "0"));
        const decimals = Number(tokenInfo.amount?.decimals ?? 6);
        return formatTokenAmount(rawAmount, decimals);
      }
    }

    return "0";
  } catch (err) {
    logger.warn("usdc_balance_fetch_failed", {
      address,
      network,
      error: err instanceof Error ? err.message : String(err),
    });
    return "0";
  }
}

/**
 * Format a raw token amount with its decimal places.
 */
function formatTokenAmount(amount: bigint, decimals: number): string {
  if (amount === 0n) return "0";

  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fractional = amount % divisor;

  if (fractional === 0n) return whole.toString();

  const fractionalStr = fractional.toString().padStart(decimals, "0");
  // Trim trailing zeros but keep at least 2 decimal places
  const trimmed = fractionalStr.replace(/0+$/, "");
  const displayFractional = trimmed.length < 2 ? trimmed.padEnd(2, "0") : trimmed;

  return `${whole}.${displayFractional}`;
}

/**
 * Estimate daily/annual earnings based on balance and APY.
 */
function estimateEarnings(balanceStr: string, apyPercent: number): string {
  const balance = parseFloat(balanceStr);
  if (balance <= 0 || apyPercent <= 0) return "0";

  // Annual earnings estimate
  const annualEarnings = balance * (apyPercent / 100);

  // Estimate based on time since USDC rewards typically accrue daily
  // For display purposes, show estimated annual earnings
  return annualEarnings.toFixed(2);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get USDC rewards information for a Nex Wallet address.
 *
 * Fetches USDC balances across eligible networks (Base, Ethereum),
 * computes estimated earnings based on the current APY, and returns
 * a structured rewards summary.
 *
 * @param walletAddress - The EVM wallet address to query
 * @param _userId - The authenticated user ID (for future audit logging)
 * @returns USDC rewards info with balance, APY, and per-network breakdown
 */
export async function getUsdcRewards(
  walletAddress: string,
  _userId: string,
): Promise<UsdcRewardsInfo> {
  const normalizedAddress = walletAddress.toLowerCase();
  const cacheKey = `${REWARDS_CACHE_PREFIX}${normalizedAddress}`;

  // 1. Check cache
  const cached = await getCachedRewards(cacheKey);
  if (cached) {
    logger.debug("usdc_rewards_cache_hit", { address: normalizedAddress });
    return cached;
  }

  // 2. Get CDP client
  const cdp = await getCdpClient();
  if (!cdp) {
    throw new Error("CDP server client not available. Check CDP_API_KEY_ID and CDP_API_KEY_SECRET.");
  }

  logger.debug("usdc_rewards_fetch_started", { address: normalizedAddress });

  // 3. Fetch USDC balances across all eligible networks
  const networkResults = await Promise.allSettled(
    REWARD_ELIGIBLE_NETWORKS.map(async (network) => {
      const balance = await fetchUsdcBalance(cdp, walletAddress, network);
      const earned = estimateEarnings(balance, USDC_REWARDS_APY);
      return { network, balance, earned };
    }),
  );

  const networks: UsdcRewardsNetworkBreakdown[] = [];
  let totalBalance = 0;
  let totalEarned = 0;

  for (const outcome of networkResults) {
    if (outcome.status === "fulfilled") {
      networks.push(outcome.value);
      totalBalance += parseFloat(outcome.value.balance);
      totalEarned += parseFloat(outcome.value.earned);
    }
  }

  const result: UsdcRewardsInfo = {
    totalEarned: totalEarned.toFixed(2),
    currentApy: USDC_REWARDS_APY,
    balance: totalBalance.toFixed(2),
    lastAccrual: totalBalance > 0 ? new Date().toISOString() : null,
    networks,
  };

  // 4. Cache result
  await setCachedRewards(cacheKey, result);

  logger.debug("usdc_rewards_fetch_completed", {
    address: normalizedAddress,
    balance: result.balance,
    apy: result.currentApy,
    networkCount: networks.length,
  });

  return result;
}
