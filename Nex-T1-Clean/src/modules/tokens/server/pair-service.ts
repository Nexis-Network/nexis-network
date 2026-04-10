import { COMMON_BASES_BY_CHAIN, DEFAULT_SWAP_PAIRS_BY_CHAIN } from "@/modules/tokens/registry/common-bases";
import type {
  DefaultSwapPair,
  ResolvedDefaultSwapPair,
  TokenAssetId,
  TokenAssetInfo,
} from "@/modules/tokens/types";

export function getCommonBaseAssetIds(chainId: number): TokenAssetId[] {
  return COMMON_BASES_BY_CHAIN[chainId] ?? [];
}

export function getDefaultSwapPair(chainId: number): DefaultSwapPair | null {
  return DEFAULT_SWAP_PAIRS_BY_CHAIN.find((pair) => pair.chainId === chainId) ?? null;
}

export function resolveDefaultSwapPair(
  tokens: TokenAssetInfo[],
  chainId: number,
): ResolvedDefaultSwapPair | null {
  const pair = getDefaultSwapPair(chainId);
  if (!pair) {
    return null;
  }

  const sellAsset = tokens.find((token) => token.assetId === pair.sellAssetId);
  const buyAsset = tokens.find((token) => token.assetId === pair.buyAssetId);

  if (!sellAsset || !buyAsset) {
    return null;
  }

  return { pair, sellAsset, buyAsset };
}
