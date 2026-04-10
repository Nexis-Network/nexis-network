/**
 * Nex Wallet Client Factory
 * Creates Viem public and bundler clients for ERC-4337 operations
 * 
 * NOTE: Paymaster configured - users have gas fees sponsored
 */

import { createPublicClient, http, type Chain, type PublicClient, type Transport } from "viem";
import { createSmartAccountClient, type SmartAccountClient } from "permissionless";
import { createBundlerClient, type BundlerClient } from "viem/account-abstraction";
import type { SmartAccount } from "viem/account-abstraction";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { getEntryPointVersion } from "@/modules/wallets/nex/env"; // Assuming this exists or imports need adj
import { ENTRY_POINT_ADDRESSES } from "@/modules/wallets/nex/safe-account";
import { getViemChain, getBundlerUrl } from "./chains";
import { ensurePimlicoApiKey } from "./env";

/**
 * Cache for public clients to avoid recreating them
 */
const publicClientCache = new Map<number, PublicClient>();

/**
 * Cache for bundler clients to avoid recreating them
 * Key format: chainId (bundler URL is derived from chainId)
 */
const bundlerClientCache = new Map<number, BundlerClient>();

/**
 * Create a public client for reading chain state
 */
export function createNexPublicClient(chainId: number): PublicClient {
  // Check cache first
  const cached = publicClientCache.get(chainId);
  if (cached) {
    return cached;
  }

  const chain = getViemChain(chainId);
  if (!chain) {
    throw new Error(`Chain ${chainId} is not supported`);
  }

  const client = createPublicClient({
    chain,
    transport: http(),
  });

  publicClientCache.set(chainId, client);
  return client;
}

/**
 * Create a bundler client for submitting UserOperations
 * This client connects to Pimlico's bundler for the specified chain.
 * Clients are cached to avoid recreating them on every call.
 */
export function createNexBundlerClient(chainId: number): BundlerClient {
  // Check cache first
  const cached = bundlerClientCache.get(chainId);
  if (cached) {
    return cached;
  }

  const chain = getViemChain(chainId);
  if (!chain) {
    throw new Error(`Chain ${chainId} is not supported`);
  }

  const bundlerUrl = getBundlerUrl(chainId);

  const client = createBundlerClient({
    chain,
    transport: http(bundlerUrl),
  }) as BundlerClient;

  bundlerClientCache.set(chainId, client);
  return client;
}

/**
 * Clear all cached clients (useful for testing or when API keys change)
 */
export function clearClientCaches(): void {
  publicClientCache.clear();
  bundlerClientCache.clear();
}

/**
 * Create a smart account client for a given smart account
 * 
 * This client combines public client + bundler client functionality
 * and can be used to send UserOperations from the smart account.
 * 
 * NOTE: No paymaster is configured - the smart account must have
 * sufficient native token balance to pay for gas.
 * 
 * @param account - The smart account instance (e.g., Safe account)
 * @param chainId - The chain ID to operate on
 */
export function createNexSmartAccountClient<TAccount extends SmartAccount>({
  account,
  chainId,
}: {
  account: TAccount;
  chainId: number;
}): SmartAccountClient<Transport, Chain, TAccount> {
  const chain = getViemChain(chainId);
  if (!chain) {
    throw new Error(`Chain ${chainId} is not supported`);
  }

  const bundlerUrl = getBundlerUrl(chainId);
  const entryPointVersion = getEntryPointVersion();
  const entryPointAddress = ENTRY_POINT_ADDRESSES[entryPointVersion];

    // Create Paymaster Client
    const paymasterUrl = getBundlerUrl(chainId);
    const paymasterClient = createPimlicoClient({
      transport: http(paymasterUrl),
      entryPoint: {
        address: entryPointAddress,
        version: entryPointVersion,
      },
    });

    // Create smart account client WITH paymaster
    // User gas fees are sponsored by Pimlico
    return createSmartAccountClient({
      account,
      chain,
      bundlerTransport: http(bundlerUrl),
      paymaster: paymasterClient,
      userOperation: {
        estimateFeesPerGas: async () => {
          return (await paymasterClient.getUserOperationGasPrice()).fast;
        },
      },
    });
}

/**
 * Get chain configuration with clients ready to use
 */
export interface NexChainClients {
  chainId: number;
  chain: Chain;
  publicClient: PublicClient;
  bundlerClient: BundlerClient;
}

/**
 * Create all necessary clients for a chain
 */
export function createNexChainClients(chainId: number): NexChainClients {
  const chain = getViemChain(chainId);
  if (!chain) {
    throw new Error(`Chain ${chainId} is not supported`);
  }

  return {
    chainId,
    chain,
    publicClient: createNexPublicClient(chainId),
    bundlerClient: createNexBundlerClient(chainId),
  };
}

/**
 * Estimate gas for a UserOperation
 * The bundler provides gas estimation
 */
export async function estimateUserOperationGas(
  bundlerClient: BundlerClient,
  userOperation: {
    sender: `0x${string}`;
    callData: `0x${string}`;
    nonce?: bigint;
  }
): Promise<{
  preVerificationGas: bigint;
  verificationGasLimit: bigint;
  callGasLimit: bigint;
}> {
  const estimation = await bundlerClient.estimateUserOperationGas({
    ...userOperation,
  });

  return {
    preVerificationGas: estimation.preVerificationGas,
    verificationGasLimit: estimation.verificationGasLimit,
    callGasLimit: estimation.callGasLimit,
  };
}

/**
 * Check if the Pimlico bundler is available
 */
export function isPimlicoBundlerConfigured(): boolean {
  try {
    ensurePimlicoApiKey();
    return true;
  } catch {
    return false;
  }
}
