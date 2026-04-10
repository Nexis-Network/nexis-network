"use client";

/**
 * useConnectEoaWallet Hook
 *
 * Domain: Web3/Wallet
 * Responsibility: Connect and manage EOA wallets post-authentication
 * Dependencies: wagmi, zustand, existing wallet link API
 */

import { useCallback, useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
  type Connector,
} from "wagmi";
import { toast } from "sonner";
import { WALLET_METADATA, type WalletMetadataItem } from "@/lib/web3/wagmi-config";
import { useWallet } from "@solana/wallet-adapter-react";

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

type ConnectedWallet = {
  address: string;
  chainId: number;
  connector: string;
  displayName: string;
  icon?: string;
};

export type UseConnectEoaWalletReturn = {
  // Connection state
  isConnected: boolean;
  isEvmConnected: boolean;
  isSolanaConnected: boolean;
  isConnecting: boolean;
  connectionStatus: ConnectionStatus;
  error: string | null;

  // Connected wallet info
  address: string | undefined;
  chainId: number | undefined;
  connectedWallet: ConnectedWallet | null;

  // Available connectors
  connectors: readonly Connector[];
  walletOptions: WalletMetadataItem[];

  // Actions
  connect: (connectorId: string) => Promise<ConnectedWallet | null>;
  disconnect: () => Promise<void>;
  switchChain: (chainId: number) => Promise<void>;
  linkWallet: (override?: ConnectedWallet | null) => Promise<void>;

  // Reset state
  resetError: () => void;
};

/**
 * Hook for connecting EOA wallets after user authentication.
 *
 * This hook:
 * - Wraps Wagmi's useConnect/useDisconnect hooks
 * - Provides a simplified API for connecting wallets
 * - Stores connected wallets via the `/api/auth/wallet/link/store` endpoint
 * - Works with existing Supabase user_wallets table
 */
// Solana Chain ID constant (internal use)
const SOLANA_CHAIN_ID = 900001;

export function useConnectEoaWallet(): UseConnectEoaWalletReturn {
  const [error, setError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  // Wagmi hooks
  const { address: evmAddress, isConnected: isEvmConnected, connector: activeEvmConnector } = useAccount();
  const evmChainId = useChainId();
  const { connectors: rawEvmConnectors, connectAsync, isPending: isEvmConnecting } = useConnect();
  const { disconnectAsync: disconnectEvmAsync } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  // Solana hooks
  // Conditional usage to prevent errors if provider is missing (though AppProviders ensures it)
  // We import directly at top, but ensure we use it safely
  const { 
    wallet: solanaWallet, 
    disconnect: disconnectSolana, 
    connected: isSolanaConnected, 
    publicKey: solanaPublicKey,
    select: selectSolanaWallet,
    wallets: rawSolanaWallets
} = useWallet();
  const evmConnectors = useMemo(
    () => (Array.isArray(rawEvmConnectors) ? rawEvmConnectors : []),
    [rawEvmConnectors],
  );
  const solanaWallets = useMemo(
    () => (Array.isArray(rawSolanaWallets) ? rawSolanaWallets : []),
    [rawSolanaWallets],
  );

  // Unified State
  const isConnected = isEvmConnected || isSolanaConnected;
  const isConnecting = isEvmConnecting || isLinking || (solanaWallet?.adapter?.connecting ?? false);
  
  // Prioritize active connection.
  // If both connected (unlikely flow), prefer EVM if EVM connector acts recently? 
  // Simple logic: if EVM connected, show EVM. Else if Solana, show Solana.
  // Or maybe check which one is "active"?
  // For now, prioritizes EVM if both connected, but usually user connects one.
  // Actually, let's look at address availability.
  
  const address = isEvmConnected ? evmAddress : (isSolanaConnected ? solanaPublicKey?.toBase58() : undefined);
  const chainId = isEvmConnected ? evmChainId : (isSolanaConnected ? SOLANA_CHAIN_ID : undefined);

  // Derive connection status
  const connectionStatus: ConnectionStatus = useMemo(() => {
    if (error) return "error";
    if (isConnecting) return "connecting";
    if (isConnected) return "connected";
    return "idle";
  }, [isConnected, isConnecting, error]);

  // Map connected wallet to display format
  const connectedWallet: ConnectedWallet | null = useMemo(() => {
    if (isEvmConnected && evmAddress) {
        const connectorName = activeEvmConnector?.name ?? "Unknown";
        const metadata = WALLET_METADATA.find(
          (w) => w.name.toLowerCase() === connectorName.toLowerCase()
        );
        return {
          address: evmAddress,
          chainId: evmChainId ?? 1,
          connector: connectorName,
          displayName: metadata?.name ?? connectorName,
          icon: metadata?.icon,
        };
    }
    
    if (isSolanaConnected && solanaPublicKey) {
      const adapterName = solanaWallet?.adapter.name ?? "Solana Wallet";
      const metadata = WALLET_METADATA.find(
          (w) => w.name.toLowerCase() === adapterName.toLowerCase()
      );
      // Fallback icon for Solana
      const icon = metadata?.icon ?? "/assets/wallet-logos/phantom.svg";
      
      return {
          address: solanaPublicKey.toBase58(),
          chainId: SOLANA_CHAIN_ID,
          connector: adapterName,
          displayName: adapterName,
          icon: icon
      };
    }

    return null;
  }, [isEvmConnected, evmAddress, evmChainId, activeEvmConnector, isSolanaConnected, solanaPublicKey, solanaWallet]);

  // Filter wallet options based on available connectors
  const walletOptions = useMemo(() => {
    const evmConnectorIds = new Set(
      evmConnectors.map((connector) => connector.id.toLowerCase()),
    );
    const evmConnectorNames = new Set(
      evmConnectors.map((connector) => connector.name.toLowerCase()),
    );
    const solanaWalletNames = new Set(
      solanaWallets.map((wallet) => wallet.adapter.name.toLowerCase()),
    );

    return WALLET_METADATA.filter((wallet) => {
      const walletName = wallet.name.toLowerCase();
      const connectorKey = wallet.connector.toLowerCase();

      if (solanaWalletNames.has(walletName)) return true;
      if (evmConnectorIds.has(connectorKey)) return true;
      if (evmConnectorNames.has(walletName)) return true;

      return false;
    });
  }, [evmConnectors, solanaWallets]);

  // Connect to a wallet
  const connect = useCallback(
    async (connectorId: string): Promise<ConnectedWallet | null> => {
      setError(null);
      // Check for Solana Wallet Match
      // ConnectorId from UI might be "phantom", "solflare" (lowercase ids from metadata)
      const targetSolanaWallet = solanaWallets.find(
          w => w.adapter.name.toLowerCase() === connectorId.toLowerCase()
      );

      if (targetSolanaWallet) {
        try {
          selectSolanaWallet(targetSolanaWallet.adapter.name);
          await targetSolanaWallet.adapter.connect();
          const adapterName = targetSolanaWallet.adapter.name ?? "Solana Wallet";
          const metadata = WALLET_METADATA.find(
            (w) => w.name.toLowerCase() === adapterName.toLowerCase()
          );
          const icon = metadata?.icon ?? "/assets/wallet-logos/phantom.svg";
          const pubkey =
            targetSolanaWallet.adapter.publicKey?.toBase58() ??
            solanaPublicKey?.toBase58();
          if (!pubkey) {
            return null;
          }
          return {
            address: pubkey,
            chainId: SOLANA_CHAIN_ID,
            connector: adapterName,
            displayName: metadata?.name ?? adapterName,
            icon,
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to connect Solana wallet";
          setError(message);
          toast.error(message);
          throw err;
        }
      }

      // Fallback to EVM (Wagmi)
      try {
        // Find the connector
        const targetConnector = evmConnectors.find(
          (c) => c.id === connectorId || c.name.toLowerCase() === connectorId.toLowerCase()
        );

        if (!targetConnector) {
          // Try matching by wallet metadata
          const walletMeta = WALLET_METADATA.find((w) => w.id === connectorId);
          if (walletMeta) {
            const fallbackConnector = evmConnectors.find(
              (c) => c.id === walletMeta.connector || c.name.toLowerCase().includes(walletMeta.name.toLowerCase())
            );
            if (fallbackConnector) {
              const result = await connectAsync({ connector: fallbackConnector });
              const accounts = Array.isArray(result.accounts) ? result.accounts : [];
              const account = accounts[0] ?? evmAddress ?? null;
              if (!account) {
                return null;
              }
              const connectorName = fallbackConnector.name ?? "Wallet";
              const metadata = WALLET_METADATA.find(
                (w) => w.name.toLowerCase() === connectorName.toLowerCase()
              );
              return {
                address: account,
                chainId: result.chainId ?? evmChainId ?? 1,
                connector: fallbackConnector.id ?? connectorName,
                displayName: metadata?.name ?? connectorName,
                icon: metadata?.icon,
              };
            }
          }
          throw new Error(`Wallet connector "${connectorId}" not found. Please install the wallet extension.`);
        }

        const result = await connectAsync({ connector: targetConnector });
        const accounts = Array.isArray(result.accounts) ? result.accounts : [];
        const account = accounts[0] ?? evmAddress ?? null;
        if (!account) {
          return null;
        }
        const connectorName = targetConnector.name ?? "Wallet";
        const metadata = WALLET_METADATA.find(
          (w) => w.name.toLowerCase() === connectorName.toLowerCase()
        );
        return {
          address: account,
          chainId: result.chainId ?? evmChainId ?? 1,
          connector: targetConnector.id ?? connectorName,
          displayName: metadata?.name ?? connectorName,
          icon: metadata?.icon,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to connect wallet";
        setError(message);
        toast.error(message);
        throw err;
      }
    },
    [evmConnectors, connectAsync, solanaWallets, selectSolanaWallet, solanaPublicKey, evmAddress, evmChainId]
  );

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      if (isEvmConnected) await disconnectEvmAsync();
      if (isSolanaConnected) await disconnectSolana();
      
      setError(null);
      toast.success("Wallet disconnected");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to disconnect wallet";
      setError(message);
      toast.error(message);
    }
  }, [disconnectEvmAsync, disconnectSolana, isEvmConnected, isSolanaConnected]);

  // Switch chain
  const switchChain = useCallback(
    async (targetChainId: number) => {
      if (!isConnected || !isEvmConnected) {
          toast.error("Wallet not connected");
          return;
      }

      try {
        if (targetChainId === SOLANA_CHAIN_ID) {
            toast.info("Solana network active");
            return;
        }
        await switchChainAsync({ chainId: targetChainId });
        toast.success(`Switched to chain ${targetChainId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to switch chain";
        setError(message);
        toast.error(message);
        throw err;
      }
    },
    [switchChainAsync, isConnected, isEvmConnected]
  );

  // Link connected wallet to user account in Supabase
  const linkWallet = useCallback(async (override?: ConnectedWallet | null) => {
    const linkAddress = override?.address ?? address;
    const linkChainId = override?.chainId ?? chainId;
    const connectorName = override?.connector ?? connectedWallet?.connector ?? "unknown";
    const displayName = override?.displayName ?? connectedWallet?.displayName ?? "Connected Wallet";

    if (!linkAddress) {
      toast.error("No wallet connected");
      return;
    }
    // Skip if no chainId (shouldn't happen if connected)
    if (!linkChainId) return;

    setIsLinking(true);
    setError(null);

    const isSolana = linkChainId === SOLANA_CHAIN_ID;
    const chainType = isSolana ? "solana" : "evm";
    const walletType = isSolana ? "external_solana" : "external_evm";

    try {
      const response = await fetch("/api/auth/wallet/link/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          address: linkAddress,
          chain: chainType,
          wallet_type: walletType,
          chain_id: linkChainId,
          label: displayName,
          capabilities: {
            provider: connectorName,
            connection_method: "extension", // Simplification
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to link wallet");
      }

      toast.success("Wallet linked successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to link wallet";
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setIsLinking(false);
    }
  }, [address, chainId, connectedWallet]);

  // Reset error state
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Connection state
    isConnected,
    isEvmConnected,
    isSolanaConnected,
    isConnecting,
    connectionStatus,
    error,

    // Connected wallet info
    address,
    chainId,
    connectedWallet,

    // Available connectors
    connectors: evmConnectors, // Expose EVM connectors (Wagmi type). UI uses connect(id) anyway.
    walletOptions,

    // Actions
    connect,
    disconnect,
    switchChain,
    linkWallet,

    // Reset
    resetError,
  };
}
