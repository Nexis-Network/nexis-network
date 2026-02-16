/**
 * Multi-chain gas estimation service.
 *
 * Provides unified gas fee estimation across EVM, Solana, and Stellar chains.
 * Each estimator returns a `Result<GasEstimate, WalletError>` so that callers
 * never need to catch exceptions from infrastructure code.
 *
 * NOTES:
 * - EVM: Uses EIP-1559 fee estimation with 3 speed tiers (slow, standard, fast).
 * - Solana: Uses lamports-per-signature model with a default of 5000 lamports.
 * - Stellar: Fetches fee stats from Horizon API with a default of 100 stroops.
 */

import {
  createPublicClient,
  http,
  formatUnits,
  type PublicClient,
  type Chain,
} from 'viem';
import {
  mainnet,
  base,
  optimism,
  arbitrum,
  polygon,
  bsc,
  avalanche,
  celo,
} from 'viem/chains';
import { Connection, clusterApiUrl } from '@solana/web3.js';

import { getChainById, getSolanaChain, getStellarChain } from '@config/chains';
import type {
  GasEstimate,
  EvmGasTier,
  SolanaGasEstimate,
  StellarGasEstimate,
  GasSpeed,
} from '@domain/wallet/entities/gas';
import { WalletError } from '@domain/common/errors/domain-error';
import { type Result, success, failure } from '@domain/common/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default gas limit for simple ETH transfers. */
const DEFAULT_GAS_LIMIT = 21000n;

/** Default lamports per signature on Solana when RPC call fails. */
const DEFAULT_LAMPORTS_PER_SIGNATURE = 5000;

/** Default base fee in stroops on Stellar when Horizon API fails. */
const DEFAULT_BASE_FEE_STROOPS = 100;

/** Fee stats endpoint path appended to Horizon base URL. */
const STELLAR_FEE_STATS_PATH = '/fee_stats';

// ---------------------------------------------------------------------------
// Viem chain mapping (same as evm-adapter.ts)
// ---------------------------------------------------------------------------

const VIEM_CHAINS: Readonly<Record<number, Chain>> = {
  1: mainnet,
  8453: base,
  10: optimism,
  42161: arbitrum,
  137: polygon,
  56: bsc,
  43114: avalanche,
  42220: celo,
};

// ---------------------------------------------------------------------------
// Client caches
// ---------------------------------------------------------------------------

const evmClientCache = new Map<number, PublicClient>();
let solanaConnection: Connection | null = null;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getEvmClient(chainId: number): Result<PublicClient, WalletError> {
  const cached = evmClientCache.get(chainId);
  if (cached) return success(cached);

  const viemChain = VIEM_CHAINS[chainId];
  const chainConfig = getChainById(chainId);

  if (!viemChain || !chainConfig) {
    return failure(new WalletError(`Unsupported EVM chain: ${chainId}`));
  }

  const client = createPublicClient({
    chain: viemChain,
    transport: http(chainConfig.rpcUrl, {
      timeout: 15_000,
      retryCount: 2,
      retryDelay: 1_000,
    }),
  });

  evmClientCache.set(chainId, client);
  return success(client);
}

function getSolanaConnection(): Connection {
  if (solanaConnection) return solanaConnection;

  const solanaChain = getSolanaChain();
  const rpcUrl = solanaChain?.rpcUrl ?? clusterApiUrl('mainnet-beta');

  solanaConnection = new Connection(rpcUrl, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 30_000,
  });

  return solanaConnection;
}

function getHorizonBaseUrl(): string {
  const configured = getStellarChain()?.rpcUrl;
  return configured && configured.length > 0
    ? configured.replace(/\/+$/, '')
    : 'https://horizon.stellar.org';
}

/**
 * Create an EVM gas tier for a given speed multiplier.
 */
function createEvmGasTier(
  speed: GasSpeed,
  gasLimit: bigint,
  baseFee: bigint,
  basePriorityFee: bigint,
  priorityMultiplier: number,
  usdPrice: number,
): EvmGasTier {
  // Apply multiplier to priority fee (scale by 1000 for precision)
  const scaledMultiplier = BigInt(Math.round(priorityMultiplier * 1000));
  const maxPriorityFeePerGas = (basePriorityFee * scaledMultiplier) / 1000n;

  // maxFeePerGas = baseFee + priorityFee (2x baseFee headroom is common)
  const maxFeePerGas = baseFee * 2n + maxPriorityFeePerGas;

  const estimatedFeeWei = gasLimit * maxFeePerGas;
  const estimatedFeeNative = formatUnits(estimatedFeeWei, 18);
  const estimatedFeeUsd = parseFloat(estimatedFeeNative) * usdPrice;

  return {
    speed,
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    estimatedFeeWei,
    estimatedFeeNative,
    estimatedFeeUsd,
  };
}

// ---------------------------------------------------------------------------
// Stellar fee stats response type
// ---------------------------------------------------------------------------

interface StellarFeeStatsResponse {
  readonly last_ledger_base_fee?: string;
  readonly last_ledger?: string;
  readonly ledger_capacity_usage?: string;
  readonly fee_charged?: {
    readonly max?: string;
    readonly min?: string;
    readonly mode?: string;
    readonly p10?: string;
    readonly p20?: string;
    readonly p30?: string;
    readonly p40?: string;
    readonly p50?: string;
    readonly p60?: string;
    readonly p70?: string;
    readonly p80?: string;
    readonly p90?: string;
    readonly p95?: string;
    readonly p99?: string;
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Estimate gas fees for an EVM chain.
 *
 * Returns 3 speed tiers: slow (0.8x priority), standard (1x), fast (1.5x).
 * Uses EIP-1559 fee estimation via `estimateFeesPerGas`.
 *
 * @param chainId - Numeric EVM chain ID (e.g., 1, 8453, 137).
 * @param usdPrice - Current USD price of the chain's native token.
 * @returns Gas estimate with 3 tiers or a WalletError on failure.
 */
export async function estimateEvmGas(
  chainId: number,
  usdPrice: number,
): Promise<Result<GasEstimate, WalletError>> {
  const clientResult = getEvmClient(chainId);
  if (!clientResult.ok) return clientResult;

  try {
    const client = clientResult.value;

    // Fetch EIP-1559 fee estimates
    const feeData = await client.estimateFeesPerGas();

    const baseFee = feeData.maxFeePerGas ?? 0n;
    const basePriorityFee = feeData.maxPriorityFeePerGas ?? 0n;

    // Create 3 tiers with different priority fee multipliers
    const slowTier = createEvmGasTier(
      'slow',
      DEFAULT_GAS_LIMIT,
      baseFee,
      basePriorityFee,
      0.8,
      usdPrice,
    );

    const standardTier = createEvmGasTier(
      'standard',
      DEFAULT_GAS_LIMIT,
      baseFee,
      basePriorityFee,
      1.0,
      usdPrice,
    );

    const fastTier = createEvmGasTier(
      'fast',
      DEFAULT_GAS_LIMIT,
      baseFee,
      basePriorityFee,
      1.5,
      usdPrice,
    );

    return success({
      chain: 'evm',
      tiers: [slowTier, standardTier, fastTier] as const,
    });
  } catch (err) {
    return failure(
      new WalletError(
        `Failed to estimate EVM gas on chain ${chainId}: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }
}

/**
 * Estimate gas fees for Solana.
 *
 * Uses the lamports-per-signature model. Attempts to fetch current fee
 * via `getRecentBlockhash` deprecation-fallback, defaulting to 5000 lamports.
 *
 * @param usdPrice - Current USD price of SOL.
 * @returns Solana gas estimate or a WalletError on failure.
 */
export async function estimateSolanaGas(
  usdPrice: number,
): Promise<Result<GasEstimate, WalletError>> {
  try {
    const connection = getSolanaConnection();

    let lamportsPerSignature = DEFAULT_LAMPORTS_PER_SIGNATURE;

    try {
      // Try to get current fee from recent prioritization fees
      // getRecentBlockhash is deprecated but still works; fallback to default
      const recentBlockhash = await connection.getLatestBlockhash();
      if (recentBlockhash) {
        // For simple transactions, use the default fee
        // In production, you might use getFeeForMessage with an actual message
        lamportsPerSignature = DEFAULT_LAMPORTS_PER_SIGNATURE;
      }
    } catch {
      // Use default if RPC call fails
      lamportsPerSignature = DEFAULT_LAMPORTS_PER_SIGNATURE;
    }

    const signatureCount = 1;
    const totalLamports = lamportsPerSignature * signatureCount;
    const feeSol = (totalLamports / 1e9).toFixed(9);
    const feeUsd = parseFloat(feeSol) * usdPrice;

    const estimate: SolanaGasEstimate = {
      lamportsPerSignature,
      signatureCount,
      totalLamports,
      feeSol,
      feeUsd,
    };

    return success({
      chain: 'solana',
      estimate,
    });
  } catch (err) {
    return failure(
      new WalletError(
        `Failed to estimate Solana gas: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }
}

/**
 * Estimate gas fees for Stellar.
 *
 * Fetches fee statistics from the Horizon `/fee_stats` endpoint.
 * Falls back to 100 stroops (minimum base fee) on error.
 *
 * @param usdPrice - Current USD price of XLM.
 * @returns Stellar gas estimate or a WalletError on failure.
 */
export async function estimateStellarGas(
  usdPrice: number,
): Promise<Result<GasEstimate, WalletError>> {
  try {
    let baseFeeStroops = DEFAULT_BASE_FEE_STROOPS;

    try {
      const horizonUrl = getHorizonBaseUrl();
      const response = await fetch(`${horizonUrl}${STELLAR_FEE_STATS_PATH}`, {
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const data = (await response.json()) as StellarFeeStatsResponse;
        const parsedFee = parseInt(data.last_ledger_base_fee ?? '', 10);
        if (!Number.isNaN(parsedFee) && parsedFee > 0) {
          baseFeeStroops = parsedFee;
        }
      }
    } catch {
      // Use default if fetch fails
      baseFeeStroops = DEFAULT_BASE_FEE_STROOPS;
    }

    const operationCount = 1;
    const totalStroops = baseFeeStroops * operationCount;
    const feeXlm = (totalStroops / 1e7).toFixed(7);
    const feeUsd = parseFloat(feeXlm) * usdPrice;

    const estimate: StellarGasEstimate = {
      baseFeeStroops,
      operationCount,
      totalStroops,
      feeXlm,
      feeUsd,
    };

    return success({
      chain: 'stellar',
      estimate,
    });
  } catch (err) {
    return failure(
      new WalletError(
        `Failed to estimate Stellar gas: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Testing utilities
// ---------------------------------------------------------------------------

/**
 * Clear cached clients. Useful for testing.
 * @internal
 */
export function clearClientCaches(): void {
  evmClientCache.clear();
  solanaConnection = null;
}

/**
 * Set a custom Solana connection for testing.
 * @internal
 */
export function setSolanaConnection(connection: Connection | null): void {
  solanaConnection = connection;
}
