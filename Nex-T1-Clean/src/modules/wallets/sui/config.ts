import { createNetworkConfig } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";

type NetworkName = "mainnet" | "testnet" | "devnet";

const NETWORK_FALLBACKS: Record<NetworkName, string> = {
  mainnet: getFullnodeUrl("mainnet"),
  testnet: getFullnodeUrl("testnet"),
  devnet: getFullnodeUrl("devnet"),
};

function resolveRpcUrl(name: NetworkName, envKey: string) {
  const override = process.env[envKey]?.trim();
  return override && override.length > 0 ? override : NETWORK_FALLBACKS[name];
}

const SUI_NETWORK_CONFIG = {
  mainnet: { url: resolveRpcUrl("mainnet", "NEXT_PUBLIC_SUI_MAINNET_RPC_URL") },
  testnet: { url: resolveRpcUrl("testnet", "NEXT_PUBLIC_SUI_TESTNET_RPC_URL") },
  devnet: { url: resolveRpcUrl("devnet", "NEXT_PUBLIC_SUI_DEVNET_RPC_URL") },
} as const;

export type SuiNetworkName = keyof typeof SUI_NETWORK_CONFIG;

export const SUI_SUPPORTED_NETWORKS = Object.freeze(Object.keys(SUI_NETWORK_CONFIG) as SuiNetworkName[]);

const ENV_DEFAULT_NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK?.trim().toLowerCase();

export const SUI_DEFAULT_NETWORK: SuiNetworkName = (SUI_SUPPORTED_NETWORKS.includes(
  ENV_DEFAULT_NETWORK as SuiNetworkName,
)
  ? (ENV_DEFAULT_NETWORK as SuiNetworkName)
  : "mainnet");

const {
  networkConfig: suiNetworkConfig,
  useNetworkConfig: useSuiNetworkConfig,
  useNetworkVariable: useSuiNetworkVariable,
  useNetworkVariables: useSuiNetworkVariables,
} = createNetworkConfig(SUI_NETWORK_CONFIG);

const SUI_EXPLORER_BASE_URL: Record<SuiNetworkName, string> = {
  mainnet: "https://www.suiscan.xyz",
  testnet: "https://www.suiscan.xyz/testnet",
  devnet: "https://www.suiscan.xyz/devnet",
};

function resolveExplorerBase(network: SuiNetworkName) {
  return (SUI_EXPLORER_BASE_URL[network] ?? SUI_EXPLORER_BASE_URL.mainnet).replace(/\/$/, "");
}

export function getSuiExplorerAccountUrl(address: string, network: SuiNetworkName = SUI_DEFAULT_NETWORK): string {
  return `${resolveExplorerBase(network)}/account/${address}`;
}

export function getSuiExplorerTransactionUrl(digest: string, network: SuiNetworkName = SUI_DEFAULT_NETWORK): string {
  return `${resolveExplorerBase(network)}/txblock/${digest}`;
}

export { suiNetworkConfig, useSuiNetworkConfig, useSuiNetworkVariable, useSuiNetworkVariables };
