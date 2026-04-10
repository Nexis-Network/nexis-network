import type { WalletTokenPosition } from "@/modules/wallets/profile";
import type {
  TokenAssetId,
  TokenAssetInfo,
  TokenPlatform,
} from "@/modules/tokens/types";
import { getChainInfo, NATIVE_TOKEN_ADDRESS } from "@/modules/tokens/chains";
import {
  buildTokenAssetId,
  normalizeTokenAddress,
} from "@/modules/tokens/utils/asset-id";

function resolveWalletTokenChainId(
  token: WalletTokenPosition,
  fallbackChainId: number,
): number {
  return typeof token.chainId === "number" && Number.isFinite(token.chainId)
    ? token.chainId
    : fallbackChainId;
}

function resolveWalletTokenPlatform(
  token: WalletTokenPosition,
  fallbackChainId: number,
): TokenPlatform {
  if (token.platform !== "default") {
    return token.platform;
  }

  const chainId = resolveWalletTokenChainId(token, fallbackChainId);
  return getChainInfo(chainId)?.platform ?? "evm";
}

function toWalletTokenAddress(token: WalletTokenPosition): string {
  if (token.isNative) {
    return NATIVE_TOKEN_ADDRESS;
  }

  return token.contract ?? token.id;
}

function toWalletTokenAssetId(
  token: WalletTokenPosition,
  fallbackChainId: number,
): TokenAssetId {
  const chainId = resolveWalletTokenChainId(token, fallbackChainId);
  const platform = resolveWalletTokenPlatform(token, fallbackChainId);
  return buildTokenAssetId({
    chainId,
    address: normalizeTokenAddress(chainId, toWalletTokenAddress(token), platform),
    platform,
  });
}

function createRegistryWalletToken(token: TokenAssetInfo): WalletTokenPosition {
  return {
    id: token.isNative ? token.assetId : token.address,
    contract: token.isNative ? null : token.address,
    platform: token.platform,
    name: token.name,
    symbol: token.symbol,
    decimals: token.decimals,
    balance: 0,
    uiAmount: 0,
    uiAmountString: "0",
    chainId: token.chainId,
    logoURI: token.logoURI ?? null,
    priceUsd: token.priceUSD ? Number(token.priceUSD) : 0,
    valueUsd: 0,
    change24hPercent: 0,
    isNative: token.isNative ?? false,
  };
}

function mergeWalletToken(
  token: WalletTokenPosition,
  registryToken: TokenAssetInfo | undefined,
  fallbackChainId: number,
): WalletTokenPosition {
  const chainId = resolveWalletTokenChainId(token, fallbackChainId);
  const platform = resolveWalletTokenPlatform(token, fallbackChainId);
  const address = registryToken?.isNative
    ? null
    : registryToken?.address ?? token.contract ?? null;

  return {
    ...token,
    id: registryToken?.isNative ? registryToken.assetId : registryToken?.address ?? token.id,
    contract: address,
    platform: registryToken?.platform ?? platform,
    name: registryToken?.name ?? token.name,
    symbol: registryToken?.symbol ?? token.symbol,
    decimals: registryToken?.decimals ?? token.decimals,
    chainId: registryToken?.chainId ?? chainId,
    logoURI: registryToken?.logoURI ?? token.logoURI,
    isNative: registryToken?.isNative ?? token.isNative,
  };
}

function sortWalletTokens(
  left: WalletTokenPosition,
  right: WalletTokenPosition,
  defaultAssetIds: Set<TokenAssetId>,
  fallbackChainId: number,
): number {
  const leftBalance = left.valueUsd ?? 0;
  const rightBalance = right.valueUsd ?? 0;

  if (leftBalance !== rightBalance) {
    return rightBalance - leftBalance;
  }

  const leftHasBalance = (left.balance ?? 0) > 0;
  const rightHasBalance = (right.balance ?? 0) > 0;
  if (leftHasBalance !== rightHasBalance) {
    return leftHasBalance ? -1 : 1;
  }

  const leftIsDefault = defaultAssetIds.has(toWalletTokenAssetId(left, fallbackChainId));
  const rightIsDefault = defaultAssetIds.has(toWalletTokenAssetId(right, fallbackChainId));
  if (leftIsDefault !== rightIsDefault) {
    return leftIsDefault ? -1 : 1;
  }

  return (left.symbol ?? "").localeCompare(right.symbol ?? "");
}

export function buildWalletDisplayTokens(input: {
  commonBaseIds: TokenAssetId[];
  currentTokens: WalletTokenPosition[];
  fallbackChainId: number;
  registryTokens: TokenAssetInfo[];
}): WalletTokenPosition[] {
  const defaultAssetIds = new Set(input.commonBaseIds);
  const registryById = new Map(input.registryTokens.map((token) => [token.assetId, token]));
  const merged = new Map<TokenAssetId, WalletTokenPosition>();

  for (const token of input.currentTokens) {
    const assetId = toWalletTokenAssetId(token, input.fallbackChainId);
    merged.set(
      assetId,
      mergeWalletToken(token, registryById.get(assetId), input.fallbackChainId),
    );
  }

  for (const assetId of input.commonBaseIds) {
    const token = registryById.get(assetId);
    if (token && !merged.has(assetId)) {
      merged.set(assetId, createRegistryWalletToken(token));
    }
  }

  return Array.from(merged.values()).sort((left, right) =>
    sortWalletTokens(left, right, defaultAssetIds, input.fallbackChainId),
  );
}
