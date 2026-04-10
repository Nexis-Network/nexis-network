import { resolveCdpEmbeddedEvmSelectionPresentation } from "@/lib/cdp/cdp-wallet-selection";
import type { WalletPortfolio } from "@/lib/user/profile";
import {
  buildCdpEvmWalletSelection,
  buildCdpSolanaWalletSelection,
} from "@/hooks/wallets/use-selected-wallet.helpers";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import type { SelectedWalletSelection } from "@/hooks/wallets/use-selected-wallet";
import { getSettingsWalletSwitcherCopy } from "@/modules/settings/i18n";
import {
  getSelectedEmbeddedWalletChainId,
  resolveEmbeddedWalletLabel,
} from "./settings-header-wallet-switcher.labels";

export type HeaderEmbeddedWallet = {
  id: string;
  label: string;
  platform: "evm" | "solana";
  address: string;
  chainId: number | null;
  chainIcon: string;
  canBuy: boolean;
  selection: SelectedWalletSelection;
};

export function truncateWalletAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function buildEmbeddedWallets(args: {
  profileWallets: WalletPortfolio[];
  evmAddress: string | null;
  solanaAddress: string | null;
  copy: ReturnType<typeof getSettingsWalletSwitcherCopy>;
  selectedWallet: SelectedWalletSelection | null;
}): HeaderEmbeddedWallet[] {
  const wallets: HeaderEmbeddedWallet[] = [];

  if (args.evmAddress) {
    const selectedChainId = getSelectedEmbeddedWalletChainId(
      args.selectedWallet,
      args.evmAddress,
    );
    const presentation = resolveCdpEmbeddedEvmSelectionPresentation({
      address: args.evmAddress,
      preferredChainId: selectedChainId,
      wallets: args.profileWallets,
    });

    wallets.push({
      id: "cdp-v2-evm",
      label: resolveEmbeddedWalletLabel(
        args.profileWallets,
        args.evmAddress,
        args.copy.baseSmartWallet,
      ),
      platform: "evm",
      address: args.evmAddress,
      chainId: presentation.chainId,
      chainIcon: presentation.icon ?? "/icons/chain-icons/base.svg",
      canBuy: true,
      selection: buildCdpEvmWalletSelection({
        address: args.evmAddress,
        label: args.copy.baseSmartWallet,
        preferredChainId: selectedChainId,
        wallets: args.profileWallets,
      }),
    });
  }

  if (args.solanaAddress) {
    wallets.push({
      id: "cdp-v2-solana",
      label: resolveEmbeddedWalletLabel(
        args.profileWallets,
        args.solanaAddress,
        args.copy.solanaEmbeddedWallet,
      ),
      platform: "solana",
      address: args.solanaAddress,
      chainId: null,
      chainIcon: LIQUID_GLASS_LOGOS.solana,
      canBuy: false,
      selection: buildCdpSolanaWalletSelection({
        address: args.solanaAddress,
        label: args.copy.solanaEmbeddedWallet,
      }),
    });
  }

  return wallets;
}
