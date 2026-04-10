import { getPrimaryIcon } from "@/lib/token-icons";
import type { TokenAssetInfo, TokenRegistryEntry } from "@/modules/tokens/types";
import { getChainInfo } from "@/modules/tokens/chains";
import { buildTokenAssetId } from "@/modules/tokens/utils/asset-id";

function getDefaultSafetyStatus(entry: TokenRegistryEntry): TokenAssetInfo["safetyStatus"] {
  if (entry.supportStatus === "banned") {
    return "blocked";
  }

  return entry.supportStatus && entry.supportStatus !== "supported"
    ? "unknown"
    : "default";
}

export function buildTokenAssetInfo(entry: TokenRegistryEntry): TokenAssetInfo {
  const chain = getChainInfo(entry.chainId);
  if (!chain) {
    throw new Error(`Unsupported token chain: ${entry.chainId}`);
  }

  const platform = entry.platform ?? chain.platform;
  const supportStatus = entry.supportStatus ?? "supported";
  const safetyStatus = entry.safetyStatus ?? getDefaultSafetyStatus(entry);
  const isNative = entry.address.toLowerCase() === "native";
  const isWrappedNative = Boolean(chain.wrappedNativeSymbol && entry.symbol === chain.wrappedNativeSymbol);
  const logoURI = isNative
    ? chain.logoURI
    : getPrimaryIcon({
        symbol: entry.symbol,
        name: entry.name,
        iconOverride: entry.logoURI,
        kind: "token",
      });

  return {
    assetId: buildTokenAssetId({
      chainId: entry.chainId,
      address: entry.address,
      platform,
    }),
    chainId: entry.chainId,
    address: isNative ? "native" : buildTokenAssetInfoAddress(entry.address, platform),
    platform,
    standard: isNative
      ? "NATIVE"
      : entry.standard ?? (platform === "solana" ? "SPL" : "ERC20"),
    symbol: entry.symbol,
    name: entry.name,
    decimals: entry.decimals,
    isNative,
    isWrappedNative,
    chain,
    logoURI,
    supportStatus,
    safetyStatus,
    priceUSD: entry.priceUSD,
    liquidityPairs: entry.liquidityPairs ?? [],
    sources: entry.sources,
    tags: entry.tags ?? [],
    isVerified: supportStatus === "supported" && safetyStatus === "default",
    isCustom: entry.sources.includes("custom"),
  };
}

function buildTokenAssetInfoAddress(address: string, platform: TokenAssetInfo["platform"]): string {
  return platform === "evm" ? address.toLowerCase() : address;
}

export function enrichTokenRegistry(entries: TokenRegistryEntry[]): TokenAssetInfo[] {
  return entries.map(buildTokenAssetInfo);
}
