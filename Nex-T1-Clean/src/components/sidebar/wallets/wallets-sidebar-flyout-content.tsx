"use client";

import { useEffect, useState } from "react";

import { AgentWalletTabs, type WalletScopeTab } from "./agent-wallet-tabs";
import { WalletFlyoutSidePanel } from "./wallets-sidebar-flyout-side-panel";
import { WalletFlyoutUserScope } from "./wallets-sidebar-flyout-user-scope";
import type { WalletFlyoutContentProps } from "./wallets-sidebar-flyout.types";
import type { WalletTab } from "./components/wallet-folder-tabs";
import { isWalletEvm } from "./wallets-sidebar-flyout.helpers";

export function WalletsSidebarFlyoutContent({
  wallets,
  activeWallet,
  onSelectWallet,
  isLoading,
  activeView,
  onViewChange,
  selectedAsset,
  hiddenWalletCount,
  onHideWallet,
  onRestoreHiddenWallets,
  onRefresh,
}: WalletFlyoutContentProps) {
  const [leftTab, setLeftTab] = useState<WalletTab>("assets");
  const [walletScope, setWalletScope] = useState<WalletScopeTab>("user");
  const activeWalletIsEvm = isWalletEvm(activeWallet);
  const isPortfolioView = activeView === "portfolio";

  useEffect(() => {
    if (!activeWalletIsEvm && (leftTab === "protocols" || leftTab === "approvals")) {
      setLeftTab("assets");
    }
  }, [activeWalletIsEvm, leftTab]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[rgba(255,255,255,0.55)] text-[#171717] backdrop-blur-md dark:bg-[#121212]/60 dark:text-white sm:flex-row sm:gap-6 sm:p-6">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 px-1 pb-3">
          <AgentWalletTabs activeTab={walletScope} onTabChange={setWalletScope} />
        </div>

        {walletScope === "user" ? (
          <WalletFlyoutUserScope
            wallets={wallets}
            activeWallet={activeWallet}
            onSelectWallet={onSelectWallet}
            isLoading={isLoading}
            activeView={activeView}
            onViewChange={onViewChange}
            hiddenWalletCount={hiddenWalletCount}
            onHideWallet={onHideWallet}
            onRestoreHiddenWallets={onRestoreHiddenWallets}
            onRefresh={onRefresh}
            leftTab={leftTab}
            setLeftTab={setLeftTab}
          />
        ) : null}
      </div>

      <WalletFlyoutSidePanel
        activeWallet={activeWallet}
        activeView={activeView}
        onViewChange={onViewChange}
        selectedAsset={selectedAsset}
        isPortfolioView={isPortfolioView}
        walletScope={walletScope}
      />
    </div>
  );
}
