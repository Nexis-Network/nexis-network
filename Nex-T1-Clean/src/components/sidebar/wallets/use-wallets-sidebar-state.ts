"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

import { featureFlags } from "@/lib/feature-flags";
import { trackAgentEvent } from "@/modules/analytics/events";
import type { WalletSnapshot, WalletTokenPosition } from "@/modules/wallets/profile";
import { useSidebarStore } from "@/stores/use-sidebar-store";

import type { WalletViewType } from "./wallet-right-panel";
import { getWalletBalanceChain } from "./wallets-sidebar-flyout.helpers";
import { useWalletsSidebarHiddenWalletIds } from "./use-wallets-sidebar-hidden-wallet-ids";

export function useWalletsSidebarState(args: {
  wallets: WalletSnapshot[];
  isOpen: boolean;
}) {
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<WalletViewType>("portfolio");
  const [selectedAsset, setSelectedAsset] = useState<WalletTokenPosition | null>(null);
  const {
    hiddenWalletIds,
    hiddenWalletCount,
    handleHideWallet,
    handleRestoreHiddenWallets,
  } = useWalletsSidebarHiddenWalletIds(args.isOpen);
  const setWalletOverlayBalanceChain = useSidebarStore(
    (state) => state.setWalletOverlayBalanceChain,
  );

  const visibleWallets = useMemo(() => args.wallets.filter((wallet) => !hiddenWalletIds.has(wallet.id)), [args.wallets, hiddenWalletIds]);

  useEffect(() => {
    if (!visibleWallets.length) {
      setActiveWalletId(null);
      return;
    }

    if (!activeWalletId || !visibleWallets.some((wallet) => wallet.id === activeWalletId)) {
      setActiveWalletId(visibleWallets[0]?.id ?? null);
    }
  }, [activeWalletId, visibleWallets]);

  const activeWallet = useMemo(
    () => visibleWallets.find((wallet) => wallet.id === activeWalletId) ?? null,
    [activeWalletId, visibleWallets],
  );

  const activeWalletBalanceChain = useMemo(() => getWalletBalanceChain(activeWallet), [activeWallet]);

  useEffect(() => {
    setWalletOverlayBalanceChain(activeWalletBalanceChain);
  }, [activeWalletBalanceChain, setWalletOverlayBalanceChain]);

  useEffect(() => {
    setActiveView("portfolio");
    setSelectedAsset(null);
  }, [activeWalletId]);

  const handleViewChange = useCallback(
    (view: WalletViewType, token?: WalletTokenPosition) => {
      if (view === "assetDetail" && featureFlags.walletAssetDetailV1) {
        if (token) {
          setSelectedAsset(token);
          setActiveView("assetDetail");
        }
        return;
      }

      setSelectedAsset(null);
      setActiveView(view);
    },
    [],
  );

  const trackWalletSelected = useDebouncedCallback((selected: WalletSnapshot) => {
    trackAgentEvent("wallet_selected", {
      walletId: selected.id,
      provider: selected.provider,
      valueUsd: selected.totals.estimatedValueUsd ?? null,
    });
  }, 2000);

  const handleWalletSelect = useCallback(
    (walletId: string) => {
      const selectedWallet = args.wallets.find((wallet) => wallet.id === walletId);
      if (selectedWallet) {
        trackWalletSelected(selectedWallet);
      }
      setActiveWalletId(walletId);
    },
    [args.wallets, trackWalletSelected],
  );

  return {
    visibleWallets,
    activeWallet,
    activeView,
    selectedAsset,
    hiddenWalletCount,
    handleHideWallet,
    handleRestoreHiddenWallets,
    handleWalletSelect,
    handleViewChange,
  };
}
