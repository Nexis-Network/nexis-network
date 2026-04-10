import { describe, expect, it, vi } from "vitest";

import { getChainInfo } from "@/modules/tokens/chains";
import { buildTokenAssetInfo } from "@/modules/tokens/server/metadata-enrichment-service";
import { resolveTokenByAddressUncached } from "@/modules/tokens/server/token-resolve-service";

function createSnapshotToken() {
  return buildTokenAssetInfo({
    chainId: 1,
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    sources: ["registry"],
  });
}

describe("token resolve service", () => {
  it("returns exact registry matches before external resolution", async () => {
    const token = createSnapshotToken();
    const resolveExternal = vi.fn().mockResolvedValue(null);

    const resolved = await resolveTokenByAddressUncached(
      { chainId: 1, address: token.address },
      {
        getSnapshot: async () => ({
          version: "test",
          tokens: [token],
          chains: getChainInfo(1) ? [getChainInfo(1)!] : [],
          commonBases: {},
          defaultPairs: [],
        }),
        resolveExternal,
      },
    );

    expect(resolved?.assetId).toBe(token.assetId);
    expect(resolveExternal).not.toHaveBeenCalled();
  });

  it("builds unsupported imported tokens from external metadata when not curated", async () => {
    const resolved = await resolveTokenByAddressUncached(
      { chainId: 8453, address: "0x1234000000000000000000000000000000000000" },
      {
        getSnapshot: async () => ({
          version: "test",
          tokens: [],
          chains: getChainInfo(8453) ? [getChainInfo(8453)!] : [],
          commonBases: {},
          defaultPairs: [],
        }),
        resolveExternal: async () => ({
          name: "Imported Token",
          symbol: "IMPT",
          decimals: 18,
          logoURI: "https://example.com/impt.png",
        }),
      },
    );

    expect(resolved?.symbol).toBe("IMPT");
    expect(resolved?.supportStatus).toBe("unsupported");
    expect(resolved?.safetyStatus).toBe("non_default");
    expect(resolved?.sources).toEqual(["external", "imported"]);
  });

  it("returns null when no registry or external metadata exists", async () => {
    const resolved = await resolveTokenByAddressUncached(
      { chainId: 8453, address: "0x1234000000000000000000000000000000000000" },
      {
        getSnapshot: async () => ({
          version: "test",
          tokens: [],
          chains: getChainInfo(8453) ? [getChainInfo(8453)!] : [],
          commonBases: {},
          defaultPairs: [],
        }),
        resolveExternal: async () => null,
      },
    );

    expect(resolved).toBeNull();
  });

  it("rejects invalid addresses for the target chain", async () => {
    await expect(
      resolveTokenByAddressUncached(
        { chainId: 1, address: "not-an-address" },
        {
          getSnapshot: async () => ({
            version: "test",
            tokens: [],
            chains: [],
            commonBases: {},
            defaultPairs: [],
          }),
          resolveExternal: async () => null,
        },
      ),
    ).rejects.toMatchObject({
      code: "invalid_address",
    });
  });
});
