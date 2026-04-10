import { defineChain, type Chain } from "viem";
import { LIQUID_GLASS_LOGOS } from "@/lib/liquid-glass-logos";

export type NetworkCapability = {
  chainId: number;
  networkKey: string;
  identityProvider: string;
  executionProvider: string;
  cdpSignAndSend: boolean;
  cdpUserOp: boolean;
  cdpSwap: boolean;
  gasSponsorship: boolean;
  bridgeUrl: string | null;
  explorerUrl: string | null;
  nativeSymbol: string;
};

type CdpSignAndSendNetwork =
  | "arbitrum"
  | "avalanche"
  | "base"
  | "base-sepolia"
  | "ethereum"
  | "ethereum-sepolia"
  | "optimism"
  | "polygon";

type CdpEvmNetwork = CdpSignAndSendNetwork | "bnb";

type CdpSwapNetwork = "arbitrum" | "base" | "ethereum" | "optimism";
type CdpBalanceNetwork = "base" | "base-sepolia" | "ethereum" | "ethereum-sepolia";

export type ResolvedNetworkCapability = NetworkCapability & {
  label: string;
  shortLabel: string;
  icon: string;
  chainRef: string;
  testnet: boolean;
  platform: "evm";
  cdpNetwork: CdpEvmNetwork | null;
  cdpBalanceNetwork: CdpBalanceNetwork | null;
  cdpSwapNetwork: CdpSwapNetwork | null;
  alchemyGasManager: boolean;
  alchemyWebhook: boolean;
  nativeGasToken: boolean;
  bridgeAvailable: boolean;
  rpcUrl: string | null;
};

const NZT_ROLLUP_NETWORK_KEY = "nzt-rollup";
const DEFAULT_CDP_EVM_NETWORK_KEY = "base-mainnet";
const DEFAULT_CDP_EVM_CHAIN_ID = 8453;

const CDP_SIGN_AND_SEND_BY_CHAIN_ID: Record<number, CdpSignAndSendNetwork> = {
  1: "ethereum",
  10: "optimism",
  137: "polygon",
  8453: "base",
  84532: "base-sepolia",
  42161: "arbitrum",
  43114: "avalanche",
  11155111: "ethereum-sepolia",
};

const CDP_USER_OP_CHAIN_IDS = new Set([
  1,
  10,
  137,
  8453,
  84532,
  42161,
  43114,
  11155111,
]);

const CDP_SWAP_BY_CHAIN_ID: Record<number, CdpSwapNetwork> = {
  1: "ethereum",
  10: "optimism",
  8453: "base",
  42161: "arbitrum",
};

const CDP_BALANCE_BY_CHAIN_ID: Record<number, CdpBalanceNetwork> = {
  1: "ethereum",
  8453: "base",
  84532: "base-sepolia",
  11155111: "ethereum-sepolia",
};

const EXPLORER_BASE_URLS: Record<number, string> = {
  1: "https://etherscan.io",
  10: "https://optimistic.etherscan.io",
  56: "https://bscscan.com",
  130: "https://uniscan.xyz",
  137: "https://polygonscan.com",
  42161: "https://arbiscan.io",
  43114: "https://subnets.avax.network/c-chain",
  8453: "https://basescan.org",
  84532: "https://sepolia.basescan.org",
  998: "https://hyperliquid-testnet-explorer.app",
  999: "https://hyperliquid-explorer.app",
  10143: "https://testnet.monadexplorer.com",
  59144: "https://lineascan.build",
};

const STATIC_NETWORK_CAPABILITIES: ResolvedNetworkCapability[] = [
  createStaticCapability({
    chainId: 8453,
    networkKey: DEFAULT_CDP_EVM_NETWORK_KEY,
    label: "Nex Wallet (EVM)",
    shortLabel: "Base",
    icon: "/icons/chain-icons/base.svg",
    nativeSymbol: "ETH",
    explorerUrl: "https://basescan.org",
    cdpNetwork: "base",
    cdpBalanceNetwork: "base",
    cdpSwapNetwork: "base",
  }),
  createStaticCapability({
    chainId: 84532,
    networkKey: "base-sepolia",
    label: "Base Sepolia",
    shortLabel: "Base Sepolia",
    icon: "/icons/chain-icons/base.svg",
    nativeSymbol: "ETH",
    explorerUrl: "https://sepolia.basescan.org",
    testnet: true,
    cdpNetwork: "base-sepolia",
    cdpBalanceNetwork: "base-sepolia",
  }),
  createStaticCapability({
    chainId: 56,
    networkKey: "bnb-mainnet",
    label: "BNB Chain",
    shortLabel: "BNB",
    icon: LIQUID_GLASS_LOGOS.bnb,
    nativeSymbol: "BNB",
    explorerUrl: "https://bscscan.com",
    cdpNetwork: "bnb",
    cdpSignAndSend: false,
    cdpUserOp: true,
  }),
  createStaticCapability({
    chainId: 1,
    networkKey: "ethereum-mainnet",
    label: "Ethereum",
    shortLabel: "Ethereum",
    icon: LIQUID_GLASS_LOGOS.ethereum,
    nativeSymbol: "ETH",
    explorerUrl: "https://etherscan.io",
    cdpNetwork: "ethereum",
    cdpBalanceNetwork: "ethereum",
    cdpSwapNetwork: "ethereum",
  }),
  createStaticCapability({
    chainId: 11155111,
    networkKey: "ethereum-sepolia",
    label: "Ethereum Sepolia",
    shortLabel: "Ethereum Sepolia",
    icon: LIQUID_GLASS_LOGOS.ethereum,
    nativeSymbol: "ETH",
    explorerUrl: "https://sepolia.etherscan.io",
    testnet: true,
    cdpNetwork: "ethereum-sepolia",
    cdpBalanceNetwork: "ethereum-sepolia",
  }),
  createStaticCapability({
    chainId: 10,
    networkKey: "optimism-mainnet",
    label: "Optimism",
    shortLabel: "Optimism",
    icon: "/icons/chain-icons/optimism.svg",
    nativeSymbol: "ETH",
    explorerUrl: "https://optimistic.etherscan.io",
    cdpNetwork: "optimism",
    cdpSwapNetwork: "optimism",
  }),
  createStaticCapability({
    chainId: 42161,
    networkKey: "arbitrum-mainnet",
    label: "Arbitrum",
    shortLabel: "Arbitrum",
    icon: "/icons/chain-icons/arbitrum.svg",
    nativeSymbol: "ETH",
    explorerUrl: "https://arbiscan.io",
    cdpNetwork: "arbitrum",
    cdpSwapNetwork: "arbitrum",
  }),
  createStaticCapability({
    chainId: 137,
    networkKey: "polygon-mainnet",
    label: "Polygon",
    shortLabel: "Polygon",
    icon: "/icons/chain-icons/polygon.svg",
    nativeSymbol: "POL",
    explorerUrl: "https://polygonscan.com",
    cdpNetwork: "polygon",
  }),
  createStaticCapability({
    chainId: 43114,
    networkKey: "avalanche-mainnet",
    label: "Avalanche",
    shortLabel: "Avalanche",
    icon: "/icons/chain-icons/avax.svg",
    nativeSymbol: "AVAX",
    explorerUrl: "https://subnets.avax.network/c-chain",
    cdpNetwork: "avalanche",
  }),
];

function createStaticCapability(input: {
  chainId: number;
  networkKey: string;
  label: string;
  shortLabel: string;
  icon: string;
  nativeSymbol: string;
  explorerUrl: string | null;
  testnet?: boolean;
  cdpNetwork?: CdpEvmNetwork;
  cdpBalanceNetwork?: CdpBalanceNetwork;
  cdpSwapNetwork?: CdpSwapNetwork;
  cdpSignAndSend?: boolean;
  cdpUserOp?: boolean;
}): ResolvedNetworkCapability {
  const cdpSignAndSend = input.cdpSignAndSend ?? Boolean(input.cdpNetwork);
  const cdpUserOp = input.cdpUserOp ?? CDP_USER_OP_CHAIN_IDS.has(input.chainId);
  const cdpSwap = Boolean(input.cdpSwapNetwork);

  return {
    chainId: input.chainId,
    networkKey: input.networkKey,
    identityProvider: "cdp",
    executionProvider: "cdp",
    cdpSignAndSend,
    cdpUserOp,
    cdpSwap,
    gasSponsorship: false,
    bridgeUrl: null,
    explorerUrl: input.explorerUrl,
    nativeSymbol: input.nativeSymbol,
    label: input.label,
    shortLabel: input.shortLabel,
    icon: input.icon,
    chainRef: `eip155:${input.chainId}`,
    testnet: Boolean(input.testnet),
    platform: "evm",
    cdpNetwork: input.cdpNetwork ?? null,
    cdpBalanceNetwork: input.cdpBalanceNetwork ?? null,
    cdpSwapNetwork: input.cdpSwapNetwork ?? null,
    alchemyGasManager: false,
    alchemyWebhook: false,
    nativeGasToken: false,
    bridgeAvailable: false,
    rpcUrl: null,
  };
}

function normalizeEnvValue(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parsePositiveChainId(value: string | null | undefined): number | null {
  const normalized = normalizeEnvValue(value);
  if (!normalized) return null;
  const parsed = normalized.startsWith("0x")
    ? Number.parseInt(normalized, 16)
    : Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeUrl(value: string | null | undefined): string | null {
  const normalized = normalizeEnvValue(value);
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function buildExplorerAddressUrl(explorerBaseUrl: string | null, address: string): string | null {
  const normalizedAddress = address.trim();
  if (!explorerBaseUrl || !normalizedAddress) return null;
  return `${explorerBaseUrl.replace(/\/+$/, "")}/address/${normalizedAddress}`;
}

function resolveNztSymbol(): string {
  return normalizeEnvValue(process.env.NEXT_PUBLIC_NZT_SYMBOL) ?? "NZT";
}

export function getNztRollupConfig(): {
  configured: boolean;
  chainId: number | null;
  rpcUrl: string | null;
  explorerUrl: string | null;
  bridgeUrl: string | null;
  nativeSymbol: string;
} {
  const chainId = parsePositiveChainId(process.env.NEXT_PUBLIC_NZT_CHAIN_ID);
  const rpcUrl = normalizeUrl(process.env.NEXT_PUBLIC_NZT_RPC_URL);
  const explorerUrl = normalizeUrl(process.env.NEXT_PUBLIC_NZT_EXPLORER_URL);
  const bridgeUrl = normalizeUrl(process.env.NEXT_PUBLIC_NZT_BRIDGE_URL);
  const nativeSymbol = resolveNztSymbol();

  return {
    configured: Boolean(chainId && rpcUrl),
    chainId,
    rpcUrl,
    explorerUrl,
    bridgeUrl,
    nativeSymbol,
  };
}

export function getNztRollupCapability(): ResolvedNetworkCapability | null {
  const config = getNztRollupConfig();
  if (!config.configured || !config.chainId || !config.rpcUrl) {
    return null;
  }

  const alchemyGasManager = Boolean(normalizeEnvValue(process.env.ALCHEMY_GAS_MANAGER_POLICY_ID));
  const alchemyWebhook = Boolean(normalizeEnvValue(process.env.ALCHEMY_ROLLUP_WEBHOOK_SIGNING_KEY));
  const bridgeAvailable = Boolean(config.bridgeUrl);

  return {
    chainId: config.chainId,
    networkKey: NZT_ROLLUP_NETWORK_KEY,
    identityProvider: "cdp",
    executionProvider: "nzt-rollup",
    cdpSignAndSend: false,
    cdpUserOp: false,
    cdpSwap: false,
    gasSponsorship: alchemyGasManager,
    bridgeUrl: config.bridgeUrl,
    explorerUrl: config.explorerUrl,
    nativeSymbol: config.nativeSymbol,
    label: "NZT Rollup Wallet",
    shortLabel: "NZT Rollup",
    icon: "/icons/chain-icons/nzt.svg",
    chainRef: `eip155:${config.chainId}`,
    testnet: false,
    platform: "evm",
    cdpNetwork: null,
    cdpBalanceNetwork: null,
    cdpSwapNetwork: null,
    alchemyGasManager,
    alchemyWebhook,
    nativeGasToken: true,
    bridgeAvailable,
    rpcUrl: config.rpcUrl,
  };
}

export function buildNztRollupChain(): Chain | null {
  const config = getNztRollupConfig();
  if (!config.configured || !config.chainId || !config.rpcUrl) {
    return null;
  }

  return defineChain({
    id: config.chainId,
    name: "Nexis NZT Rollup",
    network: NZT_ROLLUP_NETWORK_KEY,
    nativeCurrency: {
      name: "Nexis Token",
      symbol: config.nativeSymbol,
      decimals: 18,
    },
    rpcUrls: {
      default: { http: [config.rpcUrl] },
      public: { http: [config.rpcUrl] },
    },
    blockExplorers: config.explorerUrl
      ? {
          default: {
            name: "NZT Explorer",
            url: config.explorerUrl,
          },
        }
      : undefined,
  });
}

export function getNetworkCapabilities(): ResolvedNetworkCapability[] {
  const nztRollupCapability = getNztRollupCapability();
  return nztRollupCapability
    ? [...STATIC_NETWORK_CAPABILITIES, nztRollupCapability]
    : [...STATIC_NETWORK_CAPABILITIES];
}

export function getNetworkCapabilityByChainId(
  chainId: number | string | null | undefined,
): ResolvedNetworkCapability | null {
  const parsed = typeof chainId === "number"
    ? chainId
    : parsePositiveChainId(typeof chainId === "string" ? chainId : null);
  if (!parsed) return null;
  return getNetworkCapabilities().find((capability) => capability.chainId === parsed) ?? null;
}

export function getNetworkCapabilityByKey(networkKey: string | null | undefined): ResolvedNetworkCapability | null {
  const normalized = normalizeEnvValue(networkKey)?.toLowerCase();
  if (!normalized) return null;
  return getNetworkCapabilities().find((capability) => capability.networkKey.toLowerCase() === normalized) ?? null;
}

export function getDefaultCdpEvmCapability(): ResolvedNetworkCapability {
  return STATIC_NETWORK_CAPABILITIES.find(
    (capability) => capability.networkKey === DEFAULT_CDP_EVM_NETWORK_KEY,
  ) ?? STATIC_NETWORK_CAPABILITIES[0]!;
}

export function resolveCdpSignAndSendNetwork(
  chainId: number | string | null | undefined,
): CdpSignAndSendNetwork | null {
  const parsed = typeof chainId === "number"
    ? chainId
    : parsePositiveChainId(typeof chainId === "string" ? chainId : null);
  if (!parsed) return null;
  return CDP_SIGN_AND_SEND_BY_CHAIN_ID[parsed] ?? null;
}

export function resolveCdpSwapNetwork(
  chainId: number | string | null | undefined,
): CdpSwapNetwork | null {
  const parsed = typeof chainId === "number"
    ? chainId
    : parsePositiveChainId(typeof chainId === "string" ? chainId : null);
  if (!parsed) return null;
  return CDP_SWAP_BY_CHAIN_ID[parsed] ?? null;
}

export function resolveCdpBalanceNetwork(
  chainId: number | string | null | undefined,
): CdpBalanceNetwork {
  const parsed = typeof chainId === "number"
    ? chainId
    : parsePositiveChainId(typeof chainId === "string" ? chainId : null);
  if (!parsed) return getDefaultCdpEvmCapability().cdpBalanceNetwork ?? "base";
  return CDP_BALANCE_BY_CHAIN_ID[parsed] ?? (getDefaultCdpEvmCapability().cdpBalanceNetwork ?? "base");
}

export function isSupportedCdpBalanceNetworkName(network: string | null | undefined): network is CdpBalanceNetwork {
  const normalized = normalizeEnvValue(network)?.toLowerCase();
  return normalized === "base" ||
    normalized === "base-sepolia" ||
    normalized === "ethereum" ||
    normalized === "ethereum-sepolia";
}

export function resolveExplorerAddressUrlForChain(
  chainId: number | string,
  address: string,
): string | null {
  const capability = getNetworkCapabilityByChainId(chainId);
  if (capability?.explorerUrl) {
    return buildExplorerAddressUrl(capability.explorerUrl, address);
  }

  const parsed = typeof chainId === "number"
    ? chainId
    : parsePositiveChainId(chainId);
  if (!parsed) return null;

  return buildExplorerAddressUrl(EXPLORER_BASE_URLS[parsed] ?? null, address);
}

export function buildNetworkCapabilityMetadata(
  capability: ResolvedNetworkCapability,
): Record<string, UntypedJson> {
  return {
    networkKey: capability.networkKey,
    identityProvider: capability.identityProvider,
    executionProvider: capability.executionProvider,
    capabilities: {
      cdpSignAndSend: capability.cdpSignAndSend,
      cdpUserOp: capability.cdpUserOp,
      cdpSwap: capability.cdpSwap,
      gasSponsorship: capability.gasSponsorship,
      alchemyGasManager: capability.alchemyGasManager,
      alchemyWebhook: capability.alchemyWebhook,
      nativeGasToken: capability.nativeGasToken,
      bridgeAvailable: capability.bridgeAvailable,
      bridgeUrl: capability.bridgeUrl,
      explorerUrl: capability.explorerUrl,
      nativeSymbol: capability.nativeSymbol,
    },
  };
}

export const networkConstants = {
  DEFAULT_CDP_EVM_CHAIN_ID,
  DEFAULT_CDP_EVM_NETWORK_KEY,
  NZT_ROLLUP_NETWORK_KEY,
} as const;
