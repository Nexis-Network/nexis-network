import { isAddress as isEvmAddress } from "viem";

export type ChainType = "evm" | "solana" | "sui";

export interface ChainConfig {
  id: string; // e.g., '1', 'solana'
  name: string; // e.g., 'Ethereum', 'Solana'
  type: ChainType;
  nativeSymbol: string;
  explorerUrl: string;
}

export abstract class ChainAdapter {
  protected config: ChainConfig;

  constructor(config: ChainConfig) {
    this.config = config;
  }

  get chainId() {
    return this.config.id;
  }

  get chainType() {
    return this.config.type;
  }

  get name() {
    return this.config.name;
  }

  abstract isValidAddress(address: string): boolean;
  abstract getExplorerAddressUrl(address: string): string;
  abstract getExplorerTxUrl(txHash: string): string;
  
  /**
   * Normalizes an address to the standard format for the chain.
   * e.g., Lowercase for EVM, Base58 for Solana.
   */
  abstract normalizeAddress(address: string): string | null;
}

export class EvmChainAdapter extends ChainAdapter {
  isValidAddress(address: string): boolean {
    return isEvmAddress(address);
  }

  getExplorerAddressUrl(address: string): string {
    return `${this.config.explorerUrl}/address/${address}`;
  }

  getExplorerTxUrl(txHash: string): string {
    return `${this.config.explorerUrl}/tx/${txHash}`;
  }

  normalizeAddress(address: string): string | null {
    return isEvmAddress(address) ? address.toLowerCase() : null;
  }
}

export class SolanaChainAdapter extends ChainAdapter {
  isValidAddress(address: string): boolean {
    // Basic regex for Base58, length 32-44 typical for Solana addresses
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  getExplorerAddressUrl(address: string): string {
    return `${this.config.explorerUrl}/account/${address}`;
  }

  getExplorerTxUrl(txHash: string): string {
    return `${this.config.explorerUrl}/tx/${txHash}`;
  }

  normalizeAddress(address: string): string | null {
    return this.isValidAddress(address) ? address : null;
  }
}

export class SuiChainAdapter extends ChainAdapter {
  isValidAddress(address: string): boolean {
    // Sui addresses are 32 bytes (64 hex chars) with 0x prefix.
    // Also support token type/module formats which include '::' separators
    // e.g. 0x...::module::TokenName
    return /^0x[a-fA-F0-9]{64}(::.+)?$/.test(address);
  }

  getExplorerAddressUrl(address: string): string {
    return `${this.config.explorerUrl}/address/${address}`;
  }

  getExplorerTxUrl(txHash: string): string {
    return `${this.config.explorerUrl}/tx/${txHash}`;
  }

  normalizeAddress(address: string): string | null {
    return this.isValidAddress(address) ? address : null;
  }
}

// Factory / Registry
export const SUPPORTED_CHAINS: Record<string, ChainAdapter> = {
  ethereum: new EvmChainAdapter({
    id: "1",
    name: "Ethereum",
    type: "evm",
    nativeSymbol: "ETH",
    explorerUrl: "https://etherscan.io",
  }),
  solana: new SolanaChainAdapter({
    id: "solana",
    name: "Solana",
    type: "solana",
    nativeSymbol: "SOL",
    explorerUrl: "https://solscan.io",
  }),
  arbitrum: new EvmChainAdapter({
    id: "42161",
    name: "Arbitrum One",
    type: "evm",
    nativeSymbol: "ETH",
    explorerUrl: "https://arbiscan.io",
  }),
  optimism: new EvmChainAdapter({
    id: "10",
    name: "Optimism",
    type: "evm",
    nativeSymbol: "ETH",
    explorerUrl: "https://optimistic.etherscan.io",
  }),
  base: new EvmChainAdapter({
    id: "8453",
    name: "Base",
    type: "evm",
    nativeSymbol: "ETH",
    explorerUrl: "https://basescan.org",
  }),
  polygon: new EvmChainAdapter({
    id: "137",
    name: "Polygon",
    type: "evm",
    nativeSymbol: "POL",
    explorerUrl: "https://polygonscan.com",
  }),
  bsc: new EvmChainAdapter({
    id: "56",
    name: "BNB Smart Chain",
    type: "evm",
    nativeSymbol: "BNB",
    explorerUrl: "https://bscscan.com",
  }),
  avalanche: new EvmChainAdapter({
    id: "43114",
    name: "Avalanche",
    type: "evm",
    nativeSymbol: "AVAX",
    explorerUrl: "https://snowtrace.io",
  }),
  zksync: new EvmChainAdapter({
    id: "324",
    name: "zkSync Era",
    type: "evm",
    nativeSymbol: "ETH",
    explorerUrl: "https://explorer.zksync.io",
  }),
  sui: new SuiChainAdapter({
    id: "sui",
    name: "Sui",
    type: "sui",
    nativeSymbol: "SUI",
    explorerUrl: "https://suiscan.xyz",
  }),
};

export function getChainAdapter(chainIdOrName: string): ChainAdapter | undefined {
  const key = chainIdOrName.toLowerCase();
  
  // Direct match
  if (SUPPORTED_CHAINS[key]) {
    return SUPPORTED_CHAINS[key];
  }

  // ID match
  return Object.values(SUPPORTED_CHAINS).find(
    (adapter) => adapter.chainId === chainIdOrName
  );
}
