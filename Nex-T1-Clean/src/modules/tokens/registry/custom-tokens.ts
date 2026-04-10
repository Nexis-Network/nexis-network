import { getChainInfo, resolveChainId } from "@/modules/tokens/chains";
import type { CustomTokenRecord, TokenAssetInfo } from "@/modules/tokens/types";
import { buildTokenAssetId, normalizeTokenAddress } from "@/modules/tokens/utils/asset-id";

function createFallbackLabel(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function createCustomToken(
  chainId: number,
  address: string,
  name: string,
  symbol: string,
  decimals: number,
  logoURI?: string | null,
): TokenAssetInfo {
  const chain = getChainInfo(chainId);
  if (!chain) {
    throw new Error(`Unsupported custom token chain: ${chainId}`);
  }

  const normalizedAddress = normalizeTokenAddress(chainId, address, chain.platform);

  return {
    assetId: buildTokenAssetId({ chainId, address: normalizedAddress, platform: chain.platform }),
    chainId,
    address: normalizedAddress,
    platform: chain.platform,
    standard: chain.platform === "solana" ? "SPL" : "ERC20",
    symbol,
    name,
    decimals,
    chain,
    logoURI: logoURI ?? undefined,
    supportStatus: "supported",
    safetyStatus: "non_default",
    liquidityPairs: [],
    sources: ["custom"],
    tags: ["custom"],
    isVerified: false,
    isCustom: true,
  };
}

export function customTokenToAssetInfo(record: CustomTokenRecord): TokenAssetInfo {
  const chainId = resolveChainId(record.chainId);
  if (!chainId) {
    throw new Error(`Unsupported custom token chain id: ${record.chainId}`);
  }

  return createCustomToken(
    chainId,
    record.contractAddress,
    record.name,
    record.symbol.toUpperCase(),
    record.decimals,
    record.logoUrl,
  );
}

export function createManualImportedTokenAsset(
  chainId: number,
  address: string,
): TokenAssetInfo {
  const label = createFallbackLabel(address);
  return createCustomToken(chainId, address, `Imported ${label}`, "CUSTOM", 18);
}
