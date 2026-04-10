import { getNztRollupConfig } from "@/lib/networks/capabilities";
import { LIQUID_GLASS_LOGOS } from "@/lib/liquid-glass-logos";

export type WalletChainPlatform = "evm" | "solana";
export type WalletSolanaNetwork = "mainnet" | "devnet";

export type WalletChainPresentation = {
  platform: WalletChainPlatform;
  chainId: number | null;
  chainHex: `0x${string}` | null;
  chainName: string;
  chainIcon: string;
  moralisChain: string | null;
  moralisNetwork: WalletSolanaNetwork | null;
  explorerBaseUrl: string;
  nativeSymbol: string;
  shortLabel: string;
};

type ResolveWalletChainPresentationInput = {
  platform: WalletChainPlatform;
  chainId?: number | string | null;
  network?: WalletSolanaNetwork | null;
};

type EvmChainPresentationConfig = Omit<
  WalletChainPresentation,
  "platform" | "chainId" | "moralisNetwork"
> & {
  chainId: number;
  aliases: string[];
};

const EVM_CHAIN_PRESENTATIONS: EvmChainPresentationConfig[] = [
  {
    chainId: 1,
    chainHex: "0x1",
    chainName: "Ethereum",
    chainIcon: LIQUID_GLASS_LOGOS.ethereum,
    moralisChain: "eth",
    explorerBaseUrl: "https://etherscan.io",
    nativeSymbol: "ETH",
    shortLabel: "ETH",
    aliases: ["1", "0x1", "eth", "ethereum", "mainnet"],
  },
  {
    chainId: 11155111,
    chainHex: "0xaa36a7",
    chainName: "Ethereum Sepolia",
    chainIcon: LIQUID_GLASS_LOGOS.ethereum,
    moralisChain: "sepolia",
    explorerBaseUrl: "https://sepolia.etherscan.io",
    nativeSymbol: "ETH",
    shortLabel: "Sepolia",
    aliases: ["11155111", "0xaa36a7", "sepolia", "ethereum-sepolia", "ethereum sepolia"],
  },
  {
    chainId: 8453,
    chainHex: "0x2105",
    chainName: "Base",
    chainIcon: "/icons/chain-icons/base.svg",
    moralisChain: "base",
    explorerBaseUrl: "https://basescan.org",
    nativeSymbol: "ETH",
    shortLabel: "Base",
    aliases: ["8453", "0x2105", "base"],
  },
  {
    chainId: 84532,
    chainHex: "0x14a34",
    chainName: "Base Sepolia",
    chainIcon: "/icons/chain-icons/base.svg",
    moralisChain: "base sepolia",
    explorerBaseUrl: "https://sepolia.basescan.org",
    nativeSymbol: "ETH",
    shortLabel: "Base",
    aliases: ["84532", "0x14a34", "base-sepolia", "base sepolia"],
  },
  {
    chainId: 42161,
    chainHex: "0xa4b1",
    chainName: "Arbitrum",
    chainIcon: "/icons/chain-icons/arbitrum.svg",
    moralisChain: "arbitrum",
    explorerBaseUrl: "https://arbiscan.io",
    nativeSymbol: "ETH",
    shortLabel: "ARB",
    aliases: ["42161", "0xa4b1", "arbitrum"],
  },
  {
    chainId: 10,
    chainHex: "0xa",
    chainName: "Optimism",
    chainIcon: "/icons/chain-icons/optimism.svg",
    moralisChain: "optimism",
    explorerBaseUrl: "https://optimistic.etherscan.io",
    nativeSymbol: "ETH",
    shortLabel: "OP",
    aliases: ["10", "0xa", "optimism"],
  },
  {
    chainId: 137,
    chainHex: "0x89",
    chainName: "Polygon",
    chainIcon: "/icons/chain-icons/polygon.svg",
    moralisChain: "polygon",
    explorerBaseUrl: "https://polygonscan.com",
    nativeSymbol: "POL",
    shortLabel: "POL",
    aliases: ["137", "0x89", "polygon"],
  },
  {
    chainId: 43114,
    chainHex: "0xa86a",
    chainName: "Avalanche",
    chainIcon: "/icons/chain-icons/avalanche.svg",
    moralisChain: "avalanche",
    explorerBaseUrl: "https://snowtrace.io",
    nativeSymbol: "AVAX",
    shortLabel: "AVAX",
    aliases: ["43114", "0xa86a", "avalanche", "avax"],
  },
];

const EVM_CHAIN_ALIAS_TO_CONFIG = new Map<string, EvmChainPresentationConfig>(
  EVM_CHAIN_PRESENTATIONS.flatMap((config) =>
    config.aliases.map((alias) => [alias, config] as const),
  ),
);

const DEFAULT_EVM_CHAIN = EVM_CHAIN_PRESENTATIONS[2]!;

function getNztRollupPresentation(): EvmChainPresentationConfig | null {
  const config = getNztRollupConfig();
  if (!config.chainId || !config.explorerUrl) {
    return null;
  }

  const chainHex = `0x${config.chainId.toString(16)}` as const;

  return {
    chainId: config.chainId,
    chainHex,
    chainName: "NZT Rollup",
    chainIcon: "/icons/chain-icons/nzt.svg",
    moralisChain: null,
    explorerBaseUrl: config.explorerUrl,
    nativeSymbol: config.nativeSymbol,
    shortLabel: config.nativeSymbol,
    aliases: [String(config.chainId), chainHex, "nzt", "nzt-rollup", "nexis", "nexis-rollup"],
  };
}

function resolveEvmChainConfig(
  chainId: number | string | null | undefined,
): EvmChainPresentationConfig {
  const nztRollupPresentation = getNztRollupPresentation();

  if (typeof chainId === "number" && Number.isFinite(chainId)) {
    if (nztRollupPresentation?.chainId === Math.trunc(chainId)) {
      return nztRollupPresentation;
    }
    return (
      EVM_CHAIN_PRESENTATIONS.find((config) => config.chainId === Math.trunc(chainId)) ??
      DEFAULT_EVM_CHAIN
    );
  }

  if (typeof chainId === "string") {
    const normalized = chainId.trim().toLowerCase();
    if (!normalized) return DEFAULT_EVM_CHAIN;
    if (nztRollupPresentation?.aliases.includes(normalized)) {
      return nztRollupPresentation;
    }
    return EVM_CHAIN_ALIAS_TO_CONFIG.get(normalized) ?? DEFAULT_EVM_CHAIN;
  }

  return DEFAULT_EVM_CHAIN;
}

export function resolveWalletChainPresentation(
  input: ResolveWalletChainPresentationInput,
): WalletChainPresentation {
  if (input.platform === "solana") {
    return {
      platform: "solana",
      chainId: null,
      chainHex: null,
      chainName: "Solana",
      chainIcon: LIQUID_GLASS_LOGOS.solana,
      moralisChain: null,
      moralisNetwork: input.network ?? "mainnet",
      explorerBaseUrl: "https://solscan.io",
      nativeSymbol: "SOL",
      shortLabel: "SOL",
    };
  }

  const config = resolveEvmChainConfig(input.chainId);
  return {
    platform: "evm",
    chainId: config.chainId,
    chainHex: config.chainHex,
    chainName: config.chainName,
    chainIcon: config.chainIcon,
    moralisChain: config.moralisChain,
    moralisNetwork: null,
    explorerBaseUrl: config.explorerBaseUrl,
    nativeSymbol: config.nativeSymbol,
    shortLabel: config.shortLabel,
  };
}

export function buildWalletExplorerAddressUrl(
  presentation: WalletChainPresentation,
  address: string,
): string {
  if (presentation.platform === "solana") {
    return `${presentation.explorerBaseUrl}/account/${address}`;
  }

  return `${presentation.explorerBaseUrl}/address/${address}`;
}
