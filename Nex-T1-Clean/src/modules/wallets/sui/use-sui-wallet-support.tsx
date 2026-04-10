"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  useConnectWallet,
  useCurrentAccount,
  useCurrentWallet,
  useDisconnectWallet,
  useWallets,
} from "@mysten/dapp-kit";

type ConnectWalletResult = ReturnType<typeof useConnectWallet>;
type DisconnectWalletResult = ReturnType<typeof useDisconnectWallet>;
type CurrentAccountResult = ReturnType<typeof useCurrentAccount>;
type CurrentWalletState = ReturnType<typeof useCurrentWallet>;
type WalletListResult = ReturnType<typeof useWallets>;

export type SuiWalletSupport = {
  providerAvailable: boolean;
  currentAccount: CurrentAccountResult | null;
  walletState: CurrentWalletState | null;
  wallets: WalletListResult;
  connectWallet: ConnectWalletResult | null;
  disconnectWallet: DisconnectWalletResult | null;
  error: Error | null;
};

const SuiWalletSupportContext = createContext<SuiWalletSupport | null>(null);

const FALLBACK_SUPPORT: SuiWalletSupport = {
  providerAvailable: false,
  currentAccount: null,
  walletState: null,
  wallets: [] as WalletListResult,
  connectWallet: null,
  disconnectWallet: null,
  error: null,
};

export function SuiWalletSupportProvider({ children }: { children: ReactNode }) {
  const currentAccount = useCurrentAccount();
  const walletState = useCurrentWallet();
  const wallets = useWallets();
  const connectWallet = useConnectWallet();
  const disconnectWallet = useDisconnectWallet();

  const value = useMemo<SuiWalletSupport>(
    () => ({
      providerAvailable: true,
      currentAccount,
      walletState,
      wallets,
      connectWallet,
      disconnectWallet,
      error: null,
    }),
    [currentAccount, walletState, wallets, connectWallet, disconnectWallet],
  );

  return (
    <SuiWalletSupportContext.Provider value={value}>
      {children}
    </SuiWalletSupportContext.Provider>
  );
}

export function useSuiWalletSupport(): SuiWalletSupport {
  return useContext(SuiWalletSupportContext) ?? FALLBACK_SUPPORT;
}
