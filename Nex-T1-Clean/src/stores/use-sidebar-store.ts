"use client";

import { create } from "zustand";

export type SidebarPanel = "chatHistory" | "tasks" | "wallets";
export type WalletOverlayBalanceChain = "evm" | "solana";

interface SidebarStore {
  activePanel: SidebarPanel | null;
  walletOverlayBalanceChain: WalletOverlayBalanceChain;
  setPanel: (panel: SidebarPanel | null) => void;
  togglePanel: (panel: SidebarPanel) => void;
  closePanel: () => void;
  setWalletOverlayBalanceChain: (chain: WalletOverlayBalanceChain) => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  activePanel: null,
  walletOverlayBalanceChain: "evm",
  setPanel: (panel) => set({ activePanel: panel }),
  togglePanel: (panel) =>
    set((state) => ({
      activePanel: state.activePanel === panel ? null : panel,
    })),
  closePanel: () => set({ activePanel: null }),
  setWalletOverlayBalanceChain: (chain) => set({ walletOverlayBalanceChain: chain }),
}));
