/**
 * ERC-20 Token Allowance Service
 *
 * Provides read operations for fetching token allowances (approvals) granted
 * to third-party spender addresses, and prepares unsigned revoke transactions.
 *
 * Uses viem for on-chain reads via multicall batching. Write operations return
 * unsigned transaction data; actual signing is delegated to wallet-manager.
 *
 * Each public method returns a `Result<T, WalletError>` so that callers never
 * need to catch exceptions from infrastructure code.
 *
 * SECURITY NOTES:
 * - No private key material is handled here.
 * - RPC URLs are resolved from the central chain configuration.
 * - Revoke operations return unsigned calldata only; no signing occurs.
 */

import {
  createPublicClient,
  http,
  formatUnits,
  encodeFunctionData,
  type PublicClient,
  type Chain,
  type Address,
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

import { getChainById } from '@config/chains';
import type { TokenAllowance } from '@domain/wallet/entities/allowance';
import { isUnlimitedAllowance } from '@domain/wallet/entities/allowance';
import { WalletError } from '@domain/common/errors/domain-error';
import { type Result, success, failure } from '@domain/common/types';

// ---------------------------------------------------------------------------
// Chain mapping (viem chain objects keyed by numeric chain id)
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
} as const;

// ---------------------------------------------------------------------------
// Well-known spender addresses (DeFi routers, aggregators)
// ---------------------------------------------------------------------------

const WELL_KNOWN_SPENDERS: ReadonlyArray<{
  readonly address: string;
  readonly label: string;
}> = [
  { address: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', label: 'Uniswap V3 Router' },
  { address: '0xDef1C0ded9bec7F1a1670819833240f027b25EfF', label: '0x Exchange Proxy' },
  { address: '0x1111111254EEB25477B68fb85Ed929f73A960582', label: '1inch Router V5' },
  { address: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F', label: 'SushiSwap Router' },
] as const;

// ---------------------------------------------------------------------------
// ERC-20 ABI fragments
// ---------------------------------------------------------------------------

const ERC20_ALLOWANCE_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// ---------------------------------------------------------------------------
// Address validation
// ---------------------------------------------------------------------------

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function isValidEvmAddress(address: string): boolean {
  return EVM_ADDRESS_RE.test(address);
}

// ---------------------------------------------------------------------------
// Client cache
// ---------------------------------------------------------------------------

const clientCache = new Map<number, PublicClient>();

function getClient(chainId: number): Result<PublicClient, WalletError> {
  const cached = clientCache.get(chainId);
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

  clientCache.set(chainId, client);
  return success(client);
}

// ---------------------------------------------------------------------------
// Helper: resolve spender label
// ---------------------------------------------------------------------------

function resolveSpenderLabel(spenderAddress: string): string | undefined {
  const normalizedSpender = spenderAddress.toLowerCase();
  const knownSpender = WELL_KNOWN_SPENDERS.find(
    (s) => s.address.toLowerCase() === normalizedSpender,
  );
  return knownSpender?.label;
}

// ---------------------------------------------------------------------------
// Public API: Token input type
// ---------------------------------------------------------------------------

export interface TokenInfo {
  readonly address: string;
  readonly symbol: string;
  readonly decimals: number;
}

// ---------------------------------------------------------------------------
// Public API: fetchAllowances
// ---------------------------------------------------------------------------

/**
 * Fetch all non-zero ERC-20 allowances for the given owner address on a chain.
 *
 * Queries each token against a list of well-known spenders (DEX routers,
 * aggregators) using multicall batching for efficiency.
 *
 * @param ownerAddress - The wallet address to check allowances for.
 * @param chainId - The EVM chain ID.
 * @param tokenAddresses - List of tokens to check.
 * @returns Result containing an array of TokenAllowance or a WalletError.
 */
export async function fetchAllowances(
  ownerAddress: string,
  chainId: number,
  tokenAddresses: ReadonlyArray<TokenInfo>,
): Promise<Result<ReadonlyArray<TokenAllowance>, WalletError>> {
  // Validate owner address
  if (!isValidEvmAddress(ownerAddress)) {
    return failure(new WalletError(`Invalid owner address: ${ownerAddress}`, ownerAddress));
  }

  // No tokens to check
  if (tokenAddresses.length === 0) {
    return success([]);
  }

  // Get or create client
  const clientResult = getClient(chainId);
  if (!clientResult.ok) return clientResult;

  const client = clientResult.value;

  try {
    // Build multicall contracts array: for each token × each spender
    const contracts: ReadonlyArray<{
      readonly address: Address;
      readonly abi: typeof ERC20_ALLOWANCE_ABI;
      readonly functionName: 'allowance';
      readonly args: readonly [Address, Address];
    }> = tokenAddresses.flatMap((token) =>
      WELL_KNOWN_SPENDERS.map((spender) => ({
        address: token.address as Address,
        abi: ERC20_ALLOWANCE_ABI,
        functionName: 'allowance' as const,
        args: [ownerAddress as Address, spender.address as Address] as const,
      })),
    );

    // Execute multicall
    type MultiResult =
      | { readonly status: 'success'; readonly result: bigint }
      | { readonly status: 'failure'; readonly error: Error };

    const results = (await client.multicall({
      contracts,
      allowFailure: true,
    })) as ReadonlyArray<MultiResult>;

    // Process results and filter out zero allowances
    const allowances: TokenAllowance[] = [];
    const spenderCount = WELL_KNOWN_SPENDERS.length;

    for (let tokenIndex = 0; tokenIndex < tokenAddresses.length; tokenIndex++) {
      const token = tokenAddresses[tokenIndex];
      if (!token) continue;

      for (let spenderIndex = 0; spenderIndex < spenderCount; spenderIndex++) {
        const spender = WELL_KNOWN_SPENDERS[spenderIndex];
        if (!spender) continue;

        const resultIndex = tokenIndex * spenderCount + spenderIndex;
        const result = results[resultIndex];

        // Skip failed calls or zero allowances
        if (!result || result.status !== 'success') continue;
        if (result.result === 0n) continue;

        const allowanceRaw = result.result.toString();
        const allowanceFormatted = formatUnits(result.result, token.decimals);
        const unlimited = isUnlimitedAllowance(allowanceRaw);
        const spenderLabel = resolveSpenderLabel(spender.address);

        // Build allowance object, conditionally including spenderLabel
        // to satisfy exactOptionalPropertyTypes
        const allowance: TokenAllowance = {
          id: `${chainId}-${token.address.toLowerCase()}-${spender.address.toLowerCase()}`,
          chainId,
          tokenSymbol: token.symbol,
          tokenAddress: token.address,
          tokenDecimals: token.decimals,
          spenderAddress: spender.address,
          allowanceRaw,
          allowanceFormatted,
          isUnlimited: unlimited,
          ...(spenderLabel !== undefined && { spenderLabel }),
        };

        allowances.push(allowance);
      }
    }

    return success(allowances);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failure(
      new WalletError(
        `Failed to fetch allowances on chain ${chainId}: ${message}`,
        ownerAddress,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Public API: revokeAllowance
// ---------------------------------------------------------------------------

export interface UnsignedTransaction {
  readonly to: string;
  readonly data: string;
}

export interface RevokeAllowanceResult {
  readonly unsignedTx: UnsignedTransaction;
}

/**
 * Prepare an unsigned ERC-20 revoke (approve to 0) transaction.
 *
 * Does not execute the transaction; the wallet-manager is responsible for
 * signing and broadcasting.
 *
 * @param chainId - The EVM chain ID (used for validation only).
 * @param tokenAddress - The ERC-20 token contract address.
 * @param spenderAddress - The spender address to revoke.
 * @returns Result containing the unsigned transaction or a WalletError.
 */
export async function revokeAllowance(
  chainId: number,
  tokenAddress: string,
  spenderAddress: string,
): Promise<Result<RevokeAllowanceResult, WalletError>> {
  // Validate chain support
  const viemChain = VIEM_CHAINS[chainId];
  if (!viemChain) {
    return failure(new WalletError(`Unsupported EVM chain: ${chainId}`));
  }

  // Validate addresses
  if (!isValidEvmAddress(tokenAddress)) {
    return failure(new WalletError(`Invalid token address: ${tokenAddress}`));
  }

  if (!isValidEvmAddress(spenderAddress)) {
    return failure(new WalletError(`Invalid spender address: ${spenderAddress}`));
  }

  try {
    // Encode approve(spender, 0) calldata
    const data = encodeFunctionData({
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: [spenderAddress as Address, 0n],
    });

    return success({
      unsignedTx: {
        to: tokenAddress,
        data,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failure(new WalletError(`Failed to encode revoke transaction: ${message}`));
  }
}

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------

export { WELL_KNOWN_SPENDERS, VIEM_CHAINS, clientCache };
