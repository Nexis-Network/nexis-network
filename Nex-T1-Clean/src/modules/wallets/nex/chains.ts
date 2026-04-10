/**
 * Nex Wallet Supported Chains Configuration
 * Defines EVM chains supported for Account Abstraction via Pimlico
 */

import { type Chain, defineChain } from "viem";
import {
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
  linea,
  avalanche,
  bsc,
  blast,
  celo,
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
} from "viem/chains";
import { getPimlicoBundlerUrl } from "./env";

/**
 * Chain configuration for Nex smart accounts
 */
export interface NexChainConfig {
  chain: Chain;
  chainId: number;
  name: string;
  symbol: string;
  isTestnet: boolean;
  /** Whether Pimlico supports this chain */
  pimlicoSupported: boolean;
  /** RPC URL for public client (reading state) */
  rpcUrl?: string;
  /** Block explorer URL (without trailing slash) */
  blockExplorer?: string;
}

/**
 * Supported mainnet chains with Pimlico bundler support
 */
export const SUPPORTED_MAINNET_CHAINS: NexChainConfig[] = [
  {
    chain: mainnet,
    chainId: 1,
    name: "Ethereum",
    symbol: "ETH",
    isTestnet: false,
    pimlicoSupported: true,
  },
  {
    chain: base,
    chainId: 8453,
    name: "Base",
    symbol: "ETH",
    isTestnet: false,
    pimlicoSupported: true,
  },
  {
    chain: arbitrum,
    chainId: 42161,
    name: "Arbitrum",
    symbol: "ETH",
    isTestnet: false,
    pimlicoSupported: true,
  },
  {
    chain: optimism,
    chainId: 10,
    name: "Optimism",
    symbol: "ETH",
    isTestnet: false,
    pimlicoSupported: true,
  },
  {
    chain: polygon,
    chainId: 137,
    name: "Polygon",
    symbol: "MATIC",
    isTestnet: false,
    pimlicoSupported: true,
  },
  {
    chain: avalanche,
    chainId: 43114,
    name: "Avalanche",
    symbol: "AVAX",
    isTestnet: false,
    pimlicoSupported: true,
  },
  {
    chain: bsc,
    chainId: 56,
    name: "BNB Chain",
    symbol: "BNB",
    isTestnet: false,
    pimlicoSupported: true,
  },
  {
    chain: blast,
    chainId: 81457,
    name: "Blast",
    symbol: "ETH",
    isTestnet: false,
    pimlicoSupported: true,
  },
  {
    chain: celo,
    chainId: 42220,
    name: "Celo",
    symbol: "CELO",
    isTestnet: false,
    pimlicoSupported: true,
  },
  {
    chain: linea,
    chainId: 59144,
    name: "Linea",
    symbol: "ETH",
    isTestnet: false,
    pimlicoSupported: true,
  },
  {
    // Custom definition for Hyperliquid EVM (Hype)
    chain: defineChain({
      id: 999, // Placeholder/Internal ID if mainnet undefined
      name: "Hyperliquid EVM",
      nativeCurrency: { name: "Hype", symbol: "HYPE", decimals: 18 },
      rpcUrls: { default: { http: ["https://rpc.hyperliquid.xyz/evm"] } }, // Verify RPC
      blockExplorers: { default: { name: "Explorer", url: "https://hyperliquid.xyz/explorer" } },
    }),
    chainId: 999,
    name: "Hyperliquid EVM",
    symbol: "HYPE",
    isTestnet: false,
    pimlicoSupported: false, // Verify support
  },
  {
    // Custom definition for Monad
    chain: defineChain({
      id: 10143, // Monad likely has a specific ID, using a placeholder or known devnet ID
      name: "Monad",
      nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
      rpcUrls: { default: { http: ["https://rpc-devnet.monadinfra.com/rpc"] } },
    }),
    chainId: 10143,
    name: "Monad",
    symbol: "MON",
    isTestnet: true, // Treating as testnet/devnet for now
    pimlicoSupported: false,
  },
];

/**
 * Supported testnet chains for development
 */
export const SUPPORTED_TESTNET_CHAINS: NexChainConfig[] = [
  {
    chain: sepolia,
    chainId: 11155111,
    name: "Sepolia",
    symbol: "ETH",
    isTestnet: true,
    pimlicoSupported: true,
  },
  {
    chain: baseSepolia,
    chainId: 84532,
    name: "Base Sepolia",
    symbol: "ETH",
    isTestnet: true,
    pimlicoSupported: true,
  },
  {
    chain: arbitrumSepolia,
    chainId: 421614,
    name: "Arbitrum Sepolia",
    symbol: "ETH",
    isTestnet: true,
    pimlicoSupported: true,
  },
  {
    chain: optimismSepolia,
    chainId: 11155420,
    name: "Optimism Sepolia",
    symbol: "ETH",
    isTestnet: true,
    pimlicoSupported: true,
  },
];

/**
 * All supported chains (mainnet + testnet)
 */
export const ALL_SUPPORTED_CHAINS: NexChainConfig[] = [
  ...SUPPORTED_MAINNET_CHAINS,
  ...SUPPORTED_TESTNET_CHAINS,
];

/**
 * Chain ID to chain config map for quick lookup
 */
export const CHAIN_CONFIG_MAP: Map<number, NexChainConfig> = new Map(
  ALL_SUPPORTED_CHAINS.map((config) => [config.chainId, config])
);

/**
 * Get chain config by chain ID
 */
export function getChainConfig(chainId: number): NexChainConfig | undefined {
  return CHAIN_CONFIG_MAP.get(chainId);
}

/**
 * Check if a chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return CHAIN_CONFIG_MAP.has(chainId);
}

/**
 * Get the viem Chain object for a chain ID
 */
export function getViemChain(chainId: number): Chain | undefined {
  return CHAIN_CONFIG_MAP.get(chainId)?.chain;
}

/**
 * Get bundler URL for a chain (Pimlico)
 */
export function getBundlerUrl(chainId: number): string {
  const config = getChainConfig(chainId);
  if (!config?.pimlicoSupported) {
    throw new Error(`Chain ${chainId} is not supported by Pimlico bundler`);
  }
  return getPimlicoBundlerUrl(chainId);
}

/**
 * Default chain for new accounts (Base mainnet)
 */
export const DEFAULT_CHAIN_ID = 8453; // Base

/**
 * Get the default chain config
 */
export function getDefaultChainConfig(): NexChainConfig {
  const config = getChainConfig(DEFAULT_CHAIN_ID);
  if (!config) {
    throw new Error("Default chain not configured");
  }
  return config;
}
