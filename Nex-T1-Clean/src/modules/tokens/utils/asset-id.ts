import {
  EVM_NATIVE_PROVIDER_ADDRESS,
  getChainInfo,
  NATIVE_TOKEN_ADDRESS,
  SOLANA_CHAIN_ID,
} from "@/modules/tokens/chains";
import type { TokenAsset, TokenAssetId, TokenPlatform } from "@/modules/tokens/types";

const WRAPPED_NATIVE_BY_CHAIN: Record<number, Omit<TokenAsset, "assetId">> = {
  1: { chainId: 1, address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", platform: "evm", standard: "ERC20", symbol: "WETH", name: "Wrapped Ether", decimals: 18, isWrappedNative: true },
  10: { chainId: 10, address: "0x4200000000000000000000000000000000000006", platform: "evm", standard: "ERC20", symbol: "WETH", name: "Wrapped Ether", decimals: 18, isWrappedNative: true },
  56: { chainId: 56, address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", platform: "evm", standard: "ERC20", symbol: "WBNB", name: "Wrapped BNB", decimals: 18, isWrappedNative: true },
  137: { chainId: 137, address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", platform: "evm", standard: "ERC20", symbol: "WPOL", name: "Wrapped POL", decimals: 18, isWrappedNative: true },
  8453: { chainId: 8453, address: "0x4200000000000000000000000000000000000006", platform: "evm", standard: "ERC20", symbol: "WETH", name: "Wrapped Ether", decimals: 18, isWrappedNative: true },
  42161: { chainId: 42161, address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", platform: "evm", standard: "ERC20", symbol: "WETH", name: "Wrapped Ether", decimals: 18, isWrappedNative: true },
  43114: { chainId: 43114, address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", platform: "evm", standard: "ERC20", symbol: "WAVAX", name: "Wrapped AVAX", decimals: 18, isWrappedNative: true },
  [SOLANA_CHAIN_ID]: { chainId: SOLANA_CHAIN_ID, address: "So11111111111111111111111111111111111111112", platform: "solana", standard: "SPL", symbol: "WSOL", name: "Wrapped SOL", decimals: 9, isWrappedNative: true },
};

function resolvePlatform(chainId: number, platform?: TokenPlatform): TokenPlatform {
  return platform ?? getChainInfo(chainId)?.platform ?? "evm";
}

export function normalizeTokenAddress(
  chainId: number,
  address: string,
  platform?: TokenPlatform,
): string {
  const resolvedPlatform = resolvePlatform(chainId, platform);
  const normalized = address.trim();

  if (!normalized) {
    return NATIVE_TOKEN_ADDRESS;
  }

  if (
    normalized.toLowerCase() === EVM_NATIVE_PROVIDER_ADDRESS ||
    normalized.toLowerCase() === NATIVE_TOKEN_ADDRESS
  ) {
    return NATIVE_TOKEN_ADDRESS;
  }

  return resolvedPlatform === "evm" ? normalized.toLowerCase() : normalized;
}

export function buildTokenAssetId(input: {
  chainId: number;
  address: string;
  platform?: TokenPlatform;
}): TokenAssetId {
  const normalizedAddress = normalizeTokenAddress(
    input.chainId,
    input.address,
    input.platform,
  );
  return `${input.chainId}-${normalizedAddress}`;
}

export function parseTokenAssetId(assetId: string): { chainId: number; address: string } {
  const [rawChainId, ...addressParts] = assetId.split("-");
  return {
    chainId: Number(rawChainId),
    address: addressParts.join("-"),
  };
}

export function isNativeToken(input: Pick<TokenAsset, "address"> | string): boolean {
  const address = typeof input === "string" ? input : input.address;
  return address.toLowerCase() === NATIVE_TOKEN_ADDRESS;
}

export function getNativeAssetForChain(chainId: number): TokenAsset {
  const chain = getChainInfo(chainId);
  if (!chain) {
    throw new Error(`Unsupported chain id: ${chainId}`);
  }

  return {
    assetId: buildTokenAssetId({ chainId, address: NATIVE_TOKEN_ADDRESS, platform: chain.platform }),
    chainId,
    address: NATIVE_TOKEN_ADDRESS,
    platform: chain.platform,
    standard: "NATIVE",
    symbol: chain.nativeSymbol,
    name: chain.name,
    decimals: chainId === SOLANA_CHAIN_ID ? 9 : 18,
    isNative: true,
  };
}

export function getWrappedNativeAssetForChain(chainId: number): TokenAsset | null {
  const wrapped = WRAPPED_NATIVE_BY_CHAIN[chainId];
  if (!wrapped) {
    return null;
  }

  return {
    ...wrapped,
    address: normalizeTokenAddress(chainId, wrapped.address, wrapped.platform),
    assetId: buildTokenAssetId({
      chainId,
      address: wrapped.address,
      platform: wrapped.platform,
    }),
  };
}

export function sameTokenAsset(
  left: { chainId: number; address: string },
  right: { chainId: number; address: string },
): boolean {
  return buildTokenAssetId(left) === buildTokenAssetId(right);
}

export function toProviderTokenAddress(asset: {
  chainId: number;
  address: string;
  platform?: TokenPlatform;
}): string {
  const platform = resolvePlatform(asset.chainId, asset.platform);
  if (!isNativeToken(asset.address)) {
    return normalizeTokenAddress(asset.chainId, asset.address, platform);
  }

  return platform === "evm" ? EVM_NATIVE_PROVIDER_ADDRESS : NATIVE_TOKEN_ADDRESS;
}
