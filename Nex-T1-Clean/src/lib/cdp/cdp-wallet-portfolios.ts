import type { WalletChainSummary, WalletPortfolio } from "@/lib/user/profile";
import {
  buildNetworkCapabilityMetadata,
  type ResolvedNetworkCapability,
} from "@/lib/networks/capabilities";
import { getCdpEmbeddedWalletChainSummaries } from "@/lib/cdp/cdp-chain-support";
import { getNexSmartAccountLabel } from "@/lib/cdp/cdp-wallet-labels";
import { resolveCdpEmbeddedEvmSelectionCapability } from "@/lib/cdp/cdp-wallet-selection";
import { LIQUID_GLASS_LOGOS } from "@/lib/liquid-glass-logos";

import type { ResolvedCdpWalletAddresses } from "./resolve-cdp-wallet-addresses";
import { isCdpWalletPortfolio } from "./resolve-cdp-wallet-addresses";

const COINBASE_WALLET_ICON = "/assets/wallet-logos/Coinbase.svg";
const DEFAULT_CDP_SOLANA_METADATA = {
  identityProvider: "cdp",
  executionProvider: "cdp",
  networkKey: "solana-mainnet",
} as const;

const SOLANA_CHAIN_SUMMARY: WalletChainSummary = {
  name: "Solana",
  icon: LIQUID_GLASS_LOGOS.solana,
  type: "mainnet",
};

type CdpWalletPlatform = "evm" | "solana";

const toLower = (value: string | null | undefined): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

function normalizeAddress(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

function getDefaultProviderName(): string {
  return getNexSmartAccountLabel();
}

function getDefaultWalletLabel(): string {
  return getNexSmartAccountLabel();
}

function getDefaultTopChains(platform: CdpWalletPlatform): WalletChainSummary[] {
  return platform === "solana"
    ? [SOLANA_CHAIN_SUMMARY]
    : getCdpEmbeddedWalletChainSummaries();
}

function buildCdpEvmMetadata(
  capability: ResolvedNetworkCapability,
): Record<string, string | number | boolean | null> {
  return {
    accountType: "smart",
    chainId: capability.chainId,
    ...buildNetworkCapabilityMetadata(capability),
  };
}

function findWalletIndexByAddress(wallets: WalletPortfolio[], address: string): number {
  const normalizedTarget = normalizeAddress(address);
  if (!normalizedTarget) return -1;

  return wallets.findIndex((wallet) => {
    const directAddress = normalizeAddress(wallet.address);
    if (directAddress === normalizedTarget) return true;

    const metadata =
      wallet.metadata && typeof wallet.metadata === "object" && !Array.isArray(wallet.metadata)
        ? wallet.metadata
        : null;
    const smartAccountAddress =
      typeof metadata?.smartAccountAddress === "string"
        ? normalizeAddress(metadata.smartAccountAddress)
        : null;

    return smartAccountAddress === normalizedTarget;
  });
}

function mergeExistingCdpWallet(
  wallet: WalletPortfolio,
  address: string,
  platform: CdpWalletPlatform,
  evmCapability: ResolvedNetworkCapability | null,
): WalletPortfolio {
  const metadata =
    wallet.metadata && typeof wallet.metadata === "object" && !Array.isArray(wallet.metadata)
      ? wallet.metadata
      : null;
  const cdpLike = wallet.walletType === "embedded" || isCdpWalletPortfolio(wallet);

  if (!cdpLike) {
    return wallet;
  }

  return {
    ...wallet,
    walletType: "embedded",
    walletTypeIcon: wallet.walletTypeIcon ?? COINBASE_WALLET_ICON,
    providerName: wallet.providerName ?? getDefaultProviderName(),
    label: wallet.label ?? getDefaultWalletLabel(),
    address: wallet.address ?? address,
    topChains: wallet.topChains.length > 0 ? wallet.topChains : getDefaultTopChains(platform),
    metadata: {
      provider: "cdp",
      source: "cdp_v2",
      walletType: "cdp",
      kind: platform,
      embedded: true,
      ...(platform === "solana"
        ? {
            accountType: "eoa",
            ...DEFAULT_CDP_SOLANA_METADATA,
          }
        : buildCdpEvmMetadata(evmCapability ?? resolveCdpEmbeddedEvmSelectionCapability({
            address,
            wallets: [wallet],
          }))),
      ...(metadata ?? {}),
    },
  };
}

function buildSyntheticCdpWallet(
  address: string,
  platform: CdpWalletPlatform,
  evmCapability: ResolvedNetworkCapability | null,
): WalletPortfolio {
  return {
    walletId: platform === "solana" ? `cdp-sol-${address}` : `cdp-evm-${address}`,
    walletType: "embedded",
    walletTypeIcon: COINBASE_WALLET_ICON,
    providerName: getDefaultProviderName(),
    label: getDefaultWalletLabel(),
    customLabel: null,
    change24hPercent: null,
    gainLoss24hUsd: null,
    topAssets: [],
    topChains: getDefaultTopChains(platform),
    netWorthUsd: null,
    address,
    status: "active",
    metadata: {
      provider: "cdp",
      source: "cdp_v2",
      walletType: "cdp",
      kind: platform,
      embedded: true,
      ...(platform === "solana"
        ? {
            accountType: "eoa",
            ...DEFAULT_CDP_SOLANA_METADATA,
          }
        : buildCdpEvmMetadata(
            evmCapability ??
              resolveCdpEmbeddedEvmSelectionCapability({
                address,
              }),
          )),
    },
    analytics: null,
  };
}

function applyResolvedCdpWallet(
  wallets: WalletPortfolio[],
  address: string | null,
  platform: CdpWalletPlatform,
) {
  if (!address) return;
  const evmCapability =
    platform === "evm"
      ? resolveCdpEmbeddedEvmSelectionCapability({
          address,
          wallets,
        })
      : null;

  const matchIndex = findWalletIndexByAddress(wallets, address);
  if (matchIndex === -1) {
    wallets.push(buildSyntheticCdpWallet(address, platform, evmCapability));
    return;
  }

  wallets[matchIndex] = mergeExistingCdpWallet(
    wallets[matchIndex]!,
    address,
    platform,
    evmCapability,
  );
}

export function augmentWalletPortfoliosWithResolvedCdp(
  wallets: WalletPortfolio[] | null | undefined,
  resolvedAddresses: Partial<ResolvedCdpWalletAddresses> | null | undefined,
): WalletPortfolio[] {
  const next = Array.isArray(wallets) ? [...wallets] : [];
  const evmAddress = resolvedAddresses?.evmAddress?.trim() || null;
  const solanaAddress = resolvedAddresses?.solanaAddress?.trim() || null;

  applyResolvedCdpWallet(next, evmAddress, "evm");
  applyResolvedCdpWallet(next, solanaAddress, "solana");

  return next;
}

export function isPortfolioSelectableWallet(wallet: WalletPortfolio): boolean {
  if (
    wallet.walletType === "agent_generated" ||
    wallet.walletType === "external_connected" ||
    wallet.walletType === "embedded"
  ) {
    return true;
  }

  const metadata =
    wallet.metadata && typeof wallet.metadata === "object" && !Array.isArray(wallet.metadata)
      ? wallet.metadata
      : null;
  const metadataWalletType = toLower(typeof metadata?.walletType === "string" ? metadata.walletType : undefined);

  return (
    isCdpWalletPortfolio(wallet) ||
    metadataWalletType === "safe" ||
    metadataWalletType === "smart_wallet"
  );
}

export function getPortfolioWalletKindLabel(wallet: WalletPortfolio): string {
  if (wallet.walletType === "agent_generated") {
    return "Safe Core";
  }

  if (wallet.walletType === "embedded" || isCdpWalletPortfolio(wallet)) {
    return getNexSmartAccountLabel();
  }

  return "Wallet";
}
