import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getSafeTargetChains } from "./chains";

const ORIGINAL_ENV = { ...process.env };

describe("getSafeTargetChains", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("honors TARGET_CHAIN_IDS allowlist", () => {
    process.env.TARGET_CHAIN_IDS = "1,8453";

    const chains = getSafeTargetChains();
    const chainIds = chains.map((chain) => chain.chainId);

    expect(chainIds).toEqual([1, 8453]);
  });

  it("throws when Monad chain is enabled without RPC", () => {
    process.env.TARGET_CHAIN_IDS = "9999";
    process.env.MONAD_CHAIN_ID = "9999";

    expect(() => getSafeTargetChains()).toThrow("MONAD_RPC_URL");
  });

  it("includes Hyperliquid EVM when configured", () => {
    process.env.TARGET_CHAIN_IDS = "999";
    process.env.HYPEREVM_CHAIN_ID = "999";
    process.env.HYPEREVM_RPC_URL = "https://rpc.hyperliquid.example/evm";

    const chains = getSafeTargetChains();
    expect(chains).toHaveLength(1);
    expect(chains[0]).toMatchObject({
      chainId: 999,
      label: "Hyperliquid EVM",
      rpcUrl: "https://rpc.hyperliquid.example/evm",
    });
  });

  it("includes Unichain when allowlisted", () => {
    process.env.TARGET_CHAIN_IDS = "130";
    process.env.UNICHAIN_RPC_URL = "https://rpc.unichain.example";

    const chains = getSafeTargetChains();
    expect(chains).toHaveLength(1);
    expect(chains[0]).toMatchObject({
      chainId: 130,
      label: "Unichain",
      rpcUrl: "https://rpc.unichain.example",
    });
  });
});
