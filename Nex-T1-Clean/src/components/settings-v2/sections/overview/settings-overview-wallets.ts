import type { SelectedWalletSelection } from "@/hooks/wallets/use-selected-wallet";
import {
  buildCdpEvmWalletSelection,
  buildCdpSolanaWalletSelection,
} from "@/hooks/wallets/use-selected-wallet.helpers";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import { resolveCdpEmbeddedEvmSelectionPresentation } from "@/lib/cdp/cdp-wallet-selection";
import type { SettingsPortfolioWalletFilter } from "@/lib/portfolio/settings-summary";
import type { WalletPortfolio } from "@/lib/user/profile";

export const ALL_WALLETS_SCOPE = "all" as const;
export const SETTINGS_OVERVIEW_ALL_WALLET_ICONS = [
  LIQUID_GLASS_LOGOS.ethereum,
  "/icons/chain-icons/arbitrum.svg",
  "/icons/chain-icons/base.svg",
  "/icons/chain-icons/polygon.svg",
  "/icons/chain-icons/optimism.svg",
  LIQUID_GLASS_LOGOS.bnb,
  LIQUID_GLASS_LOGOS.solana,
] as const;

export type OverviewEmbeddedWallet = {
  walletSource: Exclude<SettingsPortfolioWalletFilter, "all">;
  platform: "evm" | "solana";
  label: string;
  address: string;
  chainId: number | null;
  chainIcon: string;
  netWorthUsd: number;
  selection: SelectedWalletSelection;
};

export function normalizeOverviewWalletAddress(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("0x") ? trimmed.toLowerCase() : trimmed;
}

function walletMatchesAddress(wallet: WalletPortfolio, address: string): boolean {
  const normalizedAddress = normalizeOverviewWalletAddress(address);
  if (!normalizedAddress) {
    return false;
  }

  const directAddress = normalizeOverviewWalletAddress(wallet.address);
  if (directAddress === normalizedAddress) {
    return true;
  }

  const metadata =
    wallet.metadata && typeof wallet.metadata === "object" && !Array.isArray(wallet.metadata)
      ? wallet.metadata
      : null;
  const smartAccountAddress =
    typeof metadata?.smartAccountAddress === "string"
      ? normalizeOverviewWalletAddress(metadata.smartAccountAddress)
      : null;

  return smartAccountAddress === normalizedAddress;
}

function resolveEmbeddedWalletNetWorth(wallets: WalletPortfolio[], address: string): number {
  return wallets.reduce((sum, wallet) => {
    if (!walletMatchesAddress(wallet, address)) {
      return sum;
    }

    return sum + (wallet.netWorthUsd ?? 0);
  }, 0);
}

export function buildOverviewEmbeddedWallets(params: {
  profileWallets: WalletPortfolio[];
  evmAddress: string | null;
  solanaAddress: string | null;
}): OverviewEmbeddedWallet[] {
  const wallets: OverviewEmbeddedWallet[] = [];

  if (params.evmAddress) {
    const presentation = resolveCdpEmbeddedEvmSelectionPresentation({
      address: params.evmAddress,
      wallets: params.profileWallets,
    });
    wallets.push({
      walletSource: "cdp-embedded-evm",
      platform: "evm",
      label: "EVM Embedded Wallet",
      address: params.evmAddress,
      chainId: presentation.chainId,
      chainIcon: presentation.icon ?? "/icons/chain-icons/base.svg",
      netWorthUsd: resolveEmbeddedWalletNetWorth(params.profileWallets, params.evmAddress),
      selection: buildCdpEvmWalletSelection({
        address: params.evmAddress,
        label: "EVM Embedded Wallet",
        wallets: params.profileWallets,
      }),
    });
  }

  if (params.solanaAddress) {
    wallets.push({
      walletSource: "cdp-embedded-solana",
      platform: "solana",
      label: "Solana Embedded Wallet",
      address: params.solanaAddress,
      chainId: null,
      chainIcon: LIQUID_GLASS_LOGOS.solana,
      netWorthUsd: resolveEmbeddedWalletNetWorth(params.profileWallets, params.solanaAddress),
      selection: buildCdpSolanaWalletSelection({
        address: params.solanaAddress,
        label: "Solana Embedded Wallet",
      }),
    });
  }

  return wallets;
}

export function findOverviewEmbeddedWallet(
  wallets: OverviewEmbeddedWallet[],
  walletScope: SettingsPortfolioWalletFilter,
): OverviewEmbeddedWallet | null {
  if (walletScope === "all") {
    return null;
  }

  return wallets.find((wallet) => wallet.walletSource === walletScope) ?? null;
}

export function resolveOverviewWalletNetWorth(
  wallets: OverviewEmbeddedWallet[],
  walletScope: SettingsPortfolioWalletFilter,
): number {
  if (walletScope === "all") {
    return wallets.reduce((sum, wallet) => sum + wallet.netWorthUsd, 0);
  }

  return findOverviewEmbeddedWallet(wallets, walletScope)?.netWorthUsd ?? 0;
}

export function truncateOverviewWalletAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
