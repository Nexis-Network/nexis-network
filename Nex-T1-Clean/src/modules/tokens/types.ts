export type TokenPlatform = "evm" | "solana";
export type TokenStandard = "ERC20" | "SPL" | "NATIVE";
export type TokenAssetId = `${number}-${string}`;
export type TokenSupportStatus = "supported" | "unsupported" | "broken" | "banned";
export type TokenSafetyStatus = "default" | "non_default" | "blocked" | "unknown";
export type TokenSource = "registry" | "external" | "custom" | "imported";
export type TokenWarningSeverity = "low" | "medium" | "high";

export interface ChainGasConfig {
  marginBps: number;
  supportsEip1559: boolean;
  maxPriorityFeeGwei?: number;
  maxFeeGwei?: number;
}

export interface GasWarningThresholds {
  mediumUsd: number;
  highUsd: number;
}

export interface ChainAssetInfo {
  chainId: number;
  slug: string;
  name: string;
  platform: TokenPlatform;
  logoURI?: string;
  explorerBaseUrl: string;
  averageBlockTimeMs: number;
  pollingIntervalMs: number;
  nativeSymbol: string;
  wrappedNativeSymbol?: string;
  aliases: string[];
  gasConfig: ChainGasConfig;
  gasWarningThresholds: GasWarningThresholds;
}

export interface LiquidityPairReference {
  chainId: number;
  quoteAssetId?: TokenAssetId;
  pairAddress?: string;
  label?: string;
  source?: TokenSource;
}

export interface TokenAsset {
  assetId: TokenAssetId;
  chainId: number;
  address: string;
  platform: TokenPlatform;
  standard: TokenStandard;
  symbol: string;
  name: string;
  decimals: number;
  isNative?: boolean;
  isWrappedNative?: boolean;
}

export interface TokenAssetInfo extends TokenAsset {
  chain: ChainAssetInfo;
  logoURI?: string;
  supportStatus: TokenSupportStatus;
  safetyStatus: TokenSafetyStatus;
  priceUSD?: string;
  liquidityPairs: LiquidityPairReference[];
  sources: TokenSource[];
  tags: string[];
  isVerified: boolean;
  isCustom: boolean;
}

export interface TokenRegistryEntry {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  platform?: TokenPlatform;
  standard?: TokenStandard;
  logoURI?: string;
  priceUSD?: string;
  supportStatus?: TokenSupportStatus;
  safetyStatus?: TokenSafetyStatus;
  sources: TokenSource[];
  tags?: string[];
  keywords?: string[];
  liquidityPairs?: LiquidityPairReference[];
}

export interface TokenRegistryQuery {
  chainId?: number;
  search?: string;
  includeUnsupported?: boolean;
  includeBroken?: boolean;
  includeBanned?: boolean;
  includeCustom?: boolean;
}

export interface DefaultSwapPair {
  chainId: number;
  sellAssetId: TokenAssetId;
  buyAssetId: TokenAssetId;
  source: TokenSource;
}

export interface ResolvedDefaultSwapPair {
  pair: DefaultSwapPair;
  sellAsset: TokenAssetInfo;
  buyAsset: TokenAssetInfo;
}

export interface TokenWarning {
  code: string;
  severity: TokenWarningSeverity;
  message: string;
  blocking: boolean;
}

export interface TokenRegistrySnapshot {
  version: string;
  tokens: TokenAssetInfo[];
  chains: ChainAssetInfo[];
  commonBases: Record<string, TokenAssetId[]>;
  defaultPairs: DefaultSwapPair[];
}

export interface CustomTokenRecord {
  chainId: number | string;
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUrl?: string | null;
}
