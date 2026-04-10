"use client";

import { useCallback, useEffect, useState } from "react";

import { HIDDEN_WALLET_IDS_STORAGE_KEY } from "./wallets-sidebar-flyout.helpers";

export function useWalletsSidebarHiddenWalletIds(isOpen: boolean) {
  const [hiddenWalletIds, setHiddenWalletIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;

    try {
      const raw = window.localStorage.getItem(HIDDEN_WALLET_IDS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (!Array.isArray(parsed)) return;
      setHiddenWalletIds(new Set(parsed.filter((walletId) => typeof walletId === "string" && walletId.length > 0)));
    } catch {
      // Ignore malformed local storage payload.
    }
  }, [isOpen]);

  const updateHiddenWalletIds = useCallback((updater: (prev: Set<string>) => Set<string>) => {
    setHiddenWalletIds((prev) => {
      const next = updater(prev);
      window.localStorage.setItem(HIDDEN_WALLET_IDS_STORAGE_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const handleHideWallet = useCallback(
    (walletId: string) => {
      updateHiddenWalletIds((prev) => {
        if (prev.has(walletId)) return prev;
        const next = new Set(prev);
        next.add(walletId);
        return next;
      });
    },
    [updateHiddenWalletIds],
  );

  const handleRestoreHiddenWallets = useCallback(() => {
    updateHiddenWalletIds(() => new Set());
  }, [updateHiddenWalletIds]);

  return {
    hiddenWalletIds,
    hiddenWalletCount: hiddenWalletIds.size,
    handleHideWallet,
    handleRestoreHiddenWallets,
  };
}
