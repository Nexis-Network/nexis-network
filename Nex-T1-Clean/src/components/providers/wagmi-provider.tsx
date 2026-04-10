"use client";

/**
 * Wagmi Provider
 *
 * Domain: Web3/Wallet
 * Responsibility: Provides Wagmi context for EOA wallet connections
 * Dependencies: wagmi, react-query
 */

import { type ReactNode, useState } from "react";
import { WagmiProvider as WagmiProviderBase, type State } from "wagmi";
import { getWagmiConfig, type WagmiConfigType } from "@/lib/web3/wagmi-config";

type WagmiProviderProps = {
  children: ReactNode;
  initialState?: State;
};

function isKnownProviderInjectionClash(message: string, filename: string): boolean {
  return (
    message.includes("Cannot redefine property: ethereum") ||
    filename.includes("evmAsk.js")
  );
}

function isKnownCoinbaseWalletCoopNoise(args: unknown[]): boolean {
  if (!args.length) return false;
  const [firstArg, secondArg] = args;
  const message = typeof firstArg === "string" ? firstArg : "";
  const detail = typeof secondArg === "string" ? secondArg : "";

  return (
    message.includes("Error checking Cross-Origin-Opener-Policy:") &&
    detail.includes("Failed to fetch")
  );
}

function installProviderInjectionErrorGuard() {
  if (typeof window === "undefined") return;
  const guardWindow = window as Window & {
    __nexProviderInjectionGuardInstalled?: boolean;
    __nexConsoleErrorGuardInstalled?: boolean;
  };

  if (!guardWindow.__nexProviderInjectionGuardInstalled) {
    const onWindowError = (event: ErrorEvent) => {
      const message = event.message ?? "";
      const filename = event.filename ?? "";
      if (!isKnownProviderInjectionClash(message, filename)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "";
      if (!isKnownProviderInjectionClash(message, "")) return;
      event.preventDefault();
    };

    window.addEventListener("error", onWindowError, { capture: true });
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    guardWindow.__nexProviderInjectionGuardInstalled = true;
  }

  if (!guardWindow.__nexConsoleErrorGuardInstalled) {
    const originalConsoleError = window.console.error.bind(window.console);
    window.console.error = (...args: unknown[]) => {
      if (isKnownCoinbaseWalletCoopNoise(args)) {
        return;
      }
      originalConsoleError(...args);
    };
    guardWindow.__nexConsoleErrorGuardInstalled = true;
  }
}

installProviderInjectionErrorGuard();

/**
 * WagmiProvider wraps children with Wagmi context for EOA wallet connections.
 *
 * This provider:
 * - Initializes Wagmi config client-side to avoid hydration mismatches
 * - Supports initial state for SSR rehydration
 * - Works alongside existing Solana/Sui wallet providers
 */
export function WagmiProvider({ children, initialState }: WagmiProviderProps) {
  const [config] = useState<WagmiConfigType>(() => getWagmiConfig());

  return (
    <WagmiProviderBase config={config} initialState={initialState}>
      {children}
    </WagmiProviderBase>
  );
}
