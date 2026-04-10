import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getDefaultCdpEvmCapability,
  getNetworkCapabilities,
  getNztRollupCapability,
  resolveExplorerAddressUrlForChain,
} from "./capabilities";

describe("network capabilities", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns Base as the default CDP EVM capability", () => {
    expect(getDefaultCdpEvmCapability()).toMatchObject({
      chainId: 8453,
      networkKey: "base-mainnet",
      identityProvider: "cdp",
      executionProvider: "cdp",
      cdpSignAndSend: true,
      cdpUserOp: true,
      cdpSwap: true,
      gasSponsorship: false,
      nativeSymbol: "ETH",
    });
  });

  it("includes BNB Chain as a smart-account network without enabling unsupported sign-and-send", () => {
    expect(getNetworkCapabilities()).toContainEqual(
      expect.objectContaining({
        chainId: 56,
        networkKey: "bnb-mainnet",
        cdpNetwork: "bnb",
        cdpUserOp: true,
        cdpSignAndSend: false,
        cdpSwap: false,
        nativeSymbol: "BNB",
      }),
    );

    expect(
      resolveExplorerAddressUrlForChain(
        56,
        "0x1111111111111111111111111111111111111111",
      ),
    ).toBe(
      "https://bscscan.com/address/0x1111111111111111111111111111111111111111",
    );
  });

  it("adds the NZT rollup capability when the rollup env is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_NZT_CHAIN_ID", "43210");
    vi.stubEnv("NEXT_PUBLIC_NZT_RPC_URL", "https://rpc.nzt.example");
    vi.stubEnv("NEXT_PUBLIC_NZT_EXPLORER_URL", "https://explorer.nzt.example");
    vi.stubEnv("NEXT_PUBLIC_NZT_BRIDGE_URL", "https://bridge.nzt.example");
    vi.stubEnv("NEXT_PUBLIC_NZT_SYMBOL", "NZT");
    vi.stubEnv("ALCHEMY_GAS_MANAGER_POLICY_ID", "policy-live");
    vi.stubEnv("ALCHEMY_ROLLUP_WEBHOOK_SIGNING_KEY", "secret-live");

    expect(getNztRollupCapability()).toMatchObject({
      chainId: 43210,
      networkKey: "nzt-rollup",
      identityProvider: "cdp",
      executionProvider: "nzt-rollup",
      cdpSignAndSend: false,
      cdpUserOp: false,
      cdpSwap: false,
      gasSponsorship: true,
      bridgeUrl: "https://bridge.nzt.example",
      explorerUrl: "https://explorer.nzt.example",
      nativeSymbol: "NZT",
      alchemyGasManager: true,
      alchemyWebhook: true,
      nativeGasToken: true,
      bridgeAvailable: true,
    });

    expect(getNetworkCapabilities().map((item) => item.networkKey)).toContain("nzt-rollup");
  });

  it("resolves explorer links for the configured NZT rollup", () => {
    vi.stubEnv("NEXT_PUBLIC_NZT_CHAIN_ID", "43210");
    vi.stubEnv("NEXT_PUBLIC_NZT_RPC_URL", "https://rpc.nzt.example");
    vi.stubEnv("NEXT_PUBLIC_NZT_EXPLORER_URL", "https://explorer.nzt.example");

    expect(
      resolveExplorerAddressUrlForChain(
        43210,
        "0x1111111111111111111111111111111111111111",
      ),
    ).toBe(
      "https://explorer.nzt.example/address/0x1111111111111111111111111111111111111111",
    );
  });
});
