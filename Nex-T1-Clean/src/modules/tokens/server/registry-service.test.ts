import { describe, expect, it } from "vitest";

import { resolveTokenWarnings } from "@/modules/tokens/utils/warnings";
import {
  getDefaultSwapPairForChain,
  getTokenRegistrySnapshot,
} from "@/modules/tokens/server/registry-service";

describe("token registry service", () => {
  it("returns curated supported tokens by default", async () => {
    const snapshot = await getTokenRegistrySnapshot({});
    const nativeEth = snapshot.tokens.find(
      (token) => token.chainId === 1 && token.address === "native",
    );

    expect(snapshot.tokens.length).toBeGreaterThan(0);
    expect(nativeEth?.supportStatus).toBe("supported");
    expect(nativeEth?.safetyStatus).toBe("default");
  });

  it("applies support overrides and hides blocked assets from default queries", async () => {
    const defaultSnapshot = await getTokenRegistrySnapshot({});
    const fullSnapshot = await getTokenRegistrySnapshot({
      includeUnsupported: true,
      includeBroken: true,
      includeBanned: true,
    });

    expect(
      defaultSnapshot.tokens.some((token) => token.supportStatus !== "supported"),
    ).toBe(false);
    expect(
      fullSnapshot.tokens.some((token) => token.supportStatus === "unsupported"),
    ).toBe(true);
    expect(fullSnapshot.tokens.some((token) => token.supportStatus === "broken")).toBe(
      true,
    );
    expect(fullSnapshot.tokens.some((token) => token.supportStatus === "banned")).toBe(
      true,
    );
  });

  it("resolves default swap pairs by chain", async () => {
    const pair = await getDefaultSwapPairForChain(1);

    expect(pair?.sellAsset.symbol).toBe("ETH");
    expect(pair?.buyAsset.symbol).toBe("USDC");
  });

  it("derives blocking warnings from support and safety state", async () => {
    const snapshot = await getTokenRegistrySnapshot({
      includeUnsupported: true,
      includeBroken: true,
      includeBanned: true,
    });
    const bannedToken = snapshot.tokens.find((token) => token.supportStatus === "banned");
    const brokenToken = snapshot.tokens.find((token) => token.supportStatus === "broken");
    const unsupportedToken = snapshot.tokens.find(
      (token) => token.supportStatus === "unsupported",
    );

    expect(resolveTokenWarnings(bannedToken ?? null)[0]?.blocking).toBe(true);
    expect(resolveTokenWarnings(brokenToken ?? null)[0]?.blocking).toBe(true);
    expect(resolveTokenWarnings(unsupportedToken ?? null)[0]?.blocking).toBe(false);
  });
});
