import type { Chain } from "viem";
import { defineChain } from "viem";
import {

  arbitrum,
  arbitrumSepolia,
  bsc,
  bscTestnet,
  base,
  baseSepolia,
  boba as bobaMainnet,
  mainnet,
  optimism,
  optimismGoerli,
  optimismSepolia,
  polygon,
  shape,
  shapeSepolia,
  worldchain as worldChain,
  worldchainSepolia as worldChainSepolia,
} from "viem/chains";

import { logger } from '@/lib/logger';
import { buildNztRollupChain, getNztRollupConfig } from "@/lib/networks/capabilities";
// Legacy vendor-specific RPC templates were removed. Prefer direct chain RPCs or your own provider.

const CUSTOM_CHAINS: Record<number, Chain> = {
  43114: defineChain({
    id: 43114,
    name: "Avalanche C-Chain",
    network: "avalanche-mainnet",
    nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://api.avax.network/ext/bc/C/rpc"] },
      public: { http: ["https://api.avax.network/ext/bc/C/rpc"] },
    },
    blockExplorers: {
      default: { name: "SnowTrace", url: "https://snowtrace.io" },
    },
  }),
  43113: defineChain({
    id: 43113,
    name: "Avalanche Fuji",
    network: "avalanche-fuji",
    nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://api.avax-test.network/ext/bc/C/rpc"] },
      public: { http: ["https://api.avax-test.network/ext/bc/C/rpc"] },
    },
    blockExplorers: {
      default: { name: "SnowTrace", url: "https://testnet.snowtrace.io" },
    },
    testnet: true,
  }),
  81457: defineChain({
    id: 81457,
    name: "Blast",
    network: "blast-mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://rpc.blast.io"] },
      public: { http: ["https://rpc.blast.io"] },
    },
    blockExplorers: {
      default: { name: "Blastscan", url: "https://blastscan.io" },
    },
  }),
  80094: defineChain({
    id: 80094,
    name: "Berachain Mainnet",
    network: "berachain-mainnet",
    nativeCurrency: { name: "Bera", symbol: "BERA", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://rpc.berachain.com"] },
      public: { http: ["https://rpc.berachain.com"] },
    },
    blockExplorers: {
      default: { name: "Berachain Explorer", url: "https://beratrail.io" },
    },
  }),
  1101: defineChain({
    id: 1101,
    name: "Polygon zkEVM",
    network: "polygon-zkevm",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://zkevm-rpc.com"] },
      public: { http: ["https://zkevm-rpc.com"] },
    },
    blockExplorers: {
      default: { name: "PolygonScan", url: "https://zkevm.polygonscan.com" },
    },
  }),
  999: defineChain({
    id: 999,
    name: "Hyperliquid",
    network: "hyperliquid",
    nativeCurrency: { name: "Hyperliquid", symbol: "HYPE", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://rpc.hyperliquid.xyz/evm"] },
      public: { http: ["https://rpc.hyperliquid.xyz/evm"] },
    },
  }),
  998: defineChain({
    id: 998,
    name: "Hyperliquid",
    network: "hyperliquid",
    nativeCurrency: { name: "Hyperliquid", symbol: "HYPE", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://rpc.hyperliquid-testnet.xyz/evm"] },
      public: { http: ["https://rpc.hyperliquid-testnet.xyz/evm"] },
    },
    testnet: true,
  }),
  324: defineChain({
    id: 324,
    name: "zkSync Era",
    network: "zksync",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://mainnet.era.zksync.io"] },
      public: { http: ["https://mainnet.era.zksync.io"] },
    },
    blockExplorers: {
      default: { name: "zkSync Explorer", url: "https://explorer.zksync.io" },
    },
  }),
  33139: defineChain({
    id: 33139,
    name: "ApeChain",
    network: "apechain",
    nativeCurrency: { name: "ApeCoin", symbol: "APE", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://rpc.apechain.com"] },
      public: { http: ["https://rpc.apechain.com"] },
    },
    blockExplorers: {
      default: { name: "ApeScan", url: "https://apescan.io" },
    },
  }),
  130: defineChain({
    id: 130,
    name: "UniChain",
    network: "unichain",
    nativeCurrency: { name: "Uni", symbol: "UNI", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://unichain-rpc.publicnode.com"] },
      public: { http: ["https://unichain-rpc.publicnode.com"] },
    },
  }),
  143: defineChain({
    id: 143,
    name: "Monad",
    network: "monad",
    nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://rpc.monad.xyz"] },
      public: { http: ["https://rpc.monad.xyz"] },
    },
    blockExplorers: {
      default: { name: "MonadScan", url: "https://monadscan.com" },
    },
  }),
  50104: defineChain({
    id: 50104,
    name: "Sophon",
    network: "sophon",
    nativeCurrency: { name: "Sophon", symbol: "SOPH", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://rpc.sophon.xyz"] },
      public: { http: ["https://rpc.sophon.xyz"] },
    },
    blockExplorers: {
      default: { name: "Sophon Explorer", url: "https://explorer.sophon.xyz" },
    },
  }),
  122: defineChain({
    id: 122,
    name: "Fuse",
    network: "fuse",
    nativeCurrency: { name: "Fuse", symbol: "FUSE", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://rpc.fuse.io"] },
      public: { http: ["https://rpc.fuse.io"] },
    },
  }),
  204: defineChain({
    id: 204,
    name: "opBNB",
    network: "opbnb",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://opbnb-mainnet-rpc.bnbchain.org"] },
      public: { http: ["https://opbnb-mainnet-rpc.bnbchain.org"] },
    },
  }),
  42220: defineChain({
    id: 42220,
    name: "Celo",
    network: "celo",
    nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://forno.celo.org"] },
      public: { http: ["https://forno.celo.org"] },
    },
  }),
  7777777: defineChain({
    id: 7777777,
    name: "Zora",
    network: "zora",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://rpc.zora.energy"] },
      public: { http: ["https://rpc.zora.energy"] },
    },
  }),
  59144: defineChain({
    id: 59144,
    name: "Linea",
    network: "linea",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://rpc.linea.build"] },
      public: { http: ["https://rpc.linea.build"] },
    },
  }),
};

const BUILT_IN_CHAIN_FACTORIES: Record<number, () => Chain> = {
  1: () => mainnet,
  10: () => optimism,
  420: () => optimismGoerli,
  11155420: () => optimismSepolia,
  42161: () => arbitrum,
  421614: () => arbitrumSepolia,
  8453: () => base,
  84532: () => baseSepolia,
  360: () => shape,
  11011: () => shapeSepolia,
  480: () => worldChain,
  4801: () => worldChainSepolia,
  288: () => bobaMainnet,
  56: () => bsc,
  97: () => bscTestnet,
  137: () => polygon,
};

function parseChainIds(): number[] {
  const raw = process.env.NEXT_PUBLIC_CHAIN_IDS ?? "1";
  const configured = raw
    .split(",")
    .map((value) => value.replace(/["']/g, "").trim())
    .filter((value) => value.length > 0)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value));

  const defaultChainIds = [
    1,
    10,
    56,
    137,
    42161,
    43114,
    42220,
    143,
    122,
    130,
    204,
    288,
    324,
    33139,
    360,
    420,
    480,
    80094,
    8453,
    42220,
    59144,
    7777777,
    998,
    999,
    50104,
  ];

  // Simple env toggles for select chains
  const envTrue = (name: string) => String(process.env[name] ?? "").trim().toLowerCase() === "true";
  const toggled: number[] = [];
  if (envTrue("NEXT_PUBLIC_ENABLE_BSC") || envTrue("ENABLE_BSC") || envTrue("NEX_ENABLE_CHAIN_56")) {
    toggled.push(56);
  }

  const nztRollupChainId = getNztRollupConfig().chainId;
  if (nztRollupChainId) {
    toggled.push(nztRollupChainId);
  }

  const deduped = new Set<number>([...configured, ...defaultChainIds, ...toggled]);
  return Array.from(deduped).filter((value) => Number.isFinite(value));
}

function getChain(id: number): Chain | null {
  const nztRollupChain = buildNztRollupChain();
  if (nztRollupChain?.id === id) {
    return nztRollupChain;
  }

  const factory = BUILT_IN_CHAIN_FACTORIES[id];
  if (factory) return factory();
  const custom = CUSTOM_CHAINS[id];
  if (custom) return custom;
  logger.warn(`Chain configuration: chain ${id} is not currently supported.`);
  return null;
}

export function getSupportedChains(): Chain[] {
  const ids = parseChainIds();
  const deduped = Array.from(new Set(ids));
  const chains: Chain[] = [];

  for (const id of deduped) {
    const chain = getChain(id);
    if (chain) {
      chains.push(chain);
    }
  }

  if (!chains.length) {
    logger.error("Chain configuration: no supported chains resolved; defaulting to Ethereum mainnet.");
    return [mainnet];
  }

  return chains;
}

export function findSupportedChain(chainId: number): Chain | null {
  const chains = getSupportedChains();
  return chains.find((chain) => chain.id === chainId) ?? null;
}

export function resolveDefaultRpcUrl(chainId: number): string | null {
  const chain = findSupportedChain(chainId);
  const urls = chain?.rpcUrls?.default?.http ?? chain?.rpcUrls?.public?.http ?? [];
  const first = Array.isArray(urls) ? urls[0] : null;
  return typeof first === "string" && first.trim().length > 0 ? first.trim() : null;
}

export function getPrimaryChain(): Chain {
  const [first] = getSupportedChains();
  if (!first) {
    throw new Error("No supported chains configured. Update NEXT_PUBLIC_CHAIN_IDS.");
  }
  return first;
}

export function getSupportedChainIds(): number[] {
  return getSupportedChains().map((chain) => chain.id);
}
