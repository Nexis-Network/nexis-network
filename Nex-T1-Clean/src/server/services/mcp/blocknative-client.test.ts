import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const lookupGasPriceMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/services/prices/gas-price", () => ({
  lookupGasPrice: (...args: unknown[]) => lookupGasPriceMock(...args),
}));

import { BlocknativeMcpClient } from "./blocknative-client";

describe("BlocknativeMcpClient", () => {
  beforeEach(() => {
    lookupGasPriceMock.mockReset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to RPC gas lookup when predict_gas_price MCP calls fail", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => "Application failed to respond",
    });
    vi.stubGlobal("fetch", fetchMock);
    lookupGasPriceMock.mockResolvedValue({
      chainId: 8453,
      gasPriceWei: "1000000000",
      fetchedAt: 1_777_777_777_000,
      cached: true,
      stale: true,
    });

    const client = new BlocknativeMcpClient({
      baseUrl: "https://blocknative.nex-t1.ai",
      maxRetries: 0,
      requestTimeoutMs: 100,
    });

    const result = await client.invokeRaw("predict_gas_price", { chainId: "8453" });

    expect(result.ok).toBe(true);
    expect(result.toolResult).toMatchObject({
      chainId: 8453,
      gasPriceWei: "1000000000",
      source: "rpc-fallback",
      cached: true,
      stale: true,
    });
    expect(result.text).toContain("Fallback gas price for chain 8453");
    expect(lookupGasPriceMock).toHaveBeenCalledWith(8453);
  });

  it("resolves named chains when predict_gas_price falls back to RPC gas lookup", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => "Application failed to respond",
    });
    vi.stubGlobal("fetch", fetchMock);
    lookupGasPriceMock.mockResolvedValue({
      chainId: 42161,
      gasPriceWei: "2000000000",
      fetchedAt: 1_777_777_777_000,
      cached: false,
      stale: false,
    });

    const client = new BlocknativeMcpClient({
      baseUrl: "https://blocknative.nex-t1.ai",
      maxRetries: 0,
      requestTimeoutMs: 100,
    });

    const result = await client.invokeRaw("predict_gas_price", {
      chain: "arbitrum",
    });

    expect(result.ok).toBe(true);
    expect(result.toolResult).toMatchObject({
      chainId: 42161,
      gasPriceWei: "2000000000",
      source: "rpc-fallback",
      cached: false,
      stale: false,
    });
    expect(lookupGasPriceMock).toHaveBeenCalledWith(42161);
  });

  it("rethrows MCP failures for commands without a local fallback", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => "Application failed to respond",
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new BlocknativeMcpClient({
      baseUrl: "https://blocknative.nex-t1.ai",
      maxRetries: 0,
      requestTimeoutMs: 100,
    });

    await expect(client.invokeRaw("get_supported_chains", {})).rejects.toThrow(
      /failed with status 502/i,
    );
    expect(lookupGasPriceMock).not.toHaveBeenCalled();
  });
});
