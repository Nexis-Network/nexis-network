"use client";

import type { ReactNode } from "react";

import { CdpProvider } from "@/components/providers/cdp-provider";
import { SolanaWalletProvider } from "@/components/providers/solana-wallet-provider";
import { SuiWalletProvider } from "@/components/providers/sui-wallet-provider";
import { WagmiProvider } from "@/components/providers/wagmi-provider";
import { SelectedWalletProvider } from "@/hooks/wallets/use-selected-wallet";

type WalletProvidersBoundaryProps = {
  children: ReactNode;
};

export function WalletProvidersBoundary({ children }: WalletProvidersBoundaryProps) {
  return (
    <CdpProvider>
      <WagmiProvider>
        <SolanaWalletProvider>
          <SuiWalletProvider>
            <SelectedWalletProvider>{children}</SelectedWalletProvider>
          </SuiWalletProvider>
        </SolanaWalletProvider>
      </WagmiProvider>
    </CdpProvider>
  );
}
