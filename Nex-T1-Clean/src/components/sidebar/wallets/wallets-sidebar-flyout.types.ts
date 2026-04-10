import type { WalletTokenPosition, WalletSnapshot } from "@/modules/wallets/profile";

import type { WalletViewType } from "./wallet-right-panel";

export type WalletFlyoutViewChangeHandler = (
  view: WalletViewType,
  token?: WalletTokenPosition,
) => void;

export type WalletsSidebarFlyoutProps = {
  isOpen: boolean;
  onClose: () => void;
};

export type WalletFlyoutContentProps = {
  wallets: WalletSnapshot[];
  activeWallet: WalletSnapshot | null;
  onSelectWallet: (walletId: string) => void;
  isLoading: boolean;
  activeView: WalletViewType;
  onViewChange: WalletFlyoutViewChangeHandler;
  selectedAsset: WalletTokenPosition | null;
  hiddenWalletCount: number;
  onHideWallet: (walletId: string) => void;
  onRestoreHiddenWallets: () => void;
  onRefresh: () => void;
};

export type WalletFlyoutUserScopeProps = Pick<
  WalletFlyoutContentProps,
  | "wallets"
  | "activeWallet"
  | "onSelectWallet"
  | "isLoading"
  | "activeView"
  | "onViewChange"
  | "hiddenWalletCount"
  | "onHideWallet"
  | "onRestoreHiddenWallets"
  | "onRefresh"
>;

export type WalletFlyoutSidePanelProps = Pick<
  WalletFlyoutContentProps,
  "activeWallet" | "activeView" | "onViewChange" | "selectedAsset"
> & {
  isPortfolioView: boolean;
  walletScope: "user" | "agent";
};
