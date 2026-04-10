"use client";

/**
 * Wagmi Configuration
 *
 * Domain: Web3/Wallet
 * Responsibility: Configure Wagmi for EOA wallet connections (MetaMask, WalletConnect, etc.)
 * Dependencies: wagmi, @wagmi/core, @wagmi/connectors, viem
 */

import { http, createConfig, createStorage } from "wagmi";
import { injected, walletConnect, coinbaseWallet } from "@wagmi/connectors";
import { getSupportedChains } from "@/lib/chains";
import { CDP_EMBEDDED_ENABLED } from "@/lib/cdp/feature-flag";

// Polyfill indexedDB for SSR to prevent WalletConnect/Wagmi crashes
if (typeof window === "undefined" && typeof global.indexedDB === "undefined") {
  const indexedDbStub = {
    open: () => ({
      result: {
        objectStoreNames: { contains: () => false },
        createObjectStore: () => undefined,
        transaction: () => ({ objectStore: () => ({ get: () => ({ onsuccess: null }) }) }),
      },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  } as UntypedJson as IDBFactory;

  global.indexedDB = indexedDbStub;
}

// Get supported chains from existing chain configuration
const supportedChains = getSupportedChains();

// Type assertion for Wagmi's chain tuple requirement
type ChainTuple = readonly [typeof supportedChains[0], ...typeof supportedChains];
const chains = supportedChains as UntypedJson as ChainTuple;

// WalletConnect Project ID from environment
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";
const isTestMode =
  process.env.NEXT_PUBLIC_TEST_MODE === "true" ||
  process.env.E2E_TEST_MODE === "true";
const walletConnectEnabledByEnv =
  walletConnectProjectId.length > 0 &&
  !isTestMode &&
  process.env.NODE_ENV !== "development";
const multiInjectedDiscoveryRequested =
  (process.env.NEXT_PUBLIC_ENABLE_MULTI_INJECTED_DISCOVERY ?? "").trim().toLowerCase() === "true";
const coinbaseWalletConnectorEnv = (process.env.NEXT_PUBLIC_ENABLE_COINBASE_WALLET_CONNECTOR ?? "").trim().toLowerCase();

export function shouldEnableDedicatedCoinbaseWalletConnector(options?: {
  cdpEmbeddedEnabled?: boolean;
  envValue?: string;
}) {
  const envValue = options?.envValue ?? coinbaseWalletConnectorEnv;
  if (envValue === "true") return true;
  if (envValue === "false") return false;
  return !(options?.cdpEmbeddedEnabled ?? CDP_EMBEDDED_ENABLED);
}

export function shouldEnableMultiInjectedProviderDiscovery(options?: {
  requested?: boolean;
  cdpEmbeddedEnabled?: boolean;
}) {
  return Boolean(options?.requested ?? multiInjectedDiscoveryRequested) &&
    !(options?.cdpEmbeddedEnabled ?? CDP_EMBEDDED_ENABLED);
}

const dedicatedCoinbaseWalletConnectorEnabled =
  shouldEnableDedicatedCoinbaseWalletConnector();
const multiInjectedDiscoveryEnabled =
  shouldEnableMultiInjectedProviderDiscovery();

function resolveWalletConnectMetadataOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://nex-t1.ai"
  );
}

function resolveWalletConnectIconUrl(origin: string): string {
  try {
    return new URL("/logo/nexis-app-logo.svg", origin).toString();
  } catch {
    return "https://nex-t1.ai/logo/nexis-app-logo.svg";
  }
}

// App metadata for WalletConnect
const walletConnectMetadataOrigin = resolveWalletConnectMetadataOrigin();
const appMetadata = {
  name: "Nex-T1",
  description: "Nex-T1 AI Trading Platform",
  url: walletConnectMetadataOrigin,
  icons: [resolveWalletConnectIconUrl(walletConnectMetadataOrigin)],
};

type WagmiConnectorFactory =
  | ReturnType<typeof injected>
  | ReturnType<typeof walletConnect>
  | ReturnType<typeof coinbaseWallet>;

// Build RPC transports for each chain
const transports = Object.fromEntries(
  supportedChains.map((chain) => {
    const defaultRpc =
      chain.rpcUrls?.default?.http?.[0] ?? chain.rpcUrls?.public?.http?.[0];
    return [chain.id, http(defaultRpc)];
  })
) as Record<number, ReturnType<typeof http>>;

function createConnectors({
  includeWalletConnect = true,
}: {
  includeWalletConnect?: boolean;
}) {
  const connectorList: WagmiConnectorFactory[] = [
    // Injected wallet connector (MetaMask, Phantom EVM, Trust Wallet, etc.)
    injected({
      shimDisconnect: true,
      target: "metaMask",
    }),
    injected({
      shimDisconnect: true,
      // Generic injected for other wallets
    }),
  ];

  // WalletConnect for mobile/QR wallets (supports Ledger Live, TrustWallet mobile, etc.)
  if (includeWalletConnect && walletConnectEnabledByEnv) {
    try {
      connectorList.push(
        walletConnect({
          projectId: walletConnectProjectId,
          metadata: appMetadata,
          showQrModal: true,
        }),
      );
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[wagmi-config] WalletConnect connector init failed; continuing without WalletConnect.",
          error,
        );
      }
    }
  }

  if (dedicatedCoinbaseWalletConnectorEnabled) {
    connectorList.push(
      coinbaseWallet({
        appName: appMetadata.name,
        appLogoUrl: appMetadata.icons[0],
      }),
    );
  }

  return connectorList;
}

/**
 * Create Wagmi config
 * Uses noopStorage on server to prevent hydration mismatches
 */
export function createWagmiConfig() {
  const isBrowser = typeof window !== "undefined";
  const baseConfig = {
    chains,
    transports,
    ssr: true,
    storage: isBrowser
      ? createStorage({
          storage: window.localStorage,
          key: "nex-wagmi-state",
        })
      : undefined,
    // Prevent provider clashes from extension scripts redefining `window.ethereum`.
    multiInjectedProviderDiscovery: multiInjectedDiscoveryEnabled,
  } as const;

  try {
    return createConfig({
      ...baseConfig,
      connectors: createConnectors({ includeWalletConnect: true }),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[wagmi-config] Falling back to non-WalletConnect config after initialization failure.",
        error,
      );
    }

    return createConfig({
      ...baseConfig,
      connectors: createConnectors({ includeWalletConnect: false }),
    });
  }
}

// Singleton config instance
let wagmiConfigInstance: ReturnType<typeof createWagmiConfig> | null = null;

export function getWagmiConfig() {
  if (!wagmiConfigInstance) {
    wagmiConfigInstance = createWagmiConfig();
  }
  return wagmiConfigInstance;
}

// Export type for use in provider
export type WagmiConfigType = ReturnType<typeof createWagmiConfig>;

// Export connector identifiers for UI
export const WALLET_CONNECTORS = {
  METAMASK: "metaMask",
  INJECTED: "injected",
  WALLETCONNECT: "walletConnect",
  COINBASE: "coinbaseWallet",
  // Nex Wallet — auto-discovered via EIP-6963 when CDPReactProvider wraps WagmiProvider
  CDP_EMBEDDED: "cdp-embedded-wallet",
} as const;

// Wallet display metadata for UI
export const WALLET_METADATA = [
  {
    id: "metaMask",
    name: "MetaMask",
    icon: "/assets/wallet-logos/Metamask.svg",
    connector: WALLET_CONNECTORS.METAMASK,
  },
  {
    id: "phantom",
    name: "Phantom",
    icon: "/assets/wallet-logos/phantom.svg",
    connector: WALLET_CONNECTORS.INJECTED,
    rdns: "app.phantom",
  },
  {
    id: "trustwallet",
    name: "Trust Wallet",
    icon: "/assets/wallet-logos/TrustWallet.svg",
    connector: WALLET_CONNECTORS.INJECTED,
    rdns: "com.trustwallet.app",
  },
  {
    id: "safepal",
    name: "SafePal",
    icon: "/assets/wallet-logos/SafePal.svg",
    connector: WALLET_CONNECTORS.INJECTED,
    rdns: "io.safepal",
  },
  {
    id: "solflare",
    name: "Solflare",
    icon: "/assets/wallet-logos/Solflare.svg",
    connector: WALLET_CONNECTORS.INJECTED,
    rdns: "app.solflare",
  },
  {
    id: "backpack",
    name: "Backpack",
    icon: "/assets/wallet-logos/backpack.svg",
    connector: WALLET_CONNECTORS.INJECTED,
    rdns: "app.backpack",
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    icon: "/assets/wallet-logos/Coinbase.svg",
    connector: dedicatedCoinbaseWalletConnectorEnabled
      ? WALLET_CONNECTORS.COINBASE
      : WALLET_CONNECTORS.INJECTED,
  },
  {
    id: "ledger",
    name: "Ledger",
    icon: "/assets/wallet-logos/ledger.svg",
    connector: WALLET_CONNECTORS.WALLETCONNECT,
  },
  {
    id: "walletconnect",
    name: "WalletConnect",
    icon: "/assets/wallet-logos/WalletConnect.svg",
    connector: WALLET_CONNECTORS.WALLETCONNECT,
  },
] as const;

export type WalletMetadataItem = (typeof WALLET_METADATA)[number];
