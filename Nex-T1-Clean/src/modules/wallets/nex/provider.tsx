"use client";

/**
 * NexWalletProvider
 * Context provider for Nex wallet functionality
 */

import React, { createContext, useContext, useMemo, type ReactNode } from "react";
import { useNexAccount, type NexAccountState, type NexAccountActions } from "./hooks/use-nex-account";

/**
 * Nex wallet context value
 */
export interface NexWalletContextValue extends NexAccountState, NexAccountActions {
  /** Is the wallet system ready */
  isReady: boolean;
}

const NexWalletContext = createContext<NexWalletContextValue | null>(null);

/**
 * NexWalletProvider props
 */
export interface NexWalletProviderProps {
  /** User ID from Supabase auth */
  userId: string | null;
  /** Children components */
  children: ReactNode;
}

/**
 * Provider component for Nex wallet functionality
 * 
 * @example
 * ```tsx
 * <NexWalletProvider userId={user?.id ?? null}>
 *   <App />
 * </NexWalletProvider>
 * ```
 */
export function NexWalletProvider({ userId, children }: NexWalletProviderProps) {
  const account = useNexAccount(userId);

  const value = useMemo<NexWalletContextValue>(
    () => ({
      ...account,
      isReady: !account.isLoading && !account.error,
    }),
    [account]
  );

  return (
    <NexWalletContext.Provider value={value}>
      {children}
    </NexWalletContext.Provider>
  );
}

/**
 * Hook to access Nex wallet context
 * 
 * @throws If used outside of NexWalletProvider
 */
export function useNexWallet(): NexWalletContextValue {
  const context = useContext(NexWalletContext);
  if (!context) {
    throw new Error("useNexWallet must be used within a NexWalletProvider");
  }
  return context;
}

/**
 * Hook to check if inside NexWalletProvider
 */
export function useNexWalletOptional(): NexWalletContextValue | null {
  return useContext(NexWalletContext);
}
