"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  glassSurfaceClass,
  glassSurfaceStyle,
  glassSurfaceTranslucentClass,
} from "@/lib/ui/surface";

import { useWalletsSidebarState } from "./use-wallets-sidebar-state";
import { useWalletsSidebarWallets } from "./use-wallets-sidebar-wallets";
import { WalletsSidebarFlyoutContent } from "./wallets-sidebar-flyout-content";
import type { WalletsSidebarFlyoutProps } from "./wallets-sidebar-flyout.types";

export function WalletsSidebarFlyout({
  isOpen,
  onClose,
}: WalletsSidebarFlyoutProps) {
  const router = useRouter();
  const { wallets, isLoading, refresh } = useWalletsSidebarWallets(isOpen);
  const {
    visibleWallets,
    activeWallet,
    activeView,
    selectedAsset,
    hiddenWalletCount,
    handleHideWallet,
    handleRestoreHiddenWallets,
    handleWalletSelect,
    handleViewChange,
  } = useWalletsSidebarState({
    wallets,
    isOpen,
  });

  const handleRefresh = useCallback(() => {
    refresh();
    router.refresh();
  }, [refresh, router]);

  return (
    <Sheet open={isOpen} onOpenChange={(open: boolean) => (!open ? onClose() : undefined)}>
      <SheetContent
        side="right"
        data-testid="wallets-sidebar-flyout"
        className={cn(
          glassSurfaceClass,
          glassSurfaceTranslucentClass,
          "flex h-[100dvh] w-full max-w-full flex-col gap-0 rounded-none border-0 bg-[rgba(240,240,240,0.9)] p-0 text-[#171717] outline-none backdrop-blur-md",
          "shadow-[inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.5),inset_2px_2px_1px_-2px_#B3B3B3,inset_-2px_-2px_1px_-2px_#B3B3B3,inset_0px_0px_0px_1px_#999999,inset_0px_0px_22px_rgba(242,242,242,0.5)]",
          "dark:bg-transparent dark:text-[#666666] dark:shadow-none",
          "sm:m-[8px] sm:h-[calc(100vh-16px)] sm:max-w-4xl sm:max-w-[calc(100vw-1rem)] sm:rounded-lg sm:border sm:border-black/10 dark:sm:border-white/10",
        )}
        style={{ ...glassSurfaceStyle }}
      >
        <SheetTitle className="sr-only">Wallet Manager</SheetTitle>
        <SheetDescription className="sr-only">
          Manage your connected wallets, view assets, and track activity.
        </SheetDescription>

        <WalletsSidebarFlyoutContent
          wallets={visibleWallets}
          activeWallet={activeWallet}
          onSelectWallet={handleWalletSelect}
          isLoading={isLoading}
          activeView={activeView}
          onViewChange={handleViewChange}
          selectedAsset={selectedAsset}
          hiddenWalletCount={hiddenWalletCount}
          onHideWallet={handleHideWallet}
          onRestoreHiddenWallets={handleRestoreHiddenWallets}
          onRefresh={handleRefresh}
        />
      </SheetContent>
    </Sheet>
  );
}
