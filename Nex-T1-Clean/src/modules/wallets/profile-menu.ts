import type { Chain } from "viem";

import type { WalletPortfolio } from "@/lib/user/profile";
import { getChainIconPath } from "@/lib/chain-icons";
import { getDefaultWalletIcon, getWalletIcon } from "@/lib/wallet-icons";

const METADATA_ADDRESS_KEYS = [
  "signerAddress",
  "signer_address",
  "address",
  "walletAddress",
  "wallet_address",
  "engineAccountAddress",
  "engine_account_address",
  "engineSmartAccountAddress",
  "engine_smart_account_address",
  "engineServerWalletAddress",
  "engine_server_wallet_address",
];

const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const FALLBACK_CHAIN_METADATA: Record<number, { label: string; icon: string; symbol: string }> = {
  1: { label: "Ethereum", icon: "/icons/chain-icons/eth.svg", symbol: "ETH" },
  56: { label: "BNB Chain", icon: "/icons/chain-icons/bnb-chain.svg", symbol: "BNB" },
  204: { label: "opBNB", icon: "/icons/chain-icons/bnb-chain.svg", symbol: "BNB" },
  8453: { label: "Base", icon: "/icons/chain-icons/base.svg", symbol: "ETH" },
};

export type ProvisionedWalletKind = "evm" | "hyperliquid" | "solana";

export type InAppWalletDisplayEntry = {
  id: string;
  kind: ProvisionedWalletKind;
  label: string;
  address: string | null;
  icon: string;
  nativeSymbol: string;
  nativeAmount: number | null;
  placeholder: boolean;
  metadata: Record<string, UntypedJson> | null;
};

export type ChainDisplayItem = {
  chain: Chain;
  icon: string;
  searchText: string;
};

export const REQUIRED_IN_APP_WALLET_KINDS: ProvisionedWalletKind[] = ["evm", "hyperliquid", "solana"];

function toRecord(value: UntypedJson): Record<string, UntypedJson> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, UntypedJson>;
}

function pickMetadataString(record: Record<string, UntypedJson> | null, keys: string[]): string | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export function resolvePortfolioAddress(wallet: WalletPortfolio | null | undefined): string | null {
  if (!wallet) return null;
  if (typeof wallet.address === "string" && wallet.address.trim().length > 0) {
    return wallet.address.trim();
  }
  const metadata = toRecord(wallet.metadata);
  return pickMetadataString(metadata, METADATA_ADDRESS_KEYS);
}

function hasTruthyFlag(record: Record<string, UntypedJson> | null, keys: string[]): boolean {
  if (!record) return false;
  return keys.some((key) => {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      return normalized === "true" || normalized === "1" || normalized === "yes";
    }
    return false;
  });
}

export function isLikelyInAppWallet(wallet: WalletPortfolio | null | undefined): boolean {
  if (!wallet) return false;
  const metadata = toRecord(wallet.metadata);
  const provider = typeof wallet.providerName === "string" ? wallet.providerName.toLowerCase() : "";
  const walletType = typeof wallet.walletType === "string" ? wallet.walletType.toLowerCase() : "";
  const metadataSource = typeof metadata?.source === "string" ? metadata.source.toLowerCase() : "";
  const metadataKind = typeof metadata?.kind === "string" ? metadata.kind.toLowerCase() : "";
  const metadataCategory = typeof metadata?.category === "string" ? metadata.category.toLowerCase() : "";
  const metadataLabel = typeof metadata?.label === "string" ? metadata.label.toLowerCase() : "";
  const tags = Array.isArray(metadata?.tags)
    ? metadata.tags
      .map((tag) => (typeof tag === "string" ? tag.toLowerCase() : ""))
      .filter(Boolean)
    : [];

  const keywordBuckets = [provider, walletType, metadataSource, metadataKind, metadataCategory, metadataLabel, ...tags];

  if (
    keywordBuckets.some((value) =>
      value.includes("in-app") ||
      value.includes("embedded") ||
      value.includes("smart") ||
      value.includes("hyperliquid"),
    )
  ) {
    return true;
  }

  if (hasTruthyFlag(metadata, ["engineProvisioned", "embedded", "inApp", "in_app"])) {
    return true;
  }

  const detectedKind = detectProvisionedWalletKind(wallet);
  if (detectedKind !== "unknown" && REQUIRED_IN_APP_WALLET_KINDS.includes(detectedKind)) {
    return true;
  }

  return false;
}

export function resolveWalletIconPath(wallet: WalletPortfolio | null | undefined): string {
  if (!wallet) {
    return getDefaultWalletIcon();
  }
  const directIcon = typeof wallet.walletTypeIcon === "string" ? wallet.walletTypeIcon : null;
  if (directIcon && directIcon.length > 0) {
    return directIcon;
  }
  const metadataIcon = (() => {
    if (!wallet.metadata || typeof wallet.metadata !== "object") return null;
    const record = wallet.metadata as Record<string, UntypedJson>;
    const value = record.icon ?? record.logo ?? record.image;
    return typeof value === "string" ? value : null;
  })();
  if (metadataIcon) {
    return metadataIcon;
  }
  return getWalletIcon(
    {
      provider: wallet.providerName ?? undefined,
      walletType: wallet.walletType ?? undefined,
    },
    { fallback: getDefaultWalletIcon() },
  );
}

function toNumeric(value: UntypedJson): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

export function detectProvisionedWalletKind(wallet: WalletPortfolio | null | undefined): ProvisionedWalletKind | "unknown" {
  if (!wallet) return "unknown";
  const metadata = toRecord(wallet.metadata);
  const explicit = typeof metadata?.kind === "string" ? metadata.kind.trim().toLowerCase() : "";
  if (explicit === "evm" || explicit === "hyperliquid" || explicit === "solana") {
    return explicit;
  }
  const label = typeof metadata?.label === "string" ? metadata.label.toLowerCase() : "";
  if (label.includes("hyperliquid")) return "hyperliquid";
  if (label.includes("solana")) return "solana";
  if (label.includes("evm") || label.includes("ethereum")) return "evm";
  const provider = typeof wallet.providerName === "string" ? wallet.providerName.toLowerCase() : "";
  if (provider.includes("hyperliquid")) return "hyperliquid";
  if (provider.includes("solana")) return "solana";
  if (provider.includes("evm") || provider.includes("ethereum")) return "evm";
  const address = typeof wallet.address === "string" ? wallet.address.trim() : "";
  if (address.startsWith("0x") && address.length === 42) {
    return "evm";
  }
  if (address && SOLANA_ADDRESS_REGEX.test(address)) {
    return "solana";
  }
  return "unknown";
}

export function resolveNativeAmountFromMetadata(metadata: Record<string, UntypedJson> | null | undefined): number | null {
  if (!metadata) return null;
  const balancesRecord = toRecord(metadata.balances);
  const nativeBalanceRecord = toRecord(metadata.nativeBalance);
  const candidates: UntypedJson[] = [
    metadata.nativeAmount,
    nativeBalanceRecord?.amount,
    balancesRecord?.nativeAmount,
    balancesRecord?.native,
  ];
  if (balancesRecord) {
    const nested = toRecord(balancesRecord.nativeBalance);
    if (nested) {
      candidates.push(nested.amount);
    }
  }
  for (const candidate of candidates) {
    const numeric = toNumeric(candidate);
    if (numeric != null) {
      return numeric;
    }
  }
  return null;
}

export function resolveChainPresentation(
  kind: ProvisionedWalletKind,
  metadata: Record<string, UntypedJson> | null,
  chainMap: Map<number, Chain>,
): { label: string; icon: string; symbol: string } {
  const chainId = toNumeric(metadata?.chainId);
  const cluster = typeof metadata?.cluster === "string" ? metadata.cluster.trim().toLowerCase() : null;

  if (kind === "solana") {
    return {
      label: cluster === "devnet" ? "Solana Devnet" : "Solana Mainnet",
      icon: "/icons/chain-icons/solana.svg",
      symbol: "SOL",
    };
  }

  if (kind === "hyperliquid") {
    return {
      label: "Hyperliquid",
      icon: "/icons/chain-icons/hyperliquid.svg",
      symbol: "HYPE",
    };
  }

  if (chainId && chainMap.has(chainId)) {
    const chain = chainMap.get(chainId)!;
    return {
      label: chain.name ?? "EVM",
      icon: getChainIconPath(chain),
      symbol: chain.nativeCurrency?.symbol ?? "ETH",
    };
  }

  if (chainId && FALLBACK_CHAIN_METADATA[chainId]) {
    return FALLBACK_CHAIN_METADATA[chainId];
  }

  return {
    label: "Ethereum",
    icon: "/icons/chain-icons/eth.svg",
    symbol: "ETH",
  };
}

export function buildChainDisplayItems(chains: Chain[]): ChainDisplayItem[] {
  const items = chains.map((chain) => {
    const icon = getChainIconPath(chain);
    const tokens: Array<string | null> = [chain.name ?? null, String(chain.id)];
    const chainRecord = chain as UntypedJson as Record<string, UntypedJson>;
    if (chainRecord.network) {
      tokens.push(String(chainRecord.network));
    }
    if (chain.nativeCurrency?.symbol) {
      tokens.push(chain.nativeCurrency.symbol);
    }
    if (chain.nativeCurrency?.name) {
      tokens.push(chain.nativeCurrency.name);
    }
    const searchText = tokens
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase())
      .join(" ");
    return { chain, icon, searchText };
  });
  return items.sort((a, b) => {
    const nameA = (a.chain.name ?? a.chain.id.toString()).toLowerCase();
    const nameB = (b.chain.name ?? b.chain.id.toString()).toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

export function extractChainRpcUrls(chain: Chain): string[] {
  const urls: string[] = [];
  const chainRecord = chain as UntypedJson as Record<string, UntypedJson>;
  const rpcUrls = chainRecord.rpcUrls as Record<string, Record<string, UntypedJson>> | undefined;
  const defaultHttp: string[] | undefined = rpcUrls?.default?.http as string[] | undefined;
  const publicHttp: string[] | undefined = rpcUrls?.public?.http as string[] | undefined;
  if (Array.isArray(defaultHttp)) {
    urls.push(...defaultHttp);
  }
  if (Array.isArray(publicHttp)) {
    urls.push(...publicHttp);
  }
  const rpcValue = chainRecord.rpc;
  if (Array.isArray(rpcValue)) {
    urls.push(...rpcValue);
  } else if (typeof rpcValue === "string") {
    urls.push(rpcValue);
  }
  return Array.from(new Set(urls.filter(Boolean)));
}

export function extractChainExplorerUrls(chain: Chain): string[] {
  const chainRecord = chain as UntypedJson as Record<string, UntypedJson>;
  const blockExplorers = chainRecord.blockExplorers as Record<string, Record<string, UntypedJson>> | undefined;
  const explorers: string[] = blockExplorers
    ? Object.values(blockExplorers)
      .map((entry) => (entry as Record<string, UntypedJson>)?.url)
      .filter((url): url is string => typeof url === "string" && url.length > 0)
    : [];
  return Array.from(new Set(explorers));
}

export { toRecord };

import type { WalletSnapshot } from "@/modules/wallets/profile";

export function mapSnapshotToPortfolio(snapshot: WalletSnapshot): WalletPortfolio {
  return {
    walletId: snapshot.id,
    walletType: "external_connected", // Default to external, adjust if snapshot has type info
    providerName: snapshot.provider,
    address: snapshot.address,
    metadata: {
      ...snapshot.metadata,
      type: snapshot.type,
      label: snapshot.label,
    },
    topAssets: snapshot.tokens.slice(0, 5).map((token) => ({
      symbol: token.symbol ?? "Unknown",
      name: token.name,
      icon: token.logoURI,
    })),
    topChains: snapshot.chains.map((chain) => ({
      name: chain.name,
      icon: chain.icon,
      type: chain.type === "mainnet" ? "mainnet" : "testnet",
    })),
    netWorthUsd: snapshot.totals.estimatedValueUsd,
    analytics: {
      accountId: "unknown", // Not available in snapshot
      walletId: snapshot.id,
      totals: {
        valueUsd: snapshot.totals.estimatedValueUsd,
        nativeValueUsd: snapshot.totals.nativeValueUsd,
        tokenValueUsd: null, // derived
        nftValueUsd: null, // derived
        costBasisUsd: null,
        unrealizedPnlUsd: null,
        change24hPercent: null,
      },
      positions: [], // Snapshot has tokens/nfts, but analytics expects different format
      snapshotAt: new Date().toISOString(),
    },
  };
}
