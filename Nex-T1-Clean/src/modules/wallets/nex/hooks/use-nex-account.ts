"use client";

/**
 * useNexAccount Hook
 * Manages the user's Nex smart account and Solana wallets
 */

import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Address, Account } from "viem";
import type { SmartAccount, WebAuthnAccount } from "viem/account-abstraction";
import { createNexSmartAccount, getSmartAccountAddress, isSmartAccountDeployed, calculateSafeAddress } from "../safe-account";
import { createNexSigner, getNexSigner, hasNexSigner, getNexSignerAddress, exportNexSignerKey } from "../signer";
import { registerPasskey, loginPasskey, hasPasskeyOnDevice, getStoredCredentialData } from "../passkey-signer";
import { registerWalletPasskey, authenticateWalletPasskey } from "@/lib/passkeys/client";
import { getOrCreateSolanaWallet, hasSolanaWallet, getSolanaPublicKey, exportSolanaPrivateKey } from "../solana-wallet";
import { DEFAULT_CHAIN_ID, getChainConfig } from "../chains";

import { logger } from '@/lib/logger';
/**
 * Nex account state
 */
export interface NexAccountState {
  /** User ID from Supabase */
  userId: string | null;
  /** Wallet lifecycle status */
  status: "locked" | "initializing" | "unlocked" | "error";
  /** Is the wallet system initialized */
  isInitialized: boolean;
  /** Is currently loading */
  isLoading: boolean;
  /** Error if any */
  error: string | null;
  
  /** EVM smart account */
  evm: {
    /** Owner address (EOA that controls the smart account) */
    ownerAddress: Address | null;
    /** Smart account address (counterfactual or deployed) */
    smartAccountAddress: Address | null;
    /** Active chain ID */
    chainId: number;
    /** Whether the smart account is deployed on-chain */
    isDeployed: boolean;
    /** The smart account instance (only when unlocked) */
    account: SmartAccount | UntypedJson | null;
    /** The owner signer (only when unlocked) */
    signer: Account | WebAuthnAccount | null;
    /** Whether the current signer is a passkey */
    isPasskey: boolean;
  };
  
  /** Solana wallets */
  solana: {
    mainnet: {
      address: string | null;
      exists: boolean;
    };
    devnet: {
      address: string | null;
      exists: boolean;
    };
  };
}

export const SMART_ACCOUNT_CACHE_KEY = "nex_sa_cache";

function isLocalOwnerFlowEnabled(): boolean {
  const override = process.env.NEXT_PUBLIC_LOCAL_OWNER_ENABLED?.trim().toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function loadSmartAccountCache(uid: string, chainId: number): Address | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SMART_ACCOUNT_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, Record<string, string>>;
    const userCache = parsed[uid];
    if (!userCache) return null;
    const address = userCache[String(chainId)];
    return (address as Address) ?? null;
  } catch {
    return null;
  }
}

export function saveSmartAccountCache(uid: string, chainId: number, address: Address) {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(SMART_ACCOUNT_CACHE_KEY);
  const parsed = raw ? (JSON.parse(raw) as Record<string, Record<string, string>>) : {};
  const userCache = parsed[uid] ?? {};
  userCache[String(chainId)] = address;
  parsed[uid] = userCache;
  window.localStorage.setItem(SMART_ACCOUNT_CACHE_KEY, JSON.stringify(parsed));
}

/**
 * Actions for Nex account management
 */
export interface NexAccountActions {
  /** Initialize/create wallets with password */
  initialize: (password: string) => Promise<void>;
  /** Unlock wallets with password */
  unlock: (password: string) => Promise<void>;
  /** Lock wallets (clear sensitive data from memory) */
  lock: () => void;
  /** Switch active EVM chain */
  switchChain: (chainId: number) => Promise<void>;
  /** Export EVM private key */
  exportEvmKey: (password: string) => Promise<string | null>;
  /** Export Solanaprivate key */
  exportSolanaKey: (network: "mainnet" | "devnet", password: string) => Promise<string | null>;
  /** Refresh account state */
  refresh: () => void;
  /** Initialize with Passkey (WebAuthn) */
  initializeWithPasskey: () => Promise<void>;
  /** Login with Passkey (WebAuthn) */
  loginWithPasskey: () => Promise<void>;
  /** Connect an external signer (e.g. MetaMask, Thirdweb) */
  connectExternalSigner: (signer: Account) => Promise<void>;
}

/**
 * Hook to manage Nex account
 */
export function useNexAccount(userId: string | null): NexAccountState & NexAccountActions {
  const queryClient = useQueryClient();
  
  const [walletStatus, setWalletStatus] = useState<"locked" | "initializing" | "unlocked" | "error">("locked");
  const [evmSigner, setEvmSigner] = useState<Account | WebAuthnAccount | null>(null);
  const [isPasskeySigner, setIsPasskeySigner] = useState(false);
  const [evmAccount, setEvmAccount] = useState<SmartAccount | null>(null);
  const [activeChainId, setActiveChainId] = useState(DEFAULT_CHAIN_ID);
  const [cachedSmartAccountAddress, setCachedSmartAccountAddress] = useState<Address | null>(null);
  const localOwnerEnabled = isLocalOwnerFlowEnabled();



  const loadCachedSmartAccountAddress = useCallback((uid: string, chainId: number): Address | null => {
    return loadSmartAccountCache(uid, chainId);
  }, []);

  const persistSmartAccountAddress = useCallback((uid: string, chainId: number, address: Address) => {
    saveSmartAccountCache(uid, chainId, address);

    // Sync to backend for Portfolio/Sidebar visibility
    // We fire-and-forget this to not block UI, but it ensures the DB knows about this wallet
    if (!localOwnerEnabled) return;

    fetch("/api/nex/wallets/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address,
        chainId,
        type: "safe", // explicitly mark as safe wallet
      }),
    }).catch((err) => {
      logger.error("Failed to sync Safe wallet to backend", err);
    });
  }, [localOwnerEnabled]);
  
  // Check if wallets exist (no password needed)
  const { data: walletState, isLoading, error, refetch } = useQuery({
    queryKey: ["nex-wallet-state", userId],
    queryFn: async () => {
      if (!userId) {
        return {
          evmExists: false,
          evmOwnerAddress: null as Address | null,
          solanaMainnetExists: false,
          solanaMainnetAddress: null as string | null,
          solanaDevnetExists: false,
          solanaDevnetAddress: null as string | null,
        };
      }
      
      const legacyAddress = await getNexSignerAddress(userId);
      const passkeyData = getStoredCredentialData();
      // Prefer legacy address if it matches user, otherwise fallback to passkey
      // Note: passkey storage is currently single-slot (last active), not keyed by user ID
      const evmOwnerAddress = legacyAddress ?? (passkeyData?.address as Address) ?? null;

      return {
        evmExists: (await hasNexSigner(userId)) || hasPasskeyOnDevice(),
        evmOwnerAddress,
        solanaMainnetExists: hasSolanaWallet(userId, "mainnet"),
        solanaMainnetAddress: getSolanaPublicKey(userId, "mainnet"),
        solanaDevnetExists: hasSolanaWallet(userId, "devnet"),
        solanaDevnetAddress: getSolanaPublicKey(userId, "devnet"),
      };
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
  });

  // Hydrate cached smart account address on mount / chain change
  useEffect(() => {
    if (!userId) {
      setCachedSmartAccountAddress(null);
      setWalletStatus("locked");
      return;
    }
    const cached = loadCachedSmartAccountAddress(userId, activeChainId);
    setCachedSmartAccountAddress(cached);
  }, [activeChainId, loadCachedSmartAccountAddress, userId, setCachedSmartAccountAddress]);
  
  // Query for smart account address (derived from owner)
  const { data: smartAccountData } = useQuery({
    queryKey: ["nex-smart-account", userId, walletState?.evmOwnerAddress, activeChainId, cachedSmartAccountAddress],
    queryFn: async () => {
      // 1. If we have a live signer, use it to get/deploy the account
      if (evmSigner) {
        const address = await getSmartAccountAddress({
          owner: evmSigner as UntypedJson as Account,
          chainId: activeChainId,
        });
        persistSmartAccountAddress(userId!, activeChainId, address);
        const isDeployed = await isSmartAccountDeployed({
          address,
          chainId: activeChainId,
        });
        return { address, isDeployed };
      }

      // 2. If no signer, but we have the owner address (locked state), calculate the Safe address
      if (walletState?.evmOwnerAddress) {
        const address = await calculateSafeAddress({
          ownerAddress: walletState.evmOwnerAddress,
          chainId: activeChainId,
        });
        // Cache it for consistency
        persistSmartAccountAddress(userId!, activeChainId, address);
        
        const isDeployed = await isSmartAccountDeployed({
          address,
          chainId: activeChainId,
        });
        return { address, isDeployed };
      }

      // 3. Fallback to cache if available
      if (cachedSmartAccountAddress) {
        const isDeployed = await isSmartAccountDeployed({
          address: cachedSmartAccountAddress,
          chainId: activeChainId,
        });
        return { address: cachedSmartAccountAddress, isDeployed };
      }

      return { address: null, isDeployed: false };
    },
    // Enable if we have a signer, OR if we have an owner address (locked), OR cached address
    enabled: !!userId && (!!evmSigner || !!walletState?.evmOwnerAddress || !!cachedSmartAccountAddress),
    staleTime: 60000, // 1 minute
  });
  
  // Initialize wallets
  const initialize = useCallback(async (password: string) => {
    if (!userId) {
      throw new Error("User not authenticated");
    }
    if (!localOwnerEnabled) {
      throw new Error("local_owner_disabled");
    }
    setWalletStatus("initializing");
    try {
      // Create EVM signer
      const { account: signer } = await createNexSigner({
        userId,
        password,
      });
      
      // Create Solana wallets
      await getOrCreateSolanaWallet({ userId, network: "mainnet", password });
      await getOrCreateSolanaWallet({ userId, network: "devnet", password });
      
      // Create smart account
      const { account } = await createNexSmartAccount({
        owner: signer as UntypedJson as Account,
        chainId: activeChainId,
      });
      persistSmartAccountAddress(userId, activeChainId, account.address as Address);
      
      setEvmSigner(signer);
      setEvmAccount(account);
      setWalletStatus("unlocked");
      
      // Refresh state
      await refetch();
    } catch (err) {
      setWalletStatus("error");
      throw err;
    }
  }, [userId, activeChainId, refetch, persistSmartAccountAddress, localOwnerEnabled]);
  
  // Unlock wallets
  const unlock = useCallback(async (password: string) => {
    if (!userId) {
      throw new Error("User not authenticated");
    }
    if (!localOwnerEnabled) {
      throw new Error("local_owner_disabled");
    }
    setWalletStatus("initializing");
    
    try {
      // Get EVM signer
      const signer = await getNexSigner({ userId, password });
      if (!signer) {
        setWalletStatus("error");
        throw new Error("Invalid password or wallet not found");
      }
      
      // Create smart account
      const { account } = await createNexSmartAccount({
        owner: signer as UntypedJson as Account,
        chainId: activeChainId,
      });
      persistSmartAccountAddress(userId, activeChainId, account.address as Address);
      
      setEvmSigner(signer);
      setEvmAccount(account);
      setWalletStatus("unlocked");
    } catch (err) {
      setWalletStatus("error");
      throw err;
    }
  }, [userId, activeChainId, persistSmartAccountAddress, localOwnerEnabled]);

  // Initialize with Passkey
  const initializeWithPasskey = useCallback(async () => {
    if (!userId) {
      throw new Error("User not authenticated");
    }
    setWalletStatus("initializing");
    try {
      if (localOwnerEnabled) {
        // Register new passkey locally (dev-only flow)
        const { account: signer } = await registerPasskey(userId);

        // We don't create Solana wallets for passkey users yet
        // (Solana doesn't support secp256r1 natively in the same way, requires different curve)

        // Create smart account
        const { account } = await createNexSmartAccount({
          owner: signer as UntypedJson as Account,
          chainId: activeChainId,
        });
        persistSmartAccountAddress(userId, activeChainId, account.address as Address);

        setEvmSigner(signer);
        setIsPasskeySigner(true);
        setEvmAccount(account);
        setWalletStatus("unlocked");

        await refetch();
        return;
      }

      // Production flow: register passkey server-side and trigger provisioning
      await registerWalletPasskey();
      setIsPasskeySigner(true);
      setEvmSigner(null);
      setEvmAccount(null);
      setWalletStatus("locked");
      await refetch();
    } catch (err) {
      setWalletStatus("error");
      throw err;
    }
  }, [userId, activeChainId, refetch, persistSmartAccountAddress, localOwnerEnabled]);

  // Login with Passkey
  const loginWithPasskey = useCallback(async () => {
    if (!userId) {
      throw new Error("User not authenticated");
    }
    setWalletStatus("initializing");
    try {
      if (localOwnerEnabled) {
        // Login with existing passkey (local flow)
        const signer = await loginPasskey();

        // Create smart account wrapper
        const { account } = await createNexSmartAccount({
          owner: signer as UntypedJson as Account,
          chainId: activeChainId,
        });
        persistSmartAccountAddress(userId, activeChainId, account.address as Address);

        setEvmSigner(signer);
        setIsPasskeySigner(true);
        setEvmAccount(account);
        setWalletStatus("unlocked");
        return;
      }

      // Server-backed passkey auth (no local signer)
      await authenticateWalletPasskey();
      setIsPasskeySigner(true);
      setEvmSigner(null);
      setEvmAccount(null);
      setWalletStatus("locked");
    } catch (err) {
      setWalletStatus("error");
      throw err;
    }
  }, [userId, activeChainId, persistSmartAccountAddress, localOwnerEnabled]);
  
  // Connect External Signer
  const connectExternalSigner = useCallback(async (signer: Account) => {
    if (!userId) {
      throw new Error("User not authenticated");
    }
    setWalletStatus("initializing");
    try {
      // Create smart account wrapper
      const { account } = await createNexSmartAccount({
        owner: signer as UntypedJson as Account,
        chainId: activeChainId,
      });
      persistSmartAccountAddress(userId, activeChainId, account.address as Address);
      
      setEvmSigner(signer);
      setIsPasskeySigner(false);
      setEvmAccount(account);
      setWalletStatus("unlocked");
      
      await refetch();
    } catch (err) {
      setWalletStatus("error");
      throw err;
    }
  }, [userId, activeChainId, persistSmartAccountAddress, refetch]);
  
  // Lock wallets
  const lock = useCallback(() => {
    setEvmSigner(null);
    setIsPasskeySigner(false);
    setEvmAccount(null);
    setWalletStatus("locked");
  }, []);
  
  // Switch chain
  const switchChain = useCallback(async (chainId: number) => {
    const config = getChainConfig(chainId);
    if (!config) {
      throw new Error(`Chain ${chainId} is not supported`);
    }
    
    setActiveChainId(chainId);
    
    // Recreate smart account for new chain if unlocked
    if (evmSigner) {
      const { account } = await createNexSmartAccount({
        owner: evmSigner as UntypedJson as Account,
        chainId,
      });
      setEvmAccount(account);
    }
  }, [evmSigner]);
  
  // Export EVM key
  const exportEvmKey = useCallback(async (password: string): Promise<string | null> => {
    if (!userId) return null;
    if (!localOwnerEnabled) {
      throw new Error("local_owner_disabled");
    }
    return exportNexSignerKey({ userId, password });
  }, [userId, localOwnerEnabled]);
  
  // Export Solana key
  const exportSolanaKey = useCallback(async (
    network: "mainnet" | "devnet",
    password: string
  ): Promise<string | null> => {
    if (!userId) return null;
    if (!localOwnerEnabled) {
      throw new Error("local_owner_disabled");
    }
    return exportSolanaPrivateKey({ userId, network, password });
  }, [userId, localOwnerEnabled]);
  
  // Refresh
  const refresh = useCallback(() => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["nex-smart-account"] });
  }, [refetch, queryClient]);

  // Clear sensitive in-memory state when user changes or component unmounts
  useEffect(() => {
    return () => {
      lock();
    };
  }, [lock]);

  useEffect(() => {
    lock();
    setCachedSmartAccountAddress(null);
  }, [userId, lock]);
  
  return {
    // State
    userId,
    status: walletStatus,
    isInitialized: !!walletState?.evmExists,
    isLoading: userId ? isLoading : false,
    error: error?.message ?? null,
    
    evm: {
      ownerAddress: walletState?.evmOwnerAddress ?? null,
      smartAccountAddress: smartAccountData?.address ?? null,
      chainId: activeChainId,
      isDeployed: smartAccountData?.isDeployed ?? false,
      account: evmAccount,
      signer: evmSigner,
      isPasskey: isPasskeySigner,
    },
    
    solana: {
      mainnet: {
        address: walletState?.solanaMainnetAddress ?? null,
        exists: walletState?.solanaMainnetExists ?? false,
      },
      devnet: {
        address: walletState?.solanaDevnetAddress ?? null,
        exists: walletState?.solanaDevnetExists ?? false,
      },
    },
    
    // Actions
    initialize,
    unlock,
    lock,
    switchChain,
    exportEvmKey,
    exportSolanaKey,
    refresh,
    initializeWithPasskey,
    loginWithPasskey,
    connectExternalSigner,
  };
}
