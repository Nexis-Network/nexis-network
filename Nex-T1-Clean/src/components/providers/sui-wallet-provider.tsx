"use client";

import { ReactNode, useMemo } from "react";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";

import "@mysten/dapp-kit/dist/index.css";

import { SUI_DEFAULT_NETWORK, suiNetworkConfig } from "@/modules/wallets/sui/config";
import { SuiWalletSupportProvider } from "@/modules/wallets/sui/use-sui-wallet-support";

const SUI_WALLET_STORAGE_KEY = "nex-sui-wallet";

type SuiWalletProviderProps = {
  children: ReactNode;
};

export function SuiWalletProvider({ children }: SuiWalletProviderProps) {
  // Only auto-connect if there's evidence of a previous session in storage
  // This prevents spurious connection attempts that cause console errors
  const shouldAutoConnect = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      // Check if there's an existing wallet preference saved
      const storedWallet = window.localStorage.getItem(SUI_WALLET_STORAGE_KEY);
      return Boolean(storedWallet);
    } catch {
      return false;
    }
  }, []);

  return (
    <SuiClientProvider networks={suiNetworkConfig} defaultNetwork={SUI_DEFAULT_NETWORK}>
      <WalletProvider autoConnect={shouldAutoConnect} storageKey={SUI_WALLET_STORAGE_KEY}>
        <SuiWalletSupportProvider>
          {children}
        </SuiWalletSupportProvider>
      </WalletProvider>
    </SuiClientProvider>
  );
}
