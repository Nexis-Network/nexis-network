/**
 * Nex Wallet Module
 * 
 * Account Abstraction (ERC-4337) wallet infrastructure using:
 * - Viem for Ethereum interactions
 * - Safe Smart Accounts (ERC-4337) via permissionless.js
 * - Pimlico bundler for UserOperation submission
 * - User-paid gas (no paymaster)
 * - Session keys for agent delegation
 * 
 * @example
 * ```tsx
 * import { NexWalletProvider, useNexWallet } from "@/modules/wallets/nex";
 * 
 * function App() {
 *   return (
 *     <NexWalletProvider userId={user?.id}>
 *       <WalletComponent />
 *     </NexWalletProvider>
 *   );
 * }
 * 
 * function WalletComponent() {
 *   const { evm, solana, initialize, unlock } = useNexWallet();
 *   // Use wallet...
 * }
 * ```
 */

// Environment & Configuration
export {
  isNexAAEnabled,
  getPimlicoApiKey,
  getPimlicoBundlerUrl,
  getEntryPointVersion,
} from "./env";
export {
  SUPPORTED_MAINNET_CHAINS,
  SUPPORTED_TESTNET_CHAINS,
  ALL_SUPPORTED_CHAINS,
  getChainConfig,
  isChainSupported,
  getViemChain,
  getBundlerUrl,
  DEFAULT_CHAIN_ID,
  type NexChainConfig,
} from "./chains";

// Client Factory
export {
  createNexPublicClient,
  createNexBundlerClient,
  createNexSmartAccountClient,
  createNexChainClients,
  isPimlicoBundlerConfigured,
  clearClientCaches,
  type NexChainClients,
} from "./client-factory";

// Smart Account
export {
  createNexSmartAccount,
  getSmartAccountAddress,
  isSmartAccountDeployed,
  ENTRY_POINT_ADDRESSES,
  type CreateNexSmartAccountConfig,
  type NexSmartAccountResult,
} from "./safe-account";

// Signer (Client-side)
export {
  createNexSigner,
  getNexSigner,
  hasNexSigner,
  getNexSignerAddress,
  deleteNexSigner,
  exportNexSignerKey,
  importNexSigner,
  changeSignerPassword,
} from "./signer";

// Solana Wallet (Client-side)
export {
  getOrCreateSolanaWallet,
  hasSolanaWallet,
  getSolanaPublicKey,
  exportSolanaPrivateKey,
  importSolanaWallet,
  deleteSolanaWallet,
} from "./solana-wallet";

// Session Keys
export * from "./session-keys";

// React Hooks
export {
  useNexAccount,
  useNexBalance,
  useEvmChainBalance,
  useSolanaBalance,
  useSessionKeys,
  useHasAgentAccess,
  type NexAccountState,
  type NexAccountActions,
  type ChainBalance,
  type NexBalances,
} from "./hooks";

// Provider
export {
  NexWalletProvider,
  useNexWallet,
  useNexWalletOptional,
  type NexWalletProviderProps,
  type NexWalletContextValue,
} from "./provider";
