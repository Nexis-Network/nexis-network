import { describe, expect, it } from "vitest";

import {
  buildTokenAssetId,
  getNativeAssetForChain,
  getWrappedNativeAssetForChain,
  isNativeToken,
  normalizeTokenAddress,
  parseTokenAssetId,
  sameTokenAsset,
  toProviderTokenAddress,
} from "@/modules/tokens/utils/asset-id";

describe("token asset identity", () => {
  it("normalizes evm addresses to lowercase ids", () => {
    const assetId = buildTokenAssetId({
      chainId: 1,
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      platform: "evm",
    });

    expect(assetId).toBe("1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
    expect(normalizeTokenAddress(1, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")).toBe(
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    );
  });

  it("keeps solana mints case-sensitive while preserving canonical ids", () => {
    const mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const assetId = buildTokenAssetId({
      chainId: 999999,
      address: mint,
      platform: "solana",
    });

    expect(assetId).toBe(`999999-${mint}`);
    expect(parseTokenAssetId(assetId)).toEqual({
      chainId: 999999,
      address: mint,
    });
  });

  it("uses a native sentinel internally and translates to provider address only at boundaries", () => {
    const eth = getNativeAssetForChain(1);
    const sol = getNativeAssetForChain(999999);

    expect(eth.address).toBe("native");
    expect(sol.address).toBe("native");
    expect(isNativeToken(eth)).toBe(true);
    expect(toProviderTokenAddress(eth)).toBe("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
    expect(toProviderTokenAddress(sol)).toBe("native");
  });

  it("resolves wrapped-native assets from chain metadata", () => {
    expect(getWrappedNativeAssetForChain(1)?.address).toBe(
      "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    );
    expect(getWrappedNativeAssetForChain(999999)?.address).toBe(
      "So11111111111111111111111111111111111111112",
    );
  });

  it("compares tokens by canonical asset identity", () => {
    expect(
      sameTokenAsset(
        { chainId: 1, address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
        { chainId: 1, address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" },
      ),
    ).toBe(true);
  });
});
