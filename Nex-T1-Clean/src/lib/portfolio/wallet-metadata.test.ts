import { describe, expect, it } from "vitest";

import {
  getWalletChainHint,
  getWalletMetadata,
  resolveWalletRequestChainId,
  resolveWalletStatus,
} from "@/lib/portfolio/wallet-metadata";

describe("wallet-metadata", () => {
  it("reads chain hints from JSON metadata", () => {
    const metadata = getWalletMetadata({
      metadata: {
        chainId: "eip155:8453",
      },
    });

    expect(getWalletChainHint(metadata)).toBe("eip155:8453");
  });

  it("resolves request chain ids from wallet metadata", () => {
    expect(
      resolveWalletRequestChainId({
        walletType: "external_connected",
        providerName: "Base",
        metadata: {
          chain_id: 10,
        },
      }),
    ).toBe(10);
  });

  it("derives status from metadata before fallback", () => {
    expect(
      resolveWalletStatus({
        status: "active",
        metadata: {
          status: "provisioning",
        },
      }),
    ).toBe("provisioning");
  });
});
