"use client";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { Coin98WalletAdapter } from "@solana/wallet-adapter-coin98";
import { CoinbaseWalletAdapter } from "@solana/wallet-adapter-coinbase";
import { LedgerWalletAdapter } from "@solana/wallet-adapter-ledger";
import { SolflareWalletAdapter } from "@/modules/wallets/adapters/solflare-wallet-adapter";
import { TorusWalletAdapter } from "@solana/wallet-adapter-torus";
import { TrustWalletAdapter } from "@solana/wallet-adapter-trust";
import { WalletError, WalletConnectionError, WalletNotReadyError } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";
import type { Adapter } from "@solana/wallet-adapter-base";
import React, { useMemo, useCallback } from "react";


import { logger } from '@/lib/logger';
export function SolanaWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const wallets = useMemo(() => {
    const seen = new Set<string>();

    const adapters = [
      // Phantom is provided by wallet-standard; avoid duplicate adapter registration.
      new LedgerWalletAdapter(),
      new TorusWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new Coin98WalletAdapter(),
      new TrustWalletAdapter(),
    ];

    const filtered = adapters.filter((adapter) => {
      const normalizedName = adapter.name?.trim().toLowerCase() ?? "";
      if (!normalizedName) {
        return false;
      }
      if (seen.has(normalizedName)) {
        return false;
      }
      seen.add(normalizedName);
      return true;
    });
    return filtered as Adapter[];
  }, []);

  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_RPC ?? clusterApiUrl("devnet"),
    [],
  );

  // Handle wallet errors gracefully - especially auto-connect failures
  // This prevents WalletConnectionError from appearing as unhandled exceptions
  const handleError = useCallback((error: WalletError) => {
    // Suppress expected auto-connect failures (wallet not installed, user rejected, etc.)
    if (error instanceof WalletConnectionError || error instanceof WalletNotReadyError) {
      // Log at debug level - this is expected behavior when wallet isn't available
      if (process.env.NODE_ENV === "development") {
        logger.debug("[SolanaWallet] Connection attempt handled:", error.name, error.message);
      }
      return;
    }
    // For other errors, log a warning
    logger.warn("[SolanaWallet] Wallet error:", error.name, error.message);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider 
        wallets={wallets} 
        autoConnect
        onError={handleError}
      >
        <div vaul-drawer-wrapper="true">{children}</div>
      </WalletProvider>
    </ConnectionProvider>
  );
}
