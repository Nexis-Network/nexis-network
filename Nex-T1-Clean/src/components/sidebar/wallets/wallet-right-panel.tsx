"use client";

import type { WalletSnapshot, WalletTokenPosition } from "@/modules/wallets/profile";
import { featureFlags } from "@/lib/feature-flags";
import { WalletPortfolioPanel } from "./panels/wallet-portfolio-panel";
import { WalletSwapPanel } from "./panels/wallet-swap-panel";
import { WalletBridgePanel } from "./panels/wallet-bridge-panel";
import { WalletSendPanel } from "./panels/wallet-send-panel";
import { WalletReceivePanel } from "./panels/wallet-receive-panel";
import { WalletAssetDetailPanel } from "./panels/wallet-asset-detail-panel";

export type WalletViewType = "portfolio" | "swap" | "bridge" | "send" | "receive" | "watchlist" | "assetDetail";

interface WalletRightPanelProps {
  wallet: WalletSnapshot;
  activeView: WalletViewType;
  showHistory?: boolean;
  className?: string;
  onViewChange?: (view: WalletViewType, token?: WalletTokenPosition) => void;
  selectedAsset?: WalletTokenPosition | null;
}

import { WatchlistPanel } from "./panels/watchlist-panel";

export function WalletRightPanel({
  wallet,
  activeView,
  showHistory,
  className,
  onViewChange,
  selectedAsset,
}: WalletRightPanelProps) {
  switch (activeView) {
    case "swap":
      return <WalletSwapPanel wallet={wallet} />;
    case "bridge":
      return <WalletBridgePanel wallet={wallet} />;
    case "send":
      return <WalletSendPanel wallet={wallet} />;
    case "receive":
      return <WalletReceivePanel wallet={wallet} />;
    case "watchlist":
      return <WatchlistPanel wallet={wallet} />;
    case "assetDetail":
      if (featureFlags.walletAssetDetailV1) {
        return <WalletAssetDetailPanel wallet={wallet} token={selectedAsset ?? null} />;
      }
      return (
        <WalletPortfolioPanel
          wallet={wallet}
          showHistory={showHistory}
          className={className}
          onViewChange={onViewChange}
        />
      );
    case "portfolio":
    default:
      return (
        <WalletPortfolioPanel
          wallet={wallet}
          showHistory={showHistory}
          className={className}
          onViewChange={onViewChange}
        />
      );
  }
}
