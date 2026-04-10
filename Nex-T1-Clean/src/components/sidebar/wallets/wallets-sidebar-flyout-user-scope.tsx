"use client";

import { useMemo } from "react";

import { WalletCarousel } from "./components/wallet-carousel";
import { WalletEmbeddedSwitcher } from "./components/wallet-embedded-switcher";
import { WalletFolderTabs, type WalletTab } from "./components/wallet-folder-tabs";
import { WalletMainContent } from "./components/wallet-main-content";
import { WalletRightPanel } from "./wallet-right-panel";
import { getSelectorWallets, isWalletEvm } from "./wallets-sidebar-flyout.helpers";
import type { WalletFlyoutUserScopeProps } from "./wallets-sidebar-flyout.types";

type WalletFlyoutUserScopeInternalProps = WalletFlyoutUserScopeProps & {
  leftTab: WalletTab;
  setLeftTab: (tab: WalletTab) => void;
};

export function WalletFlyoutUserScope({
  wallets,
  activeWallet,
  onSelectWallet,
  isLoading,
  activeView,
  onViewChange,
  hiddenWalletCount,
  onHideWallet,
  onRestoreHiddenWallets,
  onRefresh,
  leftTab,
  setLeftTab,
}: WalletFlyoutUserScopeInternalProps) {
  const selectorWallets = useMemo(() => getSelectorWallets(wallets), [wallets]);
  const activeWalletIsEvm = useMemo(() => isWalletEvm(activeWallet), [activeWallet]);

  return (
    <>
      <WalletEmbeddedSwitcher
        activeWallet={activeWallet}
        selectorWallets={selectorWallets}
        onSelectWallet={onSelectWallet}
      />

      <WalletCarousel
        wallets={wallets}
        activeWalletId={activeWallet?.id ?? null}
        onSelectWallet={onSelectWallet}
        onViewChange={onViewChange}
        isLoading={isLoading}
        onRefresh={onRefresh}
        onHideWallet={onHideWallet}
        hiddenWalletCount={hiddenWalletCount}
        onRestoreHiddenWallets={onRestoreHiddenWallets}
      />

      <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden">
        <div className="block shrink-0 sm:hidden">
          {activeWallet && activeView === "portfolio" ? (
            <div className="mb-4 rounded-[24px] border border-[#EBEBEB] bg-white/60 p-4 backdrop-blur-xs dark:border-white/10 dark:bg-[#C4C4C4]/5">
              <WalletRightPanel
                wallet={activeWallet}
                activeView="portfolio"
                showHistory={false}
                className="h-auto overflow-visible pr-0"
                onViewChange={onViewChange}
              />
            </div>
          ) : null}
        </div>

        <div className="pt-4">
          <WalletFolderTabs
            leftTab={leftTab}
            setLeftTab={setLeftTab}
            isEVM={activeWalletIsEvm}
          />
        </div>

        <WalletMainContent
          activeWallet={activeWallet}
          leftTab={leftTab}
          onViewChange={onViewChange}
        />
      </div>
    </>
  );
}
