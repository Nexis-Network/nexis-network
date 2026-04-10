import { NATIVE_TOKEN_ADDRESS } from "@/modules/tokens/chains";
import { getChainInfo } from "@/modules/tokens/chains";
import type {
  TokenAssetId,
  TokenAssetInfo,
  TokenRegistrySnapshot,
} from "@/modules/tokens/types";
import {
  buildTokenAssetId,
  isNativeToken,
  normalizeTokenAddress,
} from "@/modules/tokens/utils/asset-id";
import type {
  FetchedPortfolioToken,
  PortfolioTokenItem,
} from "@/modules/tokens/portfolio/types";

function toAssetId(chainId: number, address: string): TokenAssetId {
  return buildTokenAssetId({ chainId, address });
}

function createPortfolioTokenItem(
  token: TokenAssetInfo,
  flags?: { isCustom?: boolean; isDefault?: boolean },
): PortfolioTokenItem {
  return {
    asset: token,
    token_address: token.isNative ? NATIVE_TOKEN_ADDRESS : token.address,
    name: token.name,
    symbol: token.symbol,
    logo: token.logoURI,
    decimals: token.decimals,
    balance: "0",
    usd_price: token.priceUSD ? Number(token.priceUSD) : 0,
    usd_price_24hr_percent_change: 0,
    usd_value: 0,
    chainId: String(token.chainId),
    priceHistory: [0, 0],
    isDefault: flags?.isDefault,
    isCustom: flags?.isCustom ?? token.isCustom,
  };
}

function createFallbackAssetInfo(token: FetchedPortfolioToken): TokenAssetInfo {
  const chain = getChainInfo(token.chainId);
  if (!chain) {
    throw new Error(`Unsupported portfolio token chain: ${token.chainId}`);
  }

  const address = normalizeTokenAddress(token.chainId, token.token_address, chain.platform);
  const isNative = address === NATIVE_TOKEN_ADDRESS;

  return {
    assetId: buildTokenAssetId({ chainId: token.chainId, address, platform: chain.platform }),
    chainId: token.chainId,
    address,
    chain,
    decimals: token.decimals ?? (chain.platform === "solana" ? 9 : 18),
    isCustom: false,
    isNative,
    isVerified: false,
    liquidityPairs: [],
    logoURI: token.logo ?? token.thumbnail,
    name: token.name ?? token.token_address,
    platform: chain.platform,
    safetyStatus: "non_default",
    sources: ["external"],
    standard: isNative ? "NATIVE" : chain.platform === "solana" ? "SPL" : "ERC20",
    supportStatus: "unsupported",
    symbol: token.symbol ?? "UNKNOWN",
    tags: ["portfolio"],
  };
}

function createWalletPortfolioTokenItem(
  token: FetchedPortfolioToken,
  registryIndex: Map<TokenAssetId, TokenAssetInfo>,
  defaultAssetIds: Set<TokenAssetId>,
): PortfolioTokenItem {
  const assetId = toAssetId(token.chainId, token.token_address);
  const asset = registryIndex.get(assetId) ?? createFallbackAssetInfo(token);
  const balance = token.balance ?? "0";

  return {
    asset,
    token_address: isNativeToken(token.token_address) ? NATIVE_TOKEN_ADDRESS : token.token_address,
    name: token.name ?? asset.name ?? token.token_address,
    symbol: token.symbol ?? asset.symbol ?? "UNKNOWN",
    logo: token.logo ?? token.thumbnail ?? asset.logoURI,
    thumbnail: token.thumbnail,
    decimals: token.decimals ?? asset.decimals ?? 18,
    balance,
    usd_price: token.usd_price ?? 0,
    usd_price_24hr_percent_change: token.usd_price_24hr_percent_change ?? 0,
    usd_price_7d_percent_change: token.usd_price_7d_percent_change,
    usd_value: token.usd_value ?? 0,
    chainId: String(token.chainId),
    priceHistory: token.priceHistory ?? [],
    isDefault: defaultAssetIds.has(assetId),
    isCustom: asset.isCustom,
  };
}

function sortPortfolioTokens(left: PortfolioTokenItem, right: PortfolioTokenItem): number {
  const leftBalance = Number.parseFloat(left.balance) || 0;
  const rightBalance = Number.parseFloat(right.balance) || 0;

  if (leftBalance > 0 && rightBalance === 0) return -1;
  if (rightBalance > 0 && leftBalance === 0) return 1;
  if (left.usd_value !== right.usd_value) return right.usd_value - left.usd_value;
  return left.symbol.localeCompare(right.symbol);
}

export function getPortfolioDefaultAssetIds(
  snapshot: TokenRegistrySnapshot | null,
  chainId?: number,
): TokenAssetId[] {
  if (!snapshot) {
    return [];
  }

  if (chainId) {
    return snapshot.commonBases[String(chainId)] ?? [];
  }

  return Array.from(
    new Set(
      snapshot.defaultPairs.flatMap((pair) => [pair.sellAssetId, pair.buyAssetId]),
    ),
  );
}

export function buildPortfolioTokenItems(input: {
  defaultAssetIds: TokenAssetId[];
  fetchedTokens: FetchedPortfolioToken[];
  registryTokens: TokenAssetInfo[];
}): PortfolioTokenItem[] {
  const defaultAssetIds = new Set(input.defaultAssetIds);
  const registryIndex = new Map(input.registryTokens.map((token) => [token.assetId, token]));
  const merged = new Map<TokenAssetId, PortfolioTokenItem>();

  for (const token of input.fetchedTokens) {
    const item = createWalletPortfolioTokenItem(token, registryIndex, defaultAssetIds);
    merged.set(toAssetId(token.chainId, token.token_address), item);
  }

  for (const assetId of input.defaultAssetIds) {
    const token = registryIndex.get(assetId);
    if (token && !merged.has(assetId)) {
      merged.set(assetId, createPortfolioTokenItem(token, { isDefault: true }));
    }
  }

  for (const token of input.registryTokens) {
    if (token.isCustom && !merged.has(token.assetId)) {
      merged.set(token.assetId, createPortfolioTokenItem(token, { isCustom: true }));
    }
  }

  return Array.from(merged.values()).sort(sortPortfolioTokens);
}
