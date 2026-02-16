/**
 * Staking Position Service
 *
 * Fetches liquid staking token balances (EVM) and native stake accounts (Solana).
 * Returns data as `Result<StakingPosition[], WalletError>` so callers never need
 * to catch exceptions from infrastructure code.
 *
 * SECURITY NOTES:
 * - This service is read-only; it does not handle signing.
 * - RPC endpoints are resolved from the central chain configuration.
 * - Client instances are cached and reused to avoid redundant handshakes.
 */

import {
  createPublicClient,
  http,
  formatUnits,
  type PublicClient,
  type Address,
} from 'viem';
import { mainnet } from 'viem/chains';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

import { getChainById, getSolanaChain } from '@config/chains';
import type { StakingPosition } from '@domain/wallet/entities/staking';
import { WalletError } from '@domain/common/errors/domain-error';
import { type Result, success, failure } from '@domain/common/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Solana Stake Program ID */
const SOLANA_STAKE_PROGRAM_ID = new PublicKey(
  'Stake11111111111111111111111111111111111111',
);

/** Default Solana staking APY (network average). */
const DEFAULT_SOLANA_APY = 6.5;

/** Ethereum mainnet chain ID. */
const ETHEREUM_MAINNET_CHAIN_ID = 1;

// ---------------------------------------------------------------------------
// Liquid staking tokens (Ethereum mainnet)
// ---------------------------------------------------------------------------

interface LiquidStakingToken {
  readonly symbol: string;
  readonly address: Address;
  readonly protocol: string;
  readonly decimals: number;
}

const LIQUID_STAKING_TOKENS: ReadonlyArray<LiquidStakingToken> = [
  {
    symbol: 'stETH',
    address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    protocol: 'Lido',
    decimals: 18,
  },
  {
    symbol: 'rETH',
    address: '0xae78736Cd615f374D3085123A210448E74Fc6393',
    protocol: 'Rocket Pool',
    decimals: 18,
  },
  {
    symbol: 'cbETH',
    address: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
    protocol: 'Coinbase',
    decimals: 18,
  },
] as const;

// ---------------------------------------------------------------------------
// ERC-20 ABI fragment for balanceOf
// ---------------------------------------------------------------------------

const ERC20_BALANCE_OF_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
] as const;

// ---------------------------------------------------------------------------
// Client caches
// ---------------------------------------------------------------------------

let _evmClient: PublicClient | null = null;
let _solanaConnection: Connection | null = null;

function getEvmClient(chainId: number): Result<PublicClient, WalletError> {
  if (chainId !== ETHEREUM_MAINNET_CHAIN_ID) {
    return failure(
      new WalletError(
        `Liquid staking positions only supported on Ethereum mainnet, got chainId: ${chainId}`,
      ),
    );
  }

  if (_evmClient) {
    return success(_evmClient);
  }

  const chainConfig = getChainById(chainId);
  const rpcUrl = chainConfig?.rpcUrl ?? 'https://ethereum.publicnode.com';

  _evmClient = createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl, {
      timeout: 15_000,
      retryCount: 2,
      retryDelay: 1_000,
    }),
  });

  return success(_evmClient);
}

function getSolanaConnection(): Connection {
  if (_solanaConnection) {
    return _solanaConnection;
  }

  const solanaChain = getSolanaChain();
  const rpcUrl = solanaChain?.rpcUrl ?? 'https://api.mainnet-beta.solana.com';

  _solanaConnection = new Connection(rpcUrl, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 30_000,
  });

  return _solanaConnection;
}

/**
 * Replace the cached Solana connection.
 * Useful for testing or switching between mainnet and devnet.
 */
export function setSolanaConnection(connection: Connection): void {
  _solanaConnection = connection;
}

/**
 * Replace the cached EVM client.
 * Useful for testing.
 */
export function setEvmClient(client: PublicClient): void {
  _evmClient = client;
}

/**
 * Clear all cached clients.
 * Useful for testing teardown.
 */
export function clearClientCache(): void {
  _evmClient = null;
  _solanaConnection = null;
}

// ---------------------------------------------------------------------------
// EVM Liquid Staking Positions
// ---------------------------------------------------------------------------

/**
 * Fetch EVM liquid staking positions for an address.
 *
 * Checks balances of known liquid staking tokens (stETH, rETH, cbETH) using
 * multicall. Only Ethereum mainnet is currently supported.
 *
 * @param address - The wallet address to check.
 * @param chainId - The EVM chain ID (must be 1 for now).
 * @param tokenPrices - Map of lowercase token symbol to USD price.
 * @returns An array of staking positions for tokens with non-zero balances.
 */
export async function fetchEvmStakingPositions(
  address: string,
  chainId: number,
  tokenPrices: Readonly<Record<string, number>>,
): Promise<Result<ReadonlyArray<StakingPosition>, WalletError>> {
  const clientResult = getEvmClient(chainId);
  if (!clientResult.ok) {
    return clientResult;
  }

  const client = clientResult.value;

  try {
    // Build multicall contracts array
    const contracts = LIQUID_STAKING_TOKENS.map((token) => ({
      address: token.address,
      abi: ERC20_BALANCE_OF_ABI,
      functionName: 'balanceOf' as const,
      args: [address as Address],
    }));

    type MulticallResult =
      | { readonly status: 'success'; readonly result: bigint }
      | { readonly status: 'failure'; readonly error: Error };

    const results = (await client.multicall({
      contracts,
      allowFailure: true,
    })) as unknown as ReadonlyArray<MulticallResult>;

    const positions: StakingPosition[] = [];

    for (let i = 0; i < LIQUID_STAKING_TOKENS.length; i++) {
      const token = LIQUID_STAKING_TOKENS[i];
      const result = results[i];

      if (!token || !result) continue;

      const balance =
        result.status === 'success' && typeof result.result === 'bigint'
          ? result.result
          : 0n;

      // Skip zero balances
      if (balance === 0n) continue;

      const amountStakedFormatted = formatUnits(balance, token.decimals);
      const price = tokenPrices[token.symbol.toLowerCase()] ?? 0;
      const amountStakedUsd = parseFloat(amountStakedFormatted) * price;

      // Liquid staking tokens do not have separate claimable rewards;
      // rewards accrue as token value appreciation.
      // Note: apy and unlockDate are omitted (optional fields).
      const position: StakingPosition = {
        id: `evm-${chainId}-${token.address.toLowerCase()}`,
        chain: 'evm',
        chainId,
        protocolName: token.protocol,
        stakedTokenSymbol: token.symbol,
        stakedTokenAddress: token.address,
        amountStaked: balance.toString(),
        amountStakedFormatted,
        amountStakedUsd,
        rewardsAccrued: '0',
        rewardsAccruedUsd: 0,
        canUnstake: true,
        canClaimRewards: false,
      };
      positions.push(position);
    }

    return success(positions);
  } catch (err) {
    return failure(
      new WalletError(
        `Failed to fetch EVM staking positions: ${err instanceof Error ? err.message : String(err)}`,
        address,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Solana Native Staking Positions
// ---------------------------------------------------------------------------

/**
 * Parsed stake account info from Solana RPC.
 */
interface ParsedStakeAccountInfo {
  readonly stake?: {
    readonly delegation?: {
      readonly stake?: string;
      readonly voter?: string;
      readonly activationEpoch?: string;
      readonly deactivationEpoch?: string;
    };
  };
  readonly meta?: {
    readonly authorized?: {
      readonly staker?: string;
      readonly withdrawer?: string;
    };
  };
}

/**
 * Fetch Solana native staking positions for an address.
 *
 * Uses `getParsedProgramAccounts` to find stake accounts where the address
 * is authorized as the staker or withdrawer.
 *
 * @param address - The Solana wallet address to check.
 * @param solUsdPrice - Current SOL/USD price for value calculation.
 * @returns An array of staking positions for active stake accounts.
 */
export async function fetchSolanaStakingPositions(
  address: string,
  solUsdPrice: number,
): Promise<Result<ReadonlyArray<StakingPosition>, WalletError>> {
  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(address);
  } catch {
    return failure(new WalletError(`Invalid Solana address: ${address}`, address));
  }

  const connection = getSolanaConnection();

  try {
    // Fetch all stake accounts where this address is authorized
    const stakeAccounts = await connection.getParsedProgramAccounts(
      SOLANA_STAKE_PROGRAM_ID,
      {
        filters: [
          {
            memcmp: {
              offset: 12, // Staker pubkey offset in stake account
              bytes: pubkey.toBase58(),
            },
          },
        ],
      },
    );

    const positions: StakingPosition[] = [];

    for (const { pubkey: accountPubkey, account } of stakeAccounts) {
      // Parse account data
      const parsed = account.data as {
        readonly parsed?: {
          readonly info?: ParsedStakeAccountInfo;
          readonly type?: string;
        };
        readonly program?: string;
      };

      if (parsed.program !== 'stake' || parsed.parsed?.type !== 'delegated') {
        continue;
      }

      const info = parsed.parsed?.info;
      const delegation = info?.stake?.delegation;

      if (!delegation?.stake) {
        continue;
      }

      const stakeLamports = BigInt(delegation.stake);
      if (stakeLamports === 0n) continue;

      const amountStakedFormatted = (
        Number(stakeLamports) / LAMPORTS_PER_SOL
      ).toFixed(9);
      const amountStakedUsd = parseFloat(amountStakedFormatted) * solUsdPrice;

      // Truncate validator address for display
      const validatorAddress = delegation.voter ?? 'Unknown';
      const validatorLabel =
        validatorAddress.length > 8
          ? `${validatorAddress.slice(0, 4)}...${validatorAddress.slice(-4)}`
          : validatorAddress;

      // Note: unlockDate is omitted (optional field).
      const position: StakingPosition = {
        id: `solana-stake-${accountPubkey.toBase58()}`,
        chain: 'solana',
        chainId: 'solana-mainnet',
        protocolName: `Solana Stake (${validatorLabel})`,
        stakedTokenSymbol: 'SOL',
        stakedTokenAddress: accountPubkey.toBase58(),
        amountStaked: stakeLamports.toString(),
        amountStakedFormatted,
        amountStakedUsd,
        rewardsAccrued: '0',
        rewardsAccruedUsd: 0,
        apy: DEFAULT_SOLANA_APY,
        canUnstake: true,
        canClaimRewards: false,
      };
      positions.push(position);
    }

    return success(positions);
  } catch (err) {
    return failure(
      new WalletError(
        `Failed to fetch Solana staking positions: ${err instanceof Error ? err.message : String(err)}`,
        address,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Aggregate fetcher
// ---------------------------------------------------------------------------

export interface FetchStakingPositionsParams {
  readonly address: string;
  readonly chainType: 'evm' | 'solana';
  readonly chainId: number | string;
  readonly tokenPrices: Readonly<Record<string, number>>;
}

/**
 * Fetch staking positions for a given address and chain type.
 *
 * This is a convenience wrapper that delegates to the chain-specific
 * fetchers based on chainType.
 */
export async function fetchStakingPositions(
  params: FetchStakingPositionsParams,
): Promise<Result<ReadonlyArray<StakingPosition>, WalletError>> {
  const { address, chainType, chainId, tokenPrices } = params;

  if (chainType === 'evm') {
    const numericChainId = typeof chainId === 'number' ? chainId : parseInt(chainId, 10);
    if (isNaN(numericChainId)) {
      return failure(new WalletError(`Invalid EVM chainId: ${chainId}`));
    }
    return fetchEvmStakingPositions(address, numericChainId, tokenPrices);
  }

  if (chainType === 'solana') {
    const solPrice = tokenPrices['sol'] ?? tokenPrices['solana'] ?? 0;
    return fetchSolanaStakingPositions(address, solPrice);
  }

  return failure(
    new WalletError(`Staking not supported for chain type: ${chainType}`),
  );
}
